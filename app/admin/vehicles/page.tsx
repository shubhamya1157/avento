// ===========================================================================
// admin/vehicles/page.tsx — The "/admin/vehicles" review queue (admins only)
// ===========================================================================
//
// Folder "admin/vehicles" -> web address "/admin/vehicles". The admin guard and
// the sidebar frame come from app/admin/layout.tsx, so this file only returns
// the review queue itself: see each partner-submitted vehicle's photos and owner
// details, then Approve it (making it bookable) or Reject it (with an optional
// note explaining why).
//
// A small filter at the top switches between Pending / Approved / Rejected / All.
// ===========================================================================

'use client';

import { useState, useEffect, useCallback } from "react";
import type { Vehicle } from "@/app/lib/types";
import { Loader2, CheckCircle2, XCircle, AlertCircle, MapPin, Phone, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminPageHeader from "@/app/component/AdminPageHeader";

// The filter tabs shown at the top of the queue.
const FILTERS = ["pending", "approved", "rejected", "all"] as const;
type Filter = (typeof FILTERS)[number];

export default function AdminVehiclesPage() {
  const [filter, setFilter] = useState<Filter>("pending"); // which tab is active
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Which vehicle is currently being approved/rejected (so we can show a spinner
  // on just that card and disable its buttons).
  const [actingId, setActingId] = useState<string | null>(null);
  // The reject-reason note being typed, keyed by vehicle id.
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Load the submissions for the active filter. Wrapped in useCallback so the
  // effect below can safely depend on it (it only changes when `filter` does).
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/vehicles?status=${filter}`);
      if (!res.ok) throw new Error("Failed to load submissions");
      setVehicles(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Re-load whenever the filter (and therefore `load`) changes.
  useEffect(() => { load(); }, [load]);

  // Approve or reject one vehicle, then reload the list so it moves out of the
  // current tab. For a rejection we send along the typed note (if any).
  const review = async (id: string, status: "approved" | "rejected") => {
    setActingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/vehicles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: notes[id] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update submission");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Approvals"
        title="Review submissions"
        description="Approve a partner's vehicle to make it bookable, or reject it with a note."
      />

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  filter === f
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* The queue itself. */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-zinc-600" />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-900/5 py-16 text-center text-sm text-zinc-400">
              No {filter === "all" ? "" : filter} submissions.
            </div>
          ) : (
            <div className="space-y-5">
              <AnimatePresence initial={false}>
                {vehicles.map((v) => {
                  // The cover photo plus any gallery photos, as one list to show.
                  const allPhotos = [v.image, ...(v.images ?? [])];
                  return (
                    <motion.div
                      key={v._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="space-y-5 rounded-3xl border border-white/10 bg-zinc-950/60 p-6"
                    >
                      {/* Photo strip */}
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {allPhotos.map((url, i) => (
                          <img
                            key={`${v._id}-${i}`}
                            src={url}
                            alt={`${v.brand} ${v.model} photo ${i + 1}`}
                            className="h-32 w-44 shrink-0 rounded-2xl border border-white/5 object-cover"
                          />
                        ))}
                      </div>

                      {/* Vehicle + owner details */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold">{v.brand} {v.model}</h3>
                          <p className="text-sm text-zinc-400">{v.description}</p>
                          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-400">
                            <span className="font-semibold text-zinc-200">₹{v.pricePerDay}/day</span>
                            <span className="capitalize">{v.type}</span>
                            <span>{v.transmission}</span>
                            <span>{v.fuel}</span>
                            <span>{v.seats} seats</span>
                          </div>
                        </div>
                        <div className="space-y-2 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-zinc-300">
                          <p className="flex items-center gap-2"><User size={14} className="text-zinc-500" /> {v.ownerName}</p>
                          <p className="flex items-center gap-2"><Phone size={14} className="text-zinc-500" /> {v.ownerPhone}</p>
                          <p className="flex items-center gap-2"><MapPin size={14} className="text-zinc-500" /> {v.location}</p>
                          <p className="text-xs text-zinc-500">Plate: <span className="text-zinc-300">{v.licensePlate}</span></p>
                        </div>
                      </div>

                      {/* Decision area — only shown for pending submissions.
                          Already-decided ones show their status + note instead. */}
                      {v.status === "pending" ? (
                        <div className="space-y-3 border-t border-white/5 pt-4">
                          <input
                            className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-white/30"
                            placeholder="Optional note (shown to the partner — e.g. reason for rejection)"
                            value={notes[v._id] ?? ""}
                            onChange={(e) => setNotes((prev) => ({ ...prev, [v._id]: e.target.value }))}
                          />
                          <div className="flex gap-3">
                            <button
                              onClick={() => review(v._id, "approved")}
                              disabled={actingId === v._id}
                              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-bold text-black transition hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
                            >
                              {actingId === v._id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                              Approve
                            </button>
                            <button
                              onClick={() => review(v._id, "rejected")}
                              disabled={actingId === v._id}
                              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-xs font-bold text-red-400 transition hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
                            >
                              {actingId === v._id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-4 text-xs">
                          <span className={`font-bold uppercase tracking-wider ${v.status === "approved" ? "text-white" : "text-zinc-500"}`}>
                            {v.status}
                          </span>
                          {v.adminNote && <span className="text-zinc-400">— {v.adminNote}</span>}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
          </div>
        )}
    </div>
  );
}
