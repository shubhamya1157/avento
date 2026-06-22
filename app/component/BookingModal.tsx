// ===========================================================================
// BookingModal.tsx — The "book this vehicle" popup
// ===========================================================================
//
// When a user clicks "Book This Ride", this popup opens. It lets them pick a
// pick-up and return date, shows the live price total, and submits the booking.
//
// IMPORTANT RULE: you must be logged in to book. If a logged-out user tries, we
// don't book — instead we open the login popup. After logging in, they can try
// again.
//
// Two components below:
//   - BookingForm:   the form, the price math, and the submit logic.
//   - BookingModal:  the backdrop/open-close wrapper (plus the login fallback).
// ===========================================================================

// "use client" means this file runs in the visitor's browser, which it must,
// because it responds to date picking, clicks, and form submission.
'use client';

// `useMemo` and `useState` are React "hooks" — special helper functions (their
// names start with "use") that a component can call. `useState` remembers a
// value between redraws; `useMemo` remembers the RESULT of a calculation so it
// isn't redone needlessly. More on each where they're used below.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { X, Calendar, IndianRupee, Clock, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Vehicle } from "@/app/lib/types";
import AuthModal from "./AuthModal";
// Shared Razorpay browser helpers (also used by the /ride wizard) so the two
// checkouts never drift apart.
import { razorpayEnabled, loadRazorpayScript } from "@/app/lib/razorpay-client";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null; // the chosen vehicle, or null if none picked yet
}

// The bits of the saved booking we keep for the confirmation screen. These come
// STRAIGHT FROM THE SERVER's reply, so `totalAmount` is the price it actually
// charged/recorded and `paid` reflects whether real money changed hands.
interface ConfirmedBooking {
  _id: string;
  totalAmount: number;
  paid: boolean;
}

// ---------------------------------------------------------------------------
// Work out sensible default dates so the form isn't empty: pick-up tomorrow,
// return three days from now. We return them as "YYYY-MM-DD" text because
// that's the format an <input type="date"> expects.
//   toISOString() gives "2026-06-16T09:00:00.000Z"; split("T")[0] keeps just
//   the date part before the "T".
// ---------------------------------------------------------------------------
function getDefaultDates() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 3);

  return {
    startDate: tomorrow.toISOString().split("T")[0],
    endDate: dayAfter.toISOString().split("T")[0],
  };
}

