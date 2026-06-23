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
import { X, Calendar, IndianRupee, Clock, AlertCircle, CheckCircle, Loader2, User, Phone, IdCard, MapPin, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Vehicle } from "@/app/lib/types";
import AuthModal from "./AuthModal";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null; // the chosen vehicle, or null if none picked yet
}

// The bits of the saved REQUEST we keep for the confirmation screen. These come
// STRAIGHT FROM THE SERVER's reply, so `totalAmount` is the price it computed
// (what the customer will pay once the owner accepts). A fresh request is always
// status "requested" — no money has changed hands yet.
interface RequestedBooking {
  _id: string;
  totalAmount: number;
  status: string;
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
// addDays — take a "YYYY-MM-DD" date and return the date `n` days later, again
// as "YYYY-MM-DD" text. We use this so the duration stepper / preset chips can
// move the RETURN date forward from the pick-up date.
// ---------------------------------------------------------------------------
function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// inr — format a number as Indian Rupees with the grouping Indians actually use
// (₹3,60,000, not ₹360,000). `toLocaleString("en-IN")` does the comma placement
// for us. We keep it as one tiny helper so every price on the popup reads the
// same way.
// ---------------------------------------------------------------------------
function inr(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

// The quick-pick duration chips shown under the stepper. Each one just sets the
// rental length to a common value so people don't have to tap "+" twenty times.
const DURATION_PRESETS = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "1 month", days: 30 },
];

