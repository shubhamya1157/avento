// ===========================================================================
// partner/page.tsx — The "/partner" page: apply, do video KYC, manage vehicles
// ===========================================================================
//
// Folder name "partner" -> this page lives at the web address "/partner".
//
// This is the whole "become a partner" journey, and what it shows depends on how
// far along the logged-in user is (their `partnerStatus`, fetched fresh from
// /api/partner/application):
//
//   none / rejected  -> the APPLICATION FORM (describe a vehicle + your details,
//                       upload photos, submit). A rejected applicant may re-apply.
//   pending_review   -> an "under review" panel (form hidden — one app at a time).
//   kyc_pending      -> "details approved" + a JOIN VIDEO KYC CALL button. Passing
//                       the call is what turns them into a partner.
//   approved (partner) -> the partner DASHBOARD: their vehicles + an "add another
//                       vehicle" form (extra vehicles need only per-vehicle review,
//                       no second KYC).
//
// As before it shows three top-level states: loading, not-logged-in, logged-in.
// ===========================================================================

'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Nav from "@/app/component/Nav";
import Footer from "@/app/component/Footer";
import AuthModal from "@/app/component/AuthModal";
import VideoCall from "@/app/component/VideoCall";
import { kycRoom } from "@/app/lib/socket-client";
import type { Vehicle, PartnerStatus } from "@/app/lib/types";
import {
  Handshake, Loader2, AlertCircle, CheckCircle2, XCircle, Clock,
  ImagePlus, Trash2, Car, CalendarCheck, Video, ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Shared Tailwind classes for every text/number input, kept in one constant so
// every field looks identical (and a style tweak only has to happen once).
const FIELD =
  "w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-white/30";

// The blank starting values for the form. Keeping them in one object lets us
// reset the whole form in a single line after a successful submission.
const EMPTY_FORM = {
  brand: "",
  model: "",
  type: "car",
  pricePerDay: "",
  description: "",
  transmission: "Automatic",
  fuel: "Petrol",
  seats: "",
  ownerName: "",
  ownerPhone: "",
  licensePlate: "",
  location: "",
};

// A tiny helper that returns the right coloured badge for a submission's status.
function StatusBadge({ status }: { status?: string }) {
  if (status === "approved") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
        <CheckCircle2 size={12} /> Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400">
        <XCircle size={12} /> Rejected
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
      <Clock size={12} /> Pending review
    </span>
  );
}

