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
  vehicle: Vehicle | null;
}

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

function BookingForm({
  vehicle,
  onClose,
  onLoginRequired,
}: {
  vehicle: Vehicle;
  onClose: () => void;
  onLoginRequired: () => void;
}) {
  const { data: session } = useSession();
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { days, total } = useMemo(() => {
    if (!startDate || !endDate) return { days: 0, total: 0 };

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (end <= start) return { days: 0, total: 0 };
    return { days: diffDays, total: diffDays * vehicle.pricePerDay };
  }, [startDate, endDate, vehicle.pricePerDay]);

  const minDate = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        throw new Error(data.message || "Failed to book vehicle");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 10 }}
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

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Pick-Up Date</label>
          <div className="relative">
            <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={minDate}
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
              min={startDate || minDate}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-xs text-white outline-none focus:border-white/30"
            />
          </div>
        </div>
      </div>

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

export default function BookingModal({ open, onClose, vehicle }: BookingModalProps) {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  if (!vehicle) return null;

  return (
    <>
      <AnimatePresence>
        {open && !showLoginPrompt && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 shadow-2xl backdrop-blur-xl"
            >
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

      <AuthModal
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        initialMode="login"
      />
    </>
  );
}