// ---------------------------------------------------------------------------
// The form itself. It's a separate component (with key={vehicle._id} below) so
// switching to a different vehicle resets the dates and any previous result.
// ---------------------------------------------------------------------------
function BookingForm({
  vehicle,
  onClose,
  onLoginRequired,
}: {
  vehicle: Vehicle;
  onClose: () => void;
  onLoginRequired: () => void; // called when a logged-out user tries to book
}) {
  // `useSession` is NextAuth's hook that tells us about the logged-in user.
  // `session` is their info if logged in, or null if logged out.
  const { data: session } = useSession(); // who's logged in (or null)
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Once the server confirms the booking we keep what it sent back (its id, the
  // authoritative amount it computed, and whether it was paid) so the success
  // screen shows the REAL figures rather than anything the browser guessed.
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);

  // When the pick-up date changes, keep the return date valid: if it now lands
  // on or before pick-up, push it to the day after. This stops the price/CTA
  // silently disappearing when someone moves the start past the end.
  const handleStartChange = (value: string) => {
    setStartDate(value);
    if (value && endDate && endDate <= value) {
      const next = new Date(value);
      next.setDate(next.getDate() + 1);
      setEndDate(next.toISOString().split("T")[0]);
    }
  };

  // useMemo RE-CALCULATES the number of days and the total price, but ONLY when
  // the dates or the per-day price change (the list in the [] at the end). This
  // avoids redoing the math on every single re-render.
  const { days, total } = useMemo(() => {
    if (!startDate || !endDate) return { days: 0, total: 0 };

    const start = new Date(startDate);
    const end = new Date(endDate);
    // Difference in milliseconds, converted to whole days. The chain
    // /(1000*60*60*24) turns ms -> seconds -> minutes -> hours -> days.
    // Math.ceil rounds up so a partial day still counts as a full rental day.
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (end <= start) return { days: 0, total: 0 }; // invalid range -> no price
    return { days: diffDays, total: diffDays * vehicle.pricePerDay };
  }, [startDate, endDate, vehicle.pricePerDay]);

  // The earliest date allowed in the date pickers = today.
  const minDate = new Date().toISOString().split("T")[0];

  // ------------------------------------------------------------------------
  // Submit handler: validate, then POST the booking to our API.
  //
  // `async` lets this function pause for slow work without freezing the page;
  // `await` is that pause, waiting for the server's reply (a "promise", i.e. a
  // result that isn't ready yet) before continuing. `fetch` is how the browser
  // sends a request to a web address. "POST" means "here is some data to save".
  // ------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    // A form submit normally reloads the page; preventDefault() stops that so
    // our own code can handle the booking instead.
    e.preventDefault();

    // Not logged in? Don't book — trigger the login popup instead.
    if (!session) {
      onLoginRequired();
      return;
    }

    if (days <= 0) {
      setError("End date must be after start date");
      return;
    }

    setError(null);
    setLoading(true);

    // The booking details are identical no matter how we pay, so build them once.
    // We deliberately DON'T send a price — the server computes it from the dates
    // and the vehicle (see app/lib/rental-price.ts), so it can't be tampered with.
    const bookingDetails = {
      vehicleId: vehicle._id,
      startDate,
      endDate,
    };

    try {
      if (razorpayEnabled) {
        // --- Real payment path: hand off to Razorpay's checkout popup. ---
        // We intentionally leave `loading` ON here: the popup is now open and its
        // own callbacks (handler / ondismiss, below) reset it, which also keeps
        // the Confirm button disabled so it can't be double-submitted.
        await payWithRazorpay(bookingDetails);
      } else {
        // --- Demo path: no payment configured, just create the booking. ---
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingDetails),
        });
        const data = await res.json();
        if (!res.ok) {
          // The server may reject for reasons like double-booking; show its message.
          throw new Error(data.message || "Failed to book vehicle");
        }
        // Show the confirmation using the server's own figures.
        setConfirmed({ _id: data._id, totalAmount: data.totalAmount, paid: Boolean(data.paid) });
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------------
  // payWithRazorpay: the real-payment flow (only used when Razorpay is enabled).
  //   1. Ask our server to create an order (/api/payment/order).
  //   2. Make sure Razorpay's checkout script is loaded.
  //   3. Open the checkout popup. When the customer finishes paying, Razorpay
  //      calls our `handler`, which sends the result to /api/payment/verify; if
  //      the server confirms it, we show the "RIDE CONFIRMED" screen.
  // ------------------------------------------------------------------------
  const payWithRazorpay = async (bookingDetails: {
    vehicleId: string;
    startDate: string;
    endDate: string;
  }) => {
    // Step 1 — create the order on our server. We send the rental (vehicle +
    // dates), NOT a price: the server prices it itself so the charge is trusted.
    const orderRes = await fetch("/api/payment/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingDetails),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      throw new Error(orderData.message || "Could not start payment");
    }

    // Step 2 — load Razorpay's checkout script (no-op if already loaded).
    const ready = await loadRazorpayScript();
    if (!ready || !window.Razorpay) {
      throw new Error("Could not load the payment gateway. Check your connection.");
    }

    // Step 3 — open the checkout popup.
    const razorpay = new window.Razorpay({
      key: orderData.keyId,        // public key id (safe to expose)
      amount: orderData.amount,    // in paise, echoed back from our order
      currency: orderData.currency,
      order_id: orderData.orderId,
      name: "Avento",
      description: `${vehicle.brand} ${vehicle.model} rental`,
      image: vehicle.image,
      // Pre-fill the customer's details so they don't retype them.
      prefill: {
        name: session?.user?.name || "",
        email: session?.user?.email || "",
      },
      theme: { color: "#ffffff" },
      // Called by Razorpay AFTER a successful payment. We verify it server-side.
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Send Razorpay's signed result PLUS the booking details so the
            // server can verify the payment and create the booking in one step.
            body: JSON.stringify({ ...response, ...bookingDetails }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            throw new Error(verifyData.message || "Payment could not be verified");
          }
          // Verified + booked -> show the confirmation with the server's figures.
          setConfirmed({ _id: verifyData._id, totalAmount: verifyData.totalAmount, paid: Boolean(verifyData.paid) });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Payment verification failed.");
        } finally {
          setLoading(false); // re-enable the form whatever the outcome
        }
      },
      modal: {
        // If the customer closes the popup without paying, gently re-enable the
        // form and explain — rather than leaving the button stuck "loading".
        ondismiss: () => {
          setLoading(false);
          setError("Payment cancelled — you can try again whenever you're ready.");
        },
      },
    });
    razorpay.open();
  };

  // ------------------------------------------------------------------------
  // After a successful booking, replace the form with a confirmation screen.
  // ------------------------------------------------------------------------
  if (confirmed) {
    // A tidy "Mon DD, YYYY" date for the summary (e.g. "Jun 24, 2026").
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    return (
      <div className="flex flex-col items-center px-8 py-12 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 10 }} // a little bouncy pop-in
          className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
        >
          <CheckCircle size={36} />
        </motion.div>
        <h3 className="mt-6 text-2xl font-black tracking-wider text-white">BOOKING CONFIRMED</h3>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
          Your{" "}
          <span className="font-semibold text-white">
            {vehicle.brand} {vehicle.model}
          </span>{" "}
          is reserved. The details are below and in My Bookings.
        </p>

        {/* Booking summary — dates, duration, and the amount the SERVER recorded. */}
        <div className="mt-7 w-full space-y-3 rounded-2xl border border-white/10 bg-zinc-900/50 p-5 text-left text-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1.5"><Calendar size={13} /> Pick-up</span>
            <span className="font-semibold text-white">{fmt(startDate)}</span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1.5"><Calendar size={13} /> Return</span>
            <span className="font-semibold text-white">{fmt(endDate)}</span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1.5"><Clock size={13} /> Duration</span>
            <span className="font-semibold text-white">{days} {days === 1 ? "day" : "days"}</span>
          </div>
          <div className="my-1 h-px bg-white/5" />
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-200">
              {confirmed.paid ? "Paid" : "Total"}
            </span>
            <span className="text-lg font-black text-white">₹{confirmed.totalAmount}</span>
          </div>
          {!confirmed.paid && (
            <p className="text-[11px] text-zinc-500">Reserved in demo mode — no payment was taken.</p>
          )}
        </div>

        <div className="mt-7 flex w-full gap-3">
          <button
            onClick={onClose}
            className="w-1/3 rounded-full border border-white/20 bg-white/5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Close
          </button>
          <Link
            href="/bookings"
            className="w-2/3 rounded-full bg-white py-2.5 text-center text-sm font-semibold text-black transition hover:scale-[1.02]"
          >
            My Bookings
          </Link>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // Partners and admins are staff/owners, not renters — they can't book. The
  // server enforces this too (requireCustomer), but we show a clear panel here
  // instead of a form they'd only get a 403 from.
  // ------------------------------------------------------------------------
  const role = session?.user?.role;
  if (role === "partner" || role === "admin") {
    return (
      <div className="flex flex-col items-center px-8 py-14 text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 text-zinc-400 transition hover:text-white"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5 text-zinc-300">
          <AlertCircle size={26} />
        </div>
        <h3 className="mt-5 text-xl font-black tracking-wide text-white">Booking isn&apos;t available</h3>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
          {role === "partner"
            ? "Partner accounts list and manage vehicles — they can't rent or ride. Use a personal account to book."
            : "Admin accounts manage the platform and can't place bookings."}
        </p>
        <button
          onClick={onClose}
          className="mt-7 rounded-full bg-white px-7 py-2.5 text-sm font-semibold text-black transition hover:scale-105"
        >
          Got it
        </button>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // The normal booking form.
  // ------------------------------------------------------------------------
  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-8">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-6 top-6 text-zinc-400 transition hover:text-white"
        aria-label="Close"
      >
        <X size={20} />
      </button>

      <div>
        <span className="text-xs uppercase tracking-widest text-zinc-500">Luxury Rental</span>
        <h3 className="mt-1 text-2xl font-black tracking-wide text-white">
          Book {vehicle.brand} {vehicle.model}
        </h3>
      </div>

      {/* A small summary card of the chosen vehicle */}
      <div className="flex gap-4 rounded-2xl border border-white/5 bg-white/5 p-4">
        <img
          src={vehicle.image}
          alt={`${vehicle.brand} ${vehicle.model}`}
          className="h-20 w-32 rounded-lg object-cover"
        />
        <div className="flex flex-col justify-center">
          <h4 className="text-sm font-bold text-white">
            {vehicle.brand} {vehicle.model}
          </h4>
          <p className="mt-1 text-xs capitalize text-zinc-400">
            {vehicle.type} • {vehicle.transmission} • {vehicle.fuel}
          </p>
          <p className="mt-2 text-sm font-bold text-zinc-200">
            ₹{vehicle.pricePerDay}{" "}
            <span className="text-xs font-normal text-zinc-400">/ day</span>
          </p>
        </div>
      </div>

      {/* Error message box (only shown when there's an error) */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* The two date pickers, side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Pick-Up Date</label>
          <div className="relative">
            <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartChange(e.target.value)}
              min={minDate} // can't pick a past date
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-xs text-white outline-none focus:border-white/30"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Return Date</label>
          <div className="relative">
            <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              // The return date can't be before the pick-up date.
              min={startDate || minDate}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-xs text-white outline-none focus:border-white/30"
            />
          </div>
        </div>
      </div>

      {/* The live price breakdown — only appears once a valid range is chosen */}
      {days > 0 && (
        <div className="space-y-3 rounded-2xl border border-white/5 bg-zinc-900/50 p-5">
          <div className="flex justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Clock size={13} /> Rental Duration
            </span>
            <span className="font-semibold text-white">
              {days} {days === 1 ? "day" : "days"}
            </span>
          </div>
          <div className="flex justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <IndianRupee size={13} /> Daily Rate
            </span>
            <span className="font-semibold text-white">₹{vehicle.pricePerDay}</span>
          </div>
          <div className="my-1 h-px bg-white/5" />
          <div className="flex justify-between text-sm">
            <span className="font-bold text-zinc-200">Total Price</span>
            <span className="text-lg font-black text-white">₹{total}</span>
          </div>
        </div>
      )}

      {/* If the range is invalid, explain why the button below is disabled. */}
      {days <= 0 && (
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <AlertCircle size={14} className="shrink-0" />
          Pick a return date after your pick-up date to see the price.
        </p>
      )}

      {/* Cancel and Confirm buttons. The confirm button's label changes based on
          whether the user is logged in and whether a request is in progress. */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onClose}
          className="w-1/3 rounded-xl border border-white/10 py-3.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || days <= 0}
          className="flex w-2/3 items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-black transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
        >
          {/* A chained "ternary" (condition ? A : B, a short if/else): show a
              spinner while loading, else "Login to Book" if logged out, else
              the normal "Confirm Reservation" label. */}
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : !session ? (
            "Login to Book"
          ) : razorpayEnabled ? (
            `Pay ₹${total} & Book`
          ) : (
            "Confirm Reservation"
          )}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// The wrapper: handles the backdrop, the open/close animation, and the login
// fallback. If no vehicle is selected, it renders nothing at all.
// ---------------------------------------------------------------------------
export default function BookingModal({ open, onClose, vehicle }: BookingModalProps) {
  // When a logged-out user tries to book, we hide the booking popup and show
  // the login popup instead. This state tracks that switch.
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // A handle on the popup box so we can move keyboard focus into it on open.
  const panelRef = useRef<HTMLDivElement>(null);

  // The booking dialog is actually on screen only when it's open, a vehicle is
  // chosen, and we're not currently showing the login prompt over it.
  const dialogOpen = open && !showLoginPrompt && Boolean(vehicle);

  // While the dialog is open: close on Escape, lock the page behind it so it
  // doesn't scroll, and move focus into the panel (accessibility). Everything is
  // undone on close via the cleanup function. This effect must run on every
  // render (hooks can't sit below an early return), so it guards on dialogOpen.
  useEffect(() => {
    if (!dialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [dialogOpen, onClose]);

  if (!vehicle) return null; // nothing to book -> draw nothing

  return (
    <>
      <AnimatePresence>
        {/* Show the booking popup only when open AND we're not currently
            showing the login prompt. */}
        {open && !showLoginPrompt && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Click-to-close backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* The popup box. role/aria-modal mark it as a dialog for assistive
                tech; tabIndex makes it focusable so we can move focus into it;
                max-h + overflow-y-auto keep it usable on short screens. */}
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={`Book ${vehicle.brand} ${vehicle.model}`}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950/90 shadow-2xl outline-none backdrop-blur-xl"
            >
              {/* key={vehicle._id} resets the form when a different vehicle is
                  chosen, so dates/price/result don't carry over. */}
              <BookingForm
                key={vehicle._id}
                vehicle={vehicle}
                onClose={onClose}
                onLoginRequired={() => setShowLoginPrompt(true)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* The login popup, shown only when a logged-out user tried to book. */}
      <AuthModal
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        initialMode="login"
      />
    </>
  );
}
