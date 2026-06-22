// ===========================================================================
// admin/bookings/page.tsx — The "/admin/bookings" list (admins only)
// ===========================================================================
//
// Folder "admin/bookings" -> web address "/admin/bookings". The admin guard and
// the sidebar frame come from app/admin/layout.tsx, so this file only returns
// the content: a table of EVERY booking on the platform, with the option to
// cancel any one of them.
// ===========================================================================

'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, XCircle, CheckCircle2, Check, MessageSquare, Video, Navigation } from "lucide-react";
import BookingChat from "@/app/component/BookingChat";
import VideoCall from "@/app/component/VideoCall";
import AdminPageHeader from "@/app/component/AdminPageHeader";

// The shape of a booking as /api/admin/bookings returns it. The vehicle and
// user references are "populated" into small objects (or null if the linked
// record was removed), so we type them as optional/nullable.
interface AdminBooking {
  _id: string;
  // `source` tells us where the vehicle lives: "fleet" = the house fleet (the
  // admin answers its rental requests) vs "partner" = an owner answers their own.
  vehicleId: { _id: string; brand: string; model: string; type: string; source?: "fleet" | "partner" } | null;
  userId: { _id: string; name: string; email: string } | null;
  kind?: "rental" | "ride";   // absent on old records (treated as rental)
  startDate?: string;          // rentals only
  endDate?: string;            // rentals only
  pickup?: { address: string; lat: number; lng: number }; // rides only
  drop?: { address: string; lat: number; lng: number };   // rides only
  distanceKm?: number;         // rides only
  totalAmount: number;
  // The full booking lifecycle: a rental starts "requested" (awaiting an answer),
  // becomes "accepted"/"rejected", then a paid one is "confirmed".
  status: "requested" | "accepted" | "rejected" | "pending" | "confirmed" | "cancelled" | "ongoing" | "completed";
  decisionNote?: string;       // the reason given when a request was rejected
  // Renter KYC captured on the booking form (who's driving + their licence).
  renter?: { fullName: string; phone: string; licenseNumber: string; address?: string };
  driverId?: { _id: string; name: string; email: string } | null; // dispatched driver
  dispatchedAt?: string;       // when the ride was dispatched
  paid?: boolean;
  createdAt: string;
}

// An approved partner the admin can dispatch a ride to (from /api/admin/drivers).
interface Driver {
  _id: string;
  name: string;
  email: string;
}

