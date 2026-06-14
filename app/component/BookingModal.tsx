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

'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { X, Calendar, DollarSign, Clock, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Vehicle } from "@/app/lib/types";
import AuthModal from "./AuthModal";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null; // the chosen vehicle, or null if none picked yet
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
  const { data: session } = useSession(); // who's logged in (or null)
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false); // true once booking confirmed

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
  // ------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle._id,
          startDate,
          endDate,
          totalAmount: total,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // The server may reject for reasons like double-booking; show its message.
        throw new Error(data.message || "Failed to book vehicle");
      }

      setSuccess(true); // switch to the "RIDE CONFIRMED" screen
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------------
  // After a successful booking, replace the form with a confirmation screen.
  // ------------------------------------------------------------------------
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 10 }} // a little bouncy pop-in
          className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
        >
          <CheckCircle size={36} />
        </motion.div>
        <h3 className="mt-6 text-2xl font-black tracking-wider text-white">RIDE CONFIRMED</h3>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
          Your booking for the{" "}
          <span className="font-semibold text-white">
            {vehicle.brand} {vehicle.model}
          </span>{" "}
          has been confirmed.
        </p>
        <div className="mt-8 flex gap-4">
          <button
            onClick={onClose}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:scale-105"
          >
            Close
          </button>
          <Link
            href="/bookings"
            className="rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            My Bookings
          </Link>
        </div>
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
            ${vehicle.pricePerDay}{" "}
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
              onChange={(e) => setStartDate(e.target.value)}
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
              <DollarSign size={13} /> Daily Rate
            </span>
            <span className="font-semibold text-white">${vehicle.pricePerDay}</span>
          </div>
          <div className="my-1 h-px bg-white/5" />
          <div className="flex justify-between text-sm">
            <span className="font-bold text-zinc-200">Total Price</span>
            <span className="text-lg font-black text-white">${total}</span>
          </div>
        </div>
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
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : !session ? (
            "Login to Book"
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

            {/* The popup box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 shadow-2xl backdrop-blur-xl"
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
