// ===========================================================================
// bookings/page.tsx — The "/bookings" page: the logged-in user's reservations
// ===========================================================================
//
// This page has three possible states it shows the user:
//   1. Loading       — while we check the session / fetch data.
//   2. Not logged in — a "Sign In Required" prompt with a login button.
//   3. Logged in     — the list of their bookings, each cancellable.
//
// `useSession()` gives us `status`, which is one of "loading", "authenticated",
// or "unauthenticated". We branch on it to decide what to render.
// ===========================================================================

'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Nav from "@/app/component/Nav";
import Footer from "@/app/component/Footer";
import AuthModal from "@/app/component/AuthModal";
import type { Booking } from "@/app/lib/types";
import { Calendar, Clock, AlertCircle, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Helper: turn a stored date string into a friendly label like "Jun 16, 2026".
// toLocaleDateString formats a date according to the given options.
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Helper: count how many days a booking spans (used to show "3 days"). Same
// millisecond-to-days math as in the booking form, rounded up.
function getDaysCount(start: string, end: string) {
  const diff = Math.abs(new Date(end).getTime() - new Date(start).getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function BookingsPage() {
  // `status` tells us the login state; `session` holds the user's info.
  const { data: session, status } = useSession();

  // The user's bookings, plus flags for our different UI states.
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadedForSession, setLoadedForSession] = useState(false); // first fetch done?
  const [cancellingId, setCancellingId] = useState<string | null>(null); // which booking is mid-cancel
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false); // login popup open?

  // Fetch the user's bookings once they're logged in. This effect re-runs
  // whenever `status` changes (see the [status] at the end).
  useEffect(() => {
    if (status !== "authenticated") return; // only fetch when logged in

    // `cancelled` guards against a subtle bug: if the user navigates away while
    // the fetch is still in flight, we must NOT call setState afterward (React
    // would warn). The cleanup function at the bottom flips this to true.
    let cancelled = false;

    // An immediately-invoked async function so we can use await inside useEffect.
    (async () => {
      try {
        const res = await fetch("/api/bookings");
        if (!res.ok) throw new Error("Failed to load booking details");
        const data = await res.json();
        if (!cancelled) setBookings(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load bookings");
        }
      } finally {
        if (!cancelled) setLoadedForSession(true);
      }
    })();

    // Cleanup: runs if the component unmounts or the effect re-runs. It marks
    // the in-flight request as stale so its result is ignored.
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Re-fetch the bookings after a change (e.g. right after a cancellation) so
  // the list reflects the latest data.
  const refreshBookings = async () => {
    try {
      const res = await fetch("/api/bookings");
      if (!res.ok) throw new Error("Failed to load booking details");
      setBookings(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    }
  };

  // Cancel one booking. We first ask for confirmation, then PATCH the API, then
  // refresh the list. `cancellingId` lets us show a spinner on just that row.
  const handleCancelBooking = async (bookingId: string) => {
    // confirm() shows a built-in browser yes/no dialog; false = user clicked No.
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    setCancellingId(bookingId);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH", // PATCH = partially update an existing booking
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel booking");

      refreshBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while cancelling");
    } finally {
      setCancellingId(null);
    }
  };

  // We're "loading" while the session is still being checked, OR while logged in
  // but the first bookings fetch hasn't finished yet.
  const isLoading = status === "loading" || (status === "authenticated" && !loadedForSession);

  // STATE 1: still loading — show a centered spinner and nothing else.
  if (isLoading) {
    return (
      <>
        <Nav />
        <div className="flex min-h-screen w-full items-center justify-center bg-black">
          <Loader2 size={36} className="animate-spin text-zinc-500" />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-black px-6 pb-20 pt-32 text-white md:px-12 lg:px-24">
        <div className="mx-auto max-w-5xl">
          {/* STATE 2: not logged in — show a sign-in prompt instead of bookings. */}
          {status === "unauthenticated" ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-zinc-900/15 py-24 text-center backdrop-blur-md">
              <Calendar size={48} className="mb-6 text-zinc-600" />
              <h2 className="text-2xl font-black tracking-wide text-white">Sign In Required</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
                Log in to view your booking history and manage active reservations.
              </p>
              <button
                onClick={() => setAuthOpen(true)}
                className="mt-8 cursor-pointer rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition hover:scale-105 active:scale-95"
              >
                Log In
              </button>
            </div>
          ) : (
            // STATE 3: logged in — header, optional error, then the bookings.
            <div className="space-y-12">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.5em] text-zinc-500">Dashboard</span>
                  <h1 className="text-4xl font-black tracking-wide">MY BOOKINGS</h1>
                </div>
                <div className="rounded-full border border-white/10 bg-zinc-900/60 px-4 py-2 text-xs font-semibold text-zinc-400">
                  Logged in as: <span className="text-white">{session?.user?.email}</span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* No bookings yet -> a prompt to browse the fleet. Otherwise,
                  loop over the bookings and render a card for each one. */}
              {bookings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-900/5 py-24 text-center">
                  <Calendar size={36} className="mx-auto mb-4 text-zinc-600" />
                  <p className="text-sm font-medium text-zinc-400">You have no bookings yet.</p>
                  <Link
                    href="/vehicles"
                    className="mt-6 inline-block rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"
                  >
                    Browse Our Fleet
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {bookings.map((booking) => {
                      // Pre-compute a few values used in this card's markup.
                      const days = getDaysCount(booking.startDate, booking.endDate);
                      const isCancelled = booking.status === "cancelled";
                      const vehicle = booking.vehicleId; // may be null (see types)

                      return (
                        <motion.div
                          key={booking._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="flex flex-col items-center gap-6 overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/60 p-6 md:flex-row"
                        >
                          <div className="h-36 w-full shrink-0 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 md:w-56">
                            {vehicle ? (
                              <img
                                src={vehicle.image}
                                alt={`${vehicle.brand} ${vehicle.model}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-zinc-600">
                                No Vehicle Data
                              </div>
                            )}
                          </div>

                          <div className="w-full flex-1 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                  Reservation
                                </span>
                                <h3 className="mt-0.5 text-xl font-bold text-white">
                                  {vehicle ? `${vehicle.brand} ${vehicle.model}` : "Unknown Vehicle"}
                                </h3>
                              </div>

                              {isCancelled ? (
                                <span className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400">
                                  <XCircle size={12} /> Cancelled
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                                  <CheckCircle2 size={12} /> Confirmed
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-xs text-zinc-400 sm:grid-cols-4">
                              <div className="space-y-1">
                                <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Dates</span>
                                <span className="font-semibold text-zinc-200">
                                  {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Duration</span>
                                <span className="flex items-center gap-1 font-semibold text-zinc-200">
                                  <Clock size={12} /> {days} {days === 1 ? "day" : "days"}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Cost</span>
                                <span className="font-semibold text-zinc-200">${booking.totalAmount}</span>
                              </div>
                              <div className="space-y-1">
                                <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Booked On</span>
                                <span className="font-semibold text-zinc-200">{formatDate(booking.createdAt)}</span>
                              </div>
                            </div>
                          </div>

                          {!isCancelled && (
                            <div className="flex w-full shrink-0 justify-end md:w-auto">
                              <button
                                onClick={() => handleCancelBooking(booking._id)}
                                disabled={cancellingId === booking._id}
                                className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-3 text-xs font-bold text-red-400 transition hover:bg-red-500/10 active:scale-95 disabled:opacity-50"
                              >
                                {cancellingId === booking._id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                                Cancel Ride
                              </button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="login" />
      <Footer />
    </>
  );
}