export default function PartnerPage() {
  const { data: session, status } = useSession();

  // ---- Form state ----
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ---- Application + vehicles state (from /api/partner/application) ----
  const [partnerStatus, setPartnerStatus] = useState<PartnerStatus>("none");
  const [kycNote, setKycNote] = useState<string | undefined>();
  const [myVehicles, setMyVehicles] = useState<Vehicle[]>([]);
  const [loadedForSession, setLoadedForSession] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false); // is the KYC video call open?

  // Load the user's application state + their submissions once logged in.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/partner/application");
        if (!res.ok) throw new Error("Failed to load your application");
        const data = await res.json();
        if (!cancelled) {
          setPartnerStatus(data.partnerStatus ?? "none");
          setKycNote(data.kycNote);
          setMyVehicles(data.vehicles ?? []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load your application");
      } finally {
        if (!cancelled) setLoadedForSession(true);
      }
    })();

    return () => { cancelled = true; };
  }, [status]);

  // While an application is MID-FLIGHT (waiting on the admin to review the details
  // or to run/pass the KYC), quietly poll the server every few seconds so the page
  // advances on its OWN — "under review" → "Join KYC video call" → partner
  // dashboard — the moment the admin acts, with no manual refresh. This is what
  // makes the hand-off feel live: when the admin starts the KYC call, the
  // applicant's "Join" button is already there waiting for them. We stop polling
  // once they reach a settled state (approved / rejected / none).
  useEffect(() => {
    if (status !== "authenticated") return;
    if (partnerStatus !== "pending_review" && partnerStatus !== "kyc_pending") return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/partner/application");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setPartnerStatus(data.partnerStatus ?? "none");
        setKycNote(data.kycNote);
        setMyVehicles(data.vehicles ?? []);
      } catch {
        /* a dropped poll is harmless — the next tick tries again */
      }
    };
    const timer = setInterval(poll, 7000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [status, partnerStatus]);

  const setField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Upload chosen image file(s) to /api/upload; the first photo is the cover.
  const handlePhotoUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(fileList)) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Upload failed");
        urls.push(data.url);
      }
      setPhotos((prev) => [...prev, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) =>
    setPhotos((prev) => prev.filter((_, i) => i !== index));

  // Re-fetch the application after a submit so the UI moves to the next stage.
  const refreshApplication = async () => {
    try {
      const res = await fetch("/api/partner/application");
      if (res.ok) {
        const data = await res.json();
        setPartnerStatus(data.partnerStatus ?? "none");
        setKycNote(data.kycNote);
        setMyVehicles(data.vehicles ?? []);
      }
    } catch {
      /* a failed refresh isn't worth interrupting the success message for */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (photos.length === 0) {
      setError("Please upload at least one photo of your vehicle");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/partner/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pricePerDay: Number(form.pricePerDay),
          seats: Number(form.seats),
          image: photos[0],
          images: photos.slice(1),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit your vehicle");

      setForm(EMPTY_FORM);
      setPhotos([]);
      setSuccess("Submitted! Our team will review your details and invite you to a quick video KYC.");
      refreshApplication();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // The submission form, reused by new applicants AND approved partners (adding
  // another vehicle). `heading` lets each context label it appropriately.
  const submissionForm = (heading: string, cta: string) => (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-3xl border border-white/10 bg-zinc-950/60 p-6 md:p-8"
    >
      <h3 className="text-lg font-black tracking-wide">{heading}</h3>

      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-5">
        <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">Vehicle details</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <input className={FIELD} placeholder="Brand (e.g. Tesla)" value={form.brand} onChange={(e) => setField("brand", e.target.value)} required />
          <input className={FIELD} placeholder="Model (e.g. Model S Plaid)" value={form.model} onChange={(e) => setField("model", e.target.value)} required />
          <select className={FIELD} value={form.type} onChange={(e) => setField("type", e.target.value)}>
            <option value="car">Car</option>
            <option value="bike">Bike</option>
            <option value="suv">SUV</option>
          </select>
          <input className={FIELD} type="number" min="1" placeholder="Price per day (₹)" value={form.pricePerDay} onChange={(e) => setField("pricePerDay", e.target.value)} required />
          <select className={FIELD} value={form.transmission} onChange={(e) => setField("transmission", e.target.value)}>
            <option value="Automatic">Automatic</option>
            <option value="Manual">Manual</option>
          </select>
          <select className={FIELD} value={form.fuel} onChange={(e) => setField("fuel", e.target.value)}>
            <option value="Petrol">Petrol</option>
            <option value="Diesel">Diesel</option>
            <option value="Electric">Electric</option>
            <option value="Hybrid">Hybrid</option>
          </select>
          <input className={FIELD} type="number" min="1" placeholder="Seats" value={form.seats} onChange={(e) => setField("seats", e.target.value)} required />
          <input className={FIELD} placeholder="License plate (e.g. MH01AB1234)" value={form.licensePlate} onChange={(e) => setField("licensePlate", e.target.value)} required />
        </div>
        <textarea className={`${FIELD} min-h-[96px] resize-y`} placeholder="Description — what makes this vehicle special?" value={form.description} onChange={(e) => setField("description", e.target.value)} required />
      </div>

      <div className="space-y-5">
        <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">Your details</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <input className={FIELD} placeholder="Your full name" value={form.ownerName} onChange={(e) => setField("ownerName", e.target.value)} required />
          <input className={FIELD} placeholder="Contact phone" value={form.ownerPhone} onChange={(e) => setField("ownerPhone", e.target.value)} required />
          <input className={`${FIELD} sm:col-span-2`} placeholder="Vehicle location (city / area)" value={form.location} onChange={(e) => setField("location", e.target.value)} required />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">Photos</h4>
        <div className="flex flex-wrap gap-4">
          {photos.map((url, i) => (
            <div key={url} className="relative h-24 w-32 overflow-hidden rounded-xl border border-white/10">
              <img src={url} alt={`Vehicle photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">Cover</span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-red-400 transition hover:bg-black"
                aria-label="Remove photo"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 bg-zinc-900/40 text-zinc-400 transition hover:border-white/40 hover:text-white">
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
            <span className="text-[11px] font-medium">{uploading ? "Uploading…" : "Add photo"}</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotoUpload(e.target.files)} />
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || uploading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold text-black transition hover:scale-[1.01] active:scale-95 disabled:opacity-50 sm:mx-auto sm:w-auto sm:px-10"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Handshake size={16} />}
        {submitting ? "Submitting…" : cta}
      </button>
    </form>
  );

  // The list of the user's own submissions (shown on the dashboard).
  const submissionsList = (
    <div className="space-y-6">
      <h2 className="text-2xl font-black tracking-wide">MY SUBMISSIONS</h2>
      {!loadedForSession ? (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-zinc-600" />
        </div>
      ) : myVehicles.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-900/5 py-16 text-center text-sm text-zinc-400">
          You haven&apos;t submitted any vehicles yet.
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {myVehicles.map((v) => (
              <motion.div
                key={v._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-zinc-950/60 p-5 sm:flex-row"
              >
                <div className="h-28 w-full shrink-0 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 sm:w-44">
                  <img src={v.image} alt={`${v.brand} ${v.model}`} className="h-full w-full object-cover" />
                </div>
                <div className="w-full flex-1 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-bold">{v.brand} {v.model}</h3>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-400">
                    <span>₹{v.pricePerDay}/day</span>
                    <span className="capitalize">{v.type}</span>
                    <span>{v.location}</span>
                    <span>{v.licensePlate}</span>
                  </div>
                  {v.adminNote && (
                    <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
                      <span className="font-semibold text-zinc-200">Admin note:</span> {v.adminNote}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  // STATE 1: still checking who's logged in -> spinner.
  if (status === "loading") {
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

  const isPartner = partnerStatus === "approved";

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-black px-6 pb-20 pt-32 text-white md:px-12 lg:px-24">
        <div className="mx-auto max-w-5xl space-y-12">
          {/* Page header */}
          <div className="space-y-3">
            <span className="text-xs uppercase tracking-[0.5em] text-zinc-500">Earn with Avento</span>
            <h1 className="flex items-center gap-3 text-4xl font-black tracking-wide">
              <Handshake className="text-zinc-400" /> {isPartner ? "PARTNER DASHBOARD" : "BECOME A PARTNER"}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
              {isPartner
                ? "Manage the vehicles you've listed and add new ones to your fleet."
                : "List your premium vehicle on Avento and earn when others rent it. After we review your details, you'll complete a quick video KYC to become a partner."}
            </p>
            {status === "authenticated" && (
              <Link
                href="/partner/bookings"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"
              >
                <CalendarCheck size={14} /> Bookings on my vehicles
              </Link>
            )}
          </div>

          {/* STATE 2: not logged in -> prompt to sign in. */}
          {status === "unauthenticated" ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-zinc-900/15 py-24 text-center backdrop-blur-md">
              <Car size={48} className="mb-6 text-zinc-600" />
              <h2 className="text-2xl font-black tracking-wide">Sign In Required</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
                Log in to apply, complete your video KYC, and manage your vehicles.
              </p>
              <button
                onClick={() => setAuthOpen(true)}
                className="mt-8 cursor-pointer rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition hover:scale-105 active:scale-95"
              >
                Log In
              </button>
            </div>
          ) : !loadedForSession ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-zinc-600" />
            </div>
          ) : (
            // STATE 3: logged in -> content driven by where they are in the journey.
            <>
              {/* --- Stage: application under review --- */}
              {partnerStatus === "pending_review" && (
                <div className="space-y-3 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
                  <Clock size={36} className="mx-auto text-amber-400" />
                  <h2 className="text-2xl font-black tracking-wide">Application under review</h2>
                  <p className="mx-auto max-w-md text-sm leading-relaxed text-zinc-400">
                    Thanks for applying! Our team is checking your vehicle details. Once they&apos;re
                    happy, you&apos;ll be invited here to complete a short video KYC call.
                  </p>
                </div>
              )}

              {/* --- Stage: details approved, time for video KYC --- */}
              {partnerStatus === "kyc_pending" && (
                <div className="space-y-4 rounded-3xl border border-sky-500/20 bg-sky-500/5 p-8 text-center">
                  <ShieldCheck size={36} className="mx-auto text-sky-300" />
                  <h2 className="text-2xl font-black tracking-wide">Complete your video KYC</h2>
                  <p className="mx-auto max-w-md text-sm leading-relaxed text-zinc-400">
                    Your details are approved. The final step is a quick live video call with our
                    team to verify your identity. Join below — an admin will connect with you.
                  </p>
                  <button
                    onClick={() => setKycOpen(true)}
                    className="mx-auto inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition hover:scale-105 active:scale-95"
                  >
                    <Video size={16} /> Join KYC video call
                  </button>
                </div>
              )}

              {/* --- Stage: rejected -> explain + allow re-apply --- */}
              {partnerStatus === "rejected" && (
                <div className="space-y-2 rounded-3xl border border-red-500/20 bg-red-500/5 p-6">
                  <h2 className="flex items-center gap-2 text-lg font-black tracking-wide text-red-300">
                    <XCircle size={18} /> Application not approved
                  </h2>
                  <p className="text-sm text-zinc-400">
                    {kycNote ? kycNote : "Your application wasn't approved this time."} You&apos;re
                    welcome to apply again below.
                  </p>
                </div>
              )}

              {/* The form: shown to new/rejected applicants and to approved partners
                  (to add another vehicle). Hidden while an application is in flight. */}
              {(partnerStatus === "none" || partnerStatus === "rejected") &&
                submissionForm("List your vehicle", "Submit for review")}

              {isPartner && submissionForm("Add another vehicle", "Submit vehicle")}

              {/* The submissions list (always useful once logged in). */}
              {submissionsList}
            </>
          )}
        </div>
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="login" />

      {/* The applicant's side of the video KYC call. Room is keyed by their own
          user id, so they meet the admin who starts the call from /admin/partners. */}
      {kycOpen && session?.user?.id && (
        <VideoCall
          room={kycRoom(session.user.id)}
          title="Video KYC"
          onClose={() => setKycOpen(false)}
        />
      )}

      <Footer />
    </>
  );
}
