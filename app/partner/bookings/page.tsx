// ===========================================================================
// partner/bookings/page.tsx — "/partner/bookings": bookings on MY vehicles
// ===========================================================================
//
// Folder "partner/bookings" -> web address "/partner/bookings". A partner (a
// user who has listed a vehicle) sees every booking customers have made on their
// vehicles, and can open a live chat with each customer.
//
// Like the other dashboards it shows three states: loading, not-logged-in, and
// logged-in (the list). It reuses the same Nav / Footer / AuthModal / BookingChat
// pieces as the rest of the app for a consistent feel.
// ===========================================================================

'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Nav from "@/app/component/Nav";
import Footer from "@/app/component/Footer";
import AuthModal from "@/app/component/AuthModal";
import BookingChat from "@/app/component/BookingChat";
import VideoCall from "@/app/component/VideoCall";
import { Loader2, AlertCircle, CalendarCheck, MessageSquare, ArrowLeft, CheckCircle2, XCircle, Video, Navigation, Hourglass, Ban, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// The booking lifecycle, mirrored from the server. A request starts at
// "requested" and the partner moves it to "accepted" or "rejected".
type PartnerStatus =
  | "requested"
  | "accepted"
  | "rejected"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "ongoing"
  | "completed";

// The shape of a booking as /api/partner/bookings returns it (vehicle + customer
// are "populated" into small objects, or null if a linked record was removed).
interface PartnerBooking {
  _id: string;
  vehicleId: { _id: string; brand: string; model: string; image: string; type: string } | null;
  userId: { _id: string; name: string; email: string } | null;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: PartnerStatus;
  decisionNote?: string; // the reason the partner gave when rejecting
  paid?: boolean;
  createdAt: string;
}

// Friendly date like "Jun 21, 2026".
function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function PartnerBookingsPage() {
  const { data: session, status } = useSession();

  const [bookings, setBookings] = useState<PartnerBooking[]>([]);
  const [loadedForSession, setLoadedForSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [chat, setChat] = useState<{ id: string; title: string } | null>(null);
  const [call, setCall] = useState<{ id: string; title: string } | null>(null);
  const [actingId, setActingId] = useState<string | null>(null); // which request is mid accept/reject

  // Load the partner's incoming bookings once they're logged in.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/partner/bookings");
        if (!res.ok) throw new Error("Failed to load your bookings");
        const data = await res.json();
        if (!cancelled) setBookings(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load bookings");
      } finally {
        if (!cancelled) setLoadedForSession(true);
      }
    })();
    return () => { cancelled = true; };
  }, [status]);

  // Re-fetch the list after a change (e.g. just after accepting a request) so the
  // row's status/buttons update to match what's now on the server.
  const refresh = async () => {
    try {
      const res = await fetch("/api/partner/bookings");
      if (!res.ok) throw new Error("Failed to load your bookings");
      setBookings(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    }
  };

  // Accept or reject a customer's rental REQUEST. We PATCH the shared booking
  // route, which checks the caller really owns the vehicle before changing it.
  // On a rejection we ask for an optional reason and pass it along as `note` so
  // the customer sees WHY on their My Bookings page.
  //   - Inputs: the booking id, and the decision ("accepted" | "rejected").
  //   - Output: none (updates the server, then refreshes the list).
  const decide = async (id: string, decision: "accepted" | "rejected") => {
    // For a rejection, offer a quick reason box (blank/cancel = no reason given).
    let note: string | undefined;
    if (decision === "rejected") {
      const reason = window.prompt("Reason for declining (optional — the customer will see this):");
      // prompt() returns null if they hit Cancel; treat that as "no reason".
      note = reason ? reason : undefined;
    }

    setActingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update the request");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActingId(null);
    }
  };

  const isLoading = status === "loading" || (status === "authenticated" && !loadedForSession);

  // STATE 1: loading.
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
        <div className="mx-auto max-w-5xl space-y-10">
          {/* Header with a link back to the partner dashboard. */}
          <div className="space-y-3">
            <Link href="/partner" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-white">
              <ArrowLeft size={14} /> Back to partner dashboard
            </Link>
            <span className="block text-xs uppercase tracking-[0.5em] text-zinc-500">Partner</span>
            <h1 className="flex items-center gap-3 text-4xl font-black tracking-wide">
              <CalendarCheck className="text-zinc-400" /> BOOKINGS ON MY VEHICLES
            </h1>
          </div>

          {/* STATE 2: not logged in. */}
          {status === "unauthenticated" ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-zinc-900/15 py-24 text-center backdrop-blur-md">
              <CalendarCheck size={48} className="mb-6 text-zinc-600" />
              <h2 className="text-2xl font-black tracking-wide">Sign In Required</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
                Log in to see bookings made on the vehicles you’ve listed.
              </p>
              <button
                onClick={() => setAuthOpen(true)}
                className="mt-8 cursor-pointer rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition hover:scale-105 active:scale-95"
              >
                Log In
              </button>
            </div>
          ) : (
            // STATE 3: logged in.
            <div className="space-y-6">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {bookings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-900/5 py-24 text-center">
                  <CalendarCheck size={36} className="mx-auto mb-4 text-zinc-600" />
                  <p className="text-sm font-medium text-zinc-400">No one has booked your vehicles yet.</p>
                  <Link
                    href="/partner"
                    className="mt-6 inline-block rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"
                  >
                    Manage my vehicles
                  </Link>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {bookings.map((b) => (
                    <motion.div
                      key={b._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-zinc-950/60 p-6 md:flex-row"
                    >
                      <div className="h-32 w-full shrink-0 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 md:w-48">
                        {b.vehicleId ? (
                          <img src={b.vehicleId.image} alt={`${b.vehicleId.brand} ${b.vehicleId.model}`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-600">No Vehicle</div>
                        )}
                      </div>

                      <div className="w-full flex-1 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-lg font-bold">
                            {b.vehicleId ? `${b.vehicleId.brand} ${b.vehicleId.model}` : "Unknown Vehicle"}
                          </h3>
                          {b.status === "requested" ? (
                            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
                              <Hourglass size={12} /> Awaiting your decision
                            </span>
                          ) : b.status === "accepted" ? (
                            <span className="flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400">
                              <Check size={12} /> Accepted — awaiting payment
                            </span>
                          ) : b.status === "rejected" ? (
                            <span className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400">
                              <Ban size={12} /> Declined
                            </span>
                          ) : b.status === "cancelled" ? (
                            <span className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400">
                              <XCircle size={12} /> Cancelled
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                              <CheckCircle2 size={12} /> {b.status}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3 text-xs text-zinc-400 sm:grid-cols-3">
                          <div>
                            <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Customer</span>
                            <span className="block font-semibold text-zinc-200">{b.userId?.name ?? "—"}</span>
                            {b.userId?.email && (
                              <span className="block truncate text-[11px] text-zinc-500">{b.userId.email}</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Dates</span>
                            <span className="font-semibold text-zinc-200">{fmt(b.startDate)} – {fmt(b.endDate)}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Amount</span>
                            <span className="font-semibold text-zinc-200">₹{b.totalAmount}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full shrink-0 md:w-44">
                        {/* For a pending REQUEST, the partner's main job is to
                            accept or reject it. These appear only while it's
                            still "requested"; once decided they disappear. */}
                        {b.status === "requested" && (
                          <div className="mb-3 flex gap-2">
                            <button
                              onClick={() => decide(b._id, "accepted")}
                              disabled={actingId === b._id}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-black transition hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
                            >
                              {actingId === b._id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              Accept
                            </button>
                            <button
                              onClick={() => decide(b._id, "rejected")}
                              disabled={actingId === b._id}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs font-bold text-red-400 transition hover:bg-red-500/10 active:scale-95 disabled:opacity-50"
                            >
                              <Ban size={14} /> Reject
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() =>
                            setChat({
                              id: b._id,
                              title: b.vehicleId ? `${b.vehicleId.brand} ${b.vehicleId.model}` : "Booking",
                            })
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-zinc-200 transition hover:bg-white/10 active:scale-95"
                        >
                          <MessageSquare size={14} /> Message customer
                        </button>
                        <button
                          onClick={() =>
                            setCall({
                              id: b._id,
                              title: b.vehicleId ? `${b.vehicleId.brand} ${b.vehicleId.model}` : "Booking",
                            })
                          }
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-zinc-200 transition hover:bg-white/10 active:scale-95"
                        >
                          <Video size={14} /> Video call
                        </button>
                        <Link
                          href={`/trip/${b._id}`}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-zinc-200 transition hover:bg-white/10 active:scale-95"
                        >
                          <Navigation size={14} /> Track trip
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          )}
        </div>
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="login" />
      {chat && <BookingChat bookingId={chat.id} title={chat.title} onClose={() => setChat(null)} />}
      {call && <VideoCall bookingId={call.id} title={call.title} onClose={() => setCall(null)} />}
      <Footer />
    </>
  );
}
