// ===========================================================================
// admin/partners/page.tsx — "/admin/partners": the partner application + KYC desk
// ===========================================================================
//
// Folder "admin/partners" -> web address "/admin/partners". The admin guard and
// sidebar come from app/admin/layout.tsx, so this file is just the console.
//
// This is where an admin shepherds someone from "applied" to "partner":
//   1. pending_review — read the vehicle + owner details, then APPROVE DETAILS
//                       (move them to KYC) or REJECT.
//   2. kyc_pending    — START the live video KYC call (see the applicant face to
//                       face), then mark PASS (they become a partner and their
//                       vehicle goes live) or FAIL.
//   3. approved / rejected — the decided outcome, shown for reference.
// ===========================================================================

'use client';

import { useState, useEffect, useCallback } from "react";
import type { PartnerApplication } from "@/app/lib/types";
import {
  Loader2, CheckCircle2, XCircle, AlertCircle, MapPin, Phone, User,
  Video, ShieldCheck, Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminPageHeader from "@/app/component/AdminPageHeader";
import VideoCall from "@/app/component/VideoCall";
import { kycRoom } from "@/app/lib/socket-client";

// The two views: the live queue (things to act on) and everything (history).
const FILTERS = ["active", "all"] as const;
type Filter = (typeof FILTERS)[number];

// A coloured badge per application stage.
function StageBadge({ status }: { status: PartnerApplication["partnerStatus"] }) {
  const map: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
    pending_review: { label: "Details review", cls: "border-amber-500/20 bg-amber-500/10 text-amber-400", Icon: Clock },
    kyc_pending: { label: "Awaiting KYC", cls: "border-sky-500/20 bg-sky-500/10 text-sky-300", Icon: Video },
    approved: { label: "Partner", cls: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400", Icon: CheckCircle2 },
    rejected: { label: "Rejected", cls: "border-red-500/20 bg-red-500/10 text-red-400", Icon: XCircle },
  };
  const { label, cls, Icon } = map[status] ?? map.pending_review;
  return (
    <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${cls}`}>
      <Icon size={12} /> {label}
    </span>
  );
}

export default function AdminPartnersPage() {
  const [filter, setFilter] = useState<Filter>("active");
  const [apps, setApps] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null); // which row is busy
  const [notes, setNotes] = useState<Record<string, string>>({}); // per-applicant note
  // The applicant we're currently on a KYC video call with (null = no call open).
  const [callWith, setCallWith] = useState<PartnerApplication | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/partners?status=${filter === "all" ? "all" : "active"}`);
      if (!res.ok) throw new Error("Failed to load applications");
      setApps(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Apply one admin decision to an application, then reload the list.
  const act = async (id: string, action: string) => {
    setActingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: notes[id] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update application");
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
        eyebrow="Partners"
        title="Applications & KYC"
        description="Review a prospective partner's vehicle, run their video KYC, then approve to make them a partner."
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
            {f === "active" ? "Active queue" : "All"}
          </button>
        ))}
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
      ) : apps.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-900/5 py-16 text-center text-sm text-zinc-400">
          {filter === "active" ? "No applications waiting on you right now." : "No applications yet."}
        </div>
      ) : (
        <div className="space-y-5">
          <AnimatePresence initial={false}>
            {apps.map((app) => {
              const v = app.vehicle;
              const photos = v ? [v.image, ...(v.images ?? [])] : [];
              const busy = actingId === app._id;
              return (
                <motion.div
                  key={app._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-5 rounded-3xl border border-white/10 bg-zinc-950/60 p-6"
                >
                  {/* Applicant header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{app.name}</h3>
                      <p className="text-xs text-zinc-500">{app.email}</p>
                    </div>
                    <StageBadge status={app.partnerStatus} />
                  </div>

                  {/* Photo strip */}
                  {photos.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {photos.map((url, i) => (
                        <img
                          key={`${app._id}-${i}`}
                          src={url}
                          alt={`vehicle photo ${i + 1}`}
                          className="h-32 w-44 shrink-0 rounded-2xl border border-white/5 object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {/* Vehicle + owner details */}
                  {v ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <h4 className="text-base font-bold">{v.brand} {v.model}</h4>
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
                  ) : (
                    <p className="text-sm text-zinc-500">The submitted vehicle is no longer available.</p>
                  )}

                  {/* Decision area depends on the stage. */}
                  {app.partnerStatus === "pending_review" && (
                    <div className="space-y-3 border-t border-white/5 pt-4">
                      <input
                        className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-white/30"
                        placeholder="Optional note (shown to the applicant — e.g. reason for rejection)"
                        value={notes[app._id] ?? ""}
                        onChange={(e) => setNotes((p) => ({ ...p, [app._id]: e.target.value }))}
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => act(app._id, "approve_details")}
                          disabled={busy}
                          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-bold text-black transition hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Approve details → KYC
                        </button>
                        <button
                          onClick={() => act(app._id, "reject")}
                          disabled={busy}
                          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-xs font-bold text-red-400 transition hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {app.partnerStatus === "kyc_pending" && (
                    <div className="space-y-3 border-t border-white/5 pt-4">
                      <button
                        onClick={() => setCallWith(app)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-5 py-3 text-xs font-bold text-sky-300 transition hover:bg-sky-500/20 active:scale-95"
                      >
                        <Video size={15} /> Start video KYC call
                      </button>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-white/30"
                        placeholder="Optional KYC note"
                        value={notes[app._id] ?? ""}
                        onChange={(e) => setNotes((p) => ({ ...p, [app._id]: e.target.value }))}
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => act(app._id, "kyc_pass")}
                          disabled={busy}
                          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-bold text-black transition hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                          Pass — make partner
                        </button>
                        <button
                          onClick={() => act(app._id, "kyc_fail")}
                          disabled={busy}
                          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-xs font-bold text-red-400 transition hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
                        >
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                          Fail
                        </button>
                      </div>
                    </div>
                  )}

                  {(app.partnerStatus === "approved" || app.partnerStatus === "rejected") && (
                    <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-4 text-xs">
                      <span className={`font-bold uppercase tracking-wider ${app.partnerStatus === "approved" ? "text-emerald-400" : "text-zinc-500"}`}>
                        {app.partnerStatus === "approved" ? "Approved — now a partner" : "Rejected"}
                      </span>
                      {app.kycNote && <span className="text-zinc-400">— {app.kycNote}</span>}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* The live KYC video call, opened over everything. The room is keyed by the
          applicant's user id, so they meet the admin in the same room. */}
      {callWith && (
        <VideoCall
          room={kycRoom(callWith._id)}
          title={`KYC · ${callWith.name}`}
          onClose={() => setCallWith(null)}
        />
      )}
    </div>
  );
}