// Monochrome chip per booking status. Brightness carries the meaning: live
// (accepted/confirmed/ongoing) bookings are brightest, a request awaiting an
// answer is a quiet outline, and a finished/cancelled/rejected one fades back.
const STATUS_CLS: Record<AdminBooking["status"], string> = {
  confirmed: "bg-white/10 text-white",
  accepted: "bg-white/10 text-white",
  ongoing: "bg-white/10 text-white",
  requested: "border border-white/15 text-zinc-300",
  pending: "border border-white/15 text-zinc-300",
  completed: "bg-white/5 text-zinc-400",
  rejected: "bg-white/5 text-zinc-500",
  cancelled: "bg-white/5 text-zinc-500",
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null); // which row is cancelling
  // The booking whose chat is open (null = no chat showing).
  const [chat, setChat] = useState<{ id: string; title: string } | null>(null);
  // The booking whose video call is open (null = no call showing).
  const [call, setCall] = useState<{ id: string; title: string } | null>(null);
  // The approved partners a ride can be dispatched to, and the driver currently
  // picked in each ride row's dropdown (keyed by booking id).
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [picked, setPicked] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings");
      if (!res.ok) throw new Error("Failed to load bookings");
      setBookings(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load the dispatchable drivers (approved partners) once, on mount. A failure
  // here isn't fatal — the rest of the page still works, dispatch just won't list
  // anyone — so we swallow the error rather than blocking the bookings table.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/drivers");
        if (res.ok) setDrivers(await res.json());
      } catch {
        /* non-fatal: dispatch dropdown will simply be empty */
      }
    })();
  }, []);

  // Dispatch a ride to the driver picked in its row's dropdown. Sends `driverId`
  // (not a status), which the admin route treats as an assignment, then reloads.
  const dispatch = async (id: string) => {
    const driverId = picked[id];
    if (!driverId) return;
    setActingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not dispatch this ride");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActingId(null);
    }
  };

  // Accept or reject a HOUSE-FLEET rental REQUEST on the customer's behalf.
  // (Partner vehicles are answered by their owner on the partner page.) On a
  // rejection we ask for an optional reason and pass it as `note`, so the
  // customer sees WHY on their My Bookings page — same as the owner's flow.
  const decide = async (id: string, decision: "accepted" | "rejected") => {
    let note: string | undefined;
    if (decision === "rejected") {
      const reason = window.prompt("Reason for declining (optional — the customer will see this):");
      // prompt() returns null on Cancel; treat that as "no reason given".
      note = reason ? reason : undefined;
    }

    setActingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update the request");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActingId(null);
    }
  };

  // Cancel one booking, then reload so the row updates to "cancelled".
  const cancel = async (id: string) => {
    setActingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel booking");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActingId(null);
    }
  };

  // Format a date range like "21 Jun – 24 Jun 2026".
  const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Reservations"
        title="Bookings"
        description="Every reservation on the platform — open chat, jump on a call, or cancel one."
        right={
          !loading && bookings.length > 0 && (
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
              {bookings.length} total
            </span>
          )
        }
      />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-zinc-600" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 py-16 text-center text-sm text-zinc-400">
          No bookings yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Vehicle</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Dates / Route</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Payment</th>
                <th className="px-5 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="px-5 py-4 font-semibold text-white">
                    {b.vehicleId ? `${b.vehicleId.brand} ${b.vehicleId.model}` : "—"}
                  </td>
                  <td className="px-5 py-4 text-zinc-400">
                    {b.userId ? (
                      <div>
                        <p className="text-zinc-200">{b.userId.name}</p>
                        <p className="text-xs text-zinc-500">{b.userId.email}</p>
                      </div>
                    ) : "—"}
                    {/* Renter KYC — who's actually driving + their licence, so the
                        admin can check it before accepting a fleet request. */}
                    {b.renter && (
                      <div className="mt-2 space-y-0.5 border-t border-white/5 pt-2 text-[11px] text-zinc-500">
                        <p><span className="text-zinc-600">Renter:</span> <span className="text-zinc-300">{b.renter.fullName}</span></p>
                        <p><span className="text-zinc-600">Phone:</span> <span className="text-zinc-300">{b.renter.phone}</span></p>
                        <p><span className="text-zinc-600">Licence:</span> <span className="text-zinc-300">{b.renter.licenseNumber}</span></p>
                      </div>
                    )}
                  </td>
                  {/* A ride shows its pickup → drop + distance; a rental shows
                      its date range. */}
                  <td className="px-5 py-4 text-zinc-400">
                    {b.kind === "ride" ? (
                      <div className="max-w-[220px]">
                        <p className="truncate text-zinc-200">
                          {b.pickup?.address ?? "—"} → {b.drop?.address ?? "—"}
                        </p>
                        <p className="text-xs text-zinc-500">{b.distanceKm ?? 0} km · ride</p>
                      </div>
                    ) : b.startDate && b.endDate ? (
                      `${fmt(b.startDate)} – ${fmt(b.endDate)}`
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-4 font-semibold text-zinc-200">₹{b.totalAmount}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${STATUS_CLS[b.status]}`}>
                      {b.status}
                    </span>
                    {/* If a request was declined with a reason, surface it here. */}
                    {b.status === "rejected" && b.decisionNote && (
                      <p className="mt-1 max-w-[200px] text-xs text-zinc-500">{b.decisionNote}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {b.paid ? (
                      <span className="inline-flex items-center gap-1 text-white"><CheckCircle2 size={14} /> Paid</span>
                    ) : (
                      <span className="text-zinc-500">Demo</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() =>
                          setChat({
                            id: b._id,
                            title: b.vehicleId ? `${b.vehicleId.brand} ${b.vehicleId.model}` : "Booking",
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:bg-white/10 active:scale-95"
                      >
                        <MessageSquare size={13} /> Chat
                      </button>
                      <button
                        onClick={() =>
                          setCall({
                            id: b._id,
                            title: b.vehicleId ? `${b.vehicleId.brand} ${b.vehicleId.model}` : "Booking",
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:bg-white/10 active:scale-95"
                      >
                        <Video size={13} /> Video
                      </button>
                      <Link
                        href={`/trip/${b._id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:bg-white/10 active:scale-95"
                      >
                        <Navigation size={13} /> Trip
                      </Link>
                      {/* House-fleet rental requests await the admin's answer.
                          Partner requests are answered by their owner, so we
                          only show Accept/Reject for source === "fleet". */}
                      {b.status === "requested" && b.vehicleId?.source === "fleet" && (
                        <>
                          <button
                            onClick={() => decide(b._id, "accepted")}
                            disabled={actingId === b._id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white text-black px-3 py-2 text-xs font-bold transition hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
                          >
                            {actingId === b._id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            Accept
                          </button>
                          <button
                            onClick={() => decide(b._id, "rejected")}
                            disabled={actingId === b._id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        </>
                      )}
                      {b.status !== "cancelled" && b.status !== "completed" && b.status !== "rejected" && (
                        <button
                          onClick={() => cancel(b._id)}
                          disabled={actingId === b._id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
                        >
                          {actingId === b._id ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                          Cancel
                        </button>
                      )}
                    </div>

                    {/* DISPATCH (rides only, while still active): assign an approved
                        partner to drive. Shows the current driver once assigned,
                        with the dropdown left in place so the admin can reassign. */}
                    {b.kind === "ride" && b.status !== "cancelled" && b.status !== "completed" && (
                      <div className="mt-2 flex items-center justify-end gap-2">
                        {b.driverId && (
                          <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                            <Navigation size={12} className="text-emerald-400" />
                            {b.driverId.name}
                          </span>
                        )}
                        <select
                          value={picked[b._id] ?? ""}
                          onChange={(e) => setPicked((p) => ({ ...p, [b._id]: e.target.value }))}
                          className="rounded-xl border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-white/30"
                        >
                          <option value="">{b.driverId ? "Reassign…" : "Pick a driver…"}</option>
                          {drivers.map((d) => (
                            <option key={d._id} value={d._id}>{d.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => dispatch(b._id)}
                          disabled={actingId === b._id || !picked[b._id]}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-200 transition hover:bg-white/10 active:scale-95 disabled:opacity-40"
                        >
                          {actingId === b._id ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
                          {b.driverId ? "Reassign" : "Dispatch"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* The chat panel, shown when a row's "Chat" button was clicked. */}
      {chat && (
        <BookingChat bookingId={chat.id} title={chat.title} onClose={() => setChat(null)} />
      )}

      {/* The video call panel, shown when a row's "Video" button was clicked. */}
      {call && (
        <VideoCall bookingId={call.id} title={call.title} onClose={() => setCall(null)} />
      )}
    </div>
  );
}
