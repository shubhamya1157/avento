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
import { Loader2, AlertCircle, XCircle, CheckCircle2, MessageSquare, Video, Navigation } from "lucide-react";
import BookingChat from "@/app/component/BookingChat";
import VideoCall from "@/app/component/VideoCall";

// The shape of a booking as /api/admin/bookings returns it. The vehicle and
// user references are "populated" into small objects (or null if the linked
// record was removed), so we type them as optional/nullable.
interface AdminBooking {
  _id: string;
  vehicleId: { _id: string; brand: string; model: string; type: string } | null;
  userId: { _id: string; name: string; email: string } | null;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: "pending" | "confirmed" | "cancelled";
  paid?: boolean;
  createdAt: string;
}

// Colour per booking status.
const STATUS_CLS: Record<AdminBooking["status"], string> = {
  confirmed: "bg-emerald-500/15 text-emerald-400",
  pending: "bg-amber-500/15 text-amber-400",
  cancelled: "bg-red-500/15 text-red-400",
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
      <div className="space-y-2">
        <span className="text-xs uppercase tracking-[0.5em] text-zinc-500">Admin</span>
        <h1 className="text-3xl font-black tracking-wide md:text-4xl">Bookings</h1>
      </div>

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
                <th className="px-5 py-3 font-semibold">Dates</th>
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
                  </td>
                  <td className="px-5 py-4 text-zinc-400">{fmt(b.startDate)} – {fmt(b.endDate)}</td>
                  <td className="px-5 py-4 font-semibold text-zinc-200">₹{b.totalAmount}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${STATUS_CLS[b.status]}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {b.paid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 size={14} /> Paid</span>
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
                      {b.status !== "cancelled" && (
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