// Sensible guard rails for the stepper: at least 1 day, at most ~3 months.
const MIN_DAYS = 1;
const MAX_DAYS = 90;

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
  // Renter KYC details. The name is pre-filled from the logged-in account (the
  // person can still edit it, e.g. if booking on someone else's behalf).
  const [fullName, setFullName] = useState(session?.user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Once the server saves the request we keep what it sent back (its id and the
  // authoritative amount it computed) so the success screen shows the REAL
  // figures rather than anything the browser guessed.
  const [requested, setRequested] = useState<RequestedBooking | null>(null);

  // When the pick-up date changes we KEEP the rental length the person already
  // chose and just slide the return date along with it. e.g. if they had a
  // 4-day rental and move pick-up forward a week, it stays a 4-day rental. We
  // read the current duration off the dates (falling back to 1 day if the range
  // was somehow invalid) and re-anchor the return date to the new pick-up.
  const handleStartChange = (value: string) => {
    if (!value) {
      setStartDate(value);
      return;
    }
    const currentDays = startDate && endDate
      ? Math.max(MIN_DAYS, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))
      : MIN_DAYS;
    setStartDate(value);
    setEndDate(addDays(value, currentDays));
  };

  // setDuration — the single way the stepper and preset chips change the rental
  // length. It clamps to our guard rails, then moves the RETURN date to exactly
  // that many days after the pick-up date. The day-count and price (the useMemo
  // below) recompute automatically from the new return date.
  const setDuration = (nextDays: number) => {
    const clamped = Math.min(MAX_DAYS, Math.max(MIN_DAYS, nextDays));
    setEndDate(addDays(startDate, clamped));
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
  // Submit handler: validate, then POST a rental REQUEST to our API.
  //
  // In the "ask first, pay after accept" flow we DON'T take payment here — we
  // just send the request. The owner accepts or rejects it, and the customer
  // pays from the My Bookings page once it's accepted.
  //
  // `async` lets this function pause for slow work without freezing the page;
  // `await` is that pause, waiting for the server's reply before continuing.
  // `fetch` is how the browser sends a request; "POST" means "save this".
  // ------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    // A form submit normally reloads the page; preventDefault() stops that so
    // our own code can handle the request instead.
    e.preventDefault();

    // Not logged in? Don't request — trigger the login popup instead.
    if (!session) {
      onLoginRequired();
      return;
    }

    if (days <= 0) {
      setError("End date must be after start date");
      return;
    }

    // Renter KYC is required — the owner needs to know who's driving, their licence, and address.
    if (!fullName.trim() || !phone.trim() || !licenseNumber.trim() || !address.trim()) {
      setError("Please fill in your name, phone, driving licence number, and address.");
      return;
    }

    setError(null);
    setLoading(true);

    // We deliberately DON'T send a price — the server computes it from the dates
    // and the vehicle (see app/lib/rental-price.ts), so it can't be tampered with.
    // The renter details ride along so the owner can review them before accepting.
    const requestDetails = {
      vehicleId: vehicle._id,
      startDate,
      endDate,
      renter: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        licenseNumber: licenseNumber.trim(),
        address: address.trim(),
      },
    };

    try {
      // POST /api/bookings now creates a REQUEST (status "requested", unpaid).
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestDetails),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send your request");
      }
      // Show the "request sent" screen using the server's own figures.
      setRequested({ _id: data._id, totalAmount: data.totalAmount, status: data.status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------------
  // After the request is sent, replace the form with a confirmation screen.
  // ------------------------------------------------------------------------
  if (requested) {
    // A tidy "Mon DD, YYYY" date for the summary (e.g. "Jun 24, 2026").
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    const isApproved = requested.status === "accepted";

    return (
      <div className="flex flex-col items-center px-8 py-12 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 10 }} // a little bouncy pop-in
          className={`flex h-16 w-16 items-center justify-center rounded-full border ${
            isApproved
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              : "border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          }`}
        >
          <CheckCircle size={36} />
        </motion.div>
        
        <h3 className="mt-6 text-2xl font-black tracking-wider text-white">
          {isApproved ? "REQUEST APPROVED" : "REQUEST SENT"}
        </h3>
        
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
          {isApproved ? (
            <>
              Your request for the{" "}
              <span className="font-semibold text-white">
                {vehicle.brand} {vehicle.model}
              </span>{" "}
              has been <span className="font-bold text-emerald-400">auto-approved</span>! Complete the payment under My Bookings to confirm and lock it in.
            </>
          ) : (
            <>
              Your request for the{" "}
              <span className="font-semibold text-white">
                {vehicle.brand} {vehicle.model}
              </span>{" "}
              has been sent to the owner. Once they accept it, you can pay from My Bookings to lock it in.
            </>
          )}
        </p>

        {/* Request summary — dates, duration, and the amount the SERVER computed */}
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
            <span className="font-bold text-zinc-200">Total to pay</span>
            <span className="text-lg font-black text-white">{inr(requested.totalAmount)}</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            {isApproved ? "Booking ready — proceed to My Bookings to complete the payment." : "Awaiting the owner's approval — no payment taken yet."}
          </p>
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
            className="w-2/3 rounded-full bg-white py-2.5 text-center text-sm font-bold text-black transition hover:scale-[1.02]"
          >
            {isApproved ? "Pay Now" : "My Bookings"}
          </Link>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // The normal booking form. (Everyone logged in can book on Avento — there's
  // no longer a partner/admin block here; the server just checks you're signed
  // in.)
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
            {inr(vehicle.pricePerDay)}{" "}
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

      {/* ---- Rental period -------------------------------------------------
          Pick-up date + "how many days" stepper + quick presets. The return
          date is computed from these but stays a real, editable picker too, so
          someone who wants an exact end date can still set it directly. */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Rental period</span>
          <span className="h-px flex-1 bg-white/5" />
        </div>

        {/* The two date pickers, side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Pick-Up Date</label>
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
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Return Date <span className="font-normal lowercase text-zinc-600">(auto)</span>
            </label>
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

        {/* The "how many days?" stepper. The − / + buttons nudge the rental
            length by a day; the big number in the middle shows the current
            duration. They all funnel through setDuration(), which re-anchors
            the return date. Buttons disable at the guard-rail limits. */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">How many days?</label>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-1.5">
            <button
              type="button"
              onClick={() => setDuration(days - 1)}
              disabled={days <= MIN_DAYS}
              aria-label="Fewer days"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Minus size={16} />
            </button>
            <span className="text-sm font-bold tabular-nums text-white">
              {days > 0 ? `${days} ${days === 1 ? "day" : "days"}` : "—"}
            </span>
            <button
              type="button"
              onClick={() => setDuration(days < MIN_DAYS ? MIN_DAYS : days + 1)}
              disabled={days >= MAX_DAYS}
              aria-label="More days"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Quick-pick chips for the most common rental lengths. The one that
              matches the current duration is highlighted. */}
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map((preset) => {
              const active = days === preset.days;
              return (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => setDuration(preset.days)}
                  className={`rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition ${
                    active
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Renter details (KYC). A professional rental needs to know who's driving
          and that they hold a licence, so we collect this before sending the
          request. The owner/admin reviews it before accepting. */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Your details</span>
          <span className="h-px flex-1 bg-white/5" />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Full name</label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="As printed on your licence"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-xs text-white placeholder-zinc-600 outline-none focus:border-white/30"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Phone</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="e.g. +91 98765 43210"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-white/30"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Licence no.</label>
            <div className="relative">
              <IdCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                required
                placeholder="Driving licence"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-white/30"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Address
          </label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Where you live"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-xs text-white placeholder-zinc-600 outline-none focus:border-white/30"
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
            <span className="font-semibold text-white">{inr(vehicle.pricePerDay)}</span>
          </div>
          <div className="my-1 h-px bg-white/5" />
          <div className="flex justify-between text-sm">
            <span className="font-bold text-zinc-200">Total Price</span>
            <span className="text-lg font-black text-white">{inr(total)}</span>
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
              the "Send Request" label. No money is taken here any more — we just
              send the owner a request; the customer pays later, once it's
              accepted, from the My Bookings page. */}
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : !session ? (
            "Login to Book"
          ) : (
            "Send Booking Request"
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
