// ===========================================================================
// partner/page.tsx — The "/partner" page: list YOUR vehicle & track approval
// ===========================================================================
//
// Folder name "partner" -> this page lives at the web address "/partner".
//
// This is the "Become a Partner" experience. A logged-in user can:
//   1. Fill in a form describing a vehicle they own (plus their own contact
//      details) and upload photos of it.
//   2. Submit it for review. It is saved as a "pending" vehicle.
//   3. Watch the status of each submission below the form: Pending (waiting for
//      an admin), Approved (now bookable by renters), or Rejected (with a note).
//
// Like the bookings page, it shows three states: loading, not-logged-in, and
// logged-in. We reuse the same Nav, Footer and AuthModal pieces for consistency.
// ===========================================================================

'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Nav from "@/app/component/Nav";
import Footer from "@/app/component/Footer";
import AuthModal from "@/app/component/AuthModal";
import type { Vehicle } from "@/app/lib/types";
import {
  Handshake, Loader2, AlertCircle, CheckCircle2, XCircle, Clock,
  ImagePlus, Trash2, Car, CalendarCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Shared Tailwind classes for every text/number input, kept in one constant so
// every field looks identical (and a style tweak only has to happen once).
const FIELD =
  "w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-white/30";

// The blank starting values for the form. Keeping them in one object lets us
// reset the whole form in a single line after a successful submission.
// (The type / transmission / fuel values are kept as plain strings here; the
// server validates them against the allowed list when the form is submitted.)
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
  // Anything else (including "pending") shows the amber "pending" badge.
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
      <Clock size={12} /> Pending review
    </span>
  );
}

export default function PartnerPage() {
  const { status } = useSession();

  // ---- Form state ----
  const [form, setForm] = useState(EMPTY_FORM);     // all the typed-in field values
  const [photos, setPhotos] = useState<string[]>([]); // URLs of uploaded photos (first = cover)
  const [uploading, setUploading] = useState(false); // a photo upload in progress?
  const [submitting, setSubmitting] = useState(false); // the form submit in progress?
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ---- "My submissions" list state ----
  const [myVehicles, setMyVehicles] = useState<Vehicle[]>([]);
  const [loadedForSession, setLoadedForSession] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // Load the partner's existing submissions once they're logged in. Same
  // fetch-then-json pattern as the bookings page.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/partner/vehicles");
        if (!res.ok) throw new Error("Failed to load your vehicles");
        const data = await res.json();
        if (!cancelled) setMyVehicles(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load your vehicles");
      } finally {
        if (!cancelled) setLoadedForSession(true);
      }
    })();

    return () => { cancelled = true; };
  }, [status]);

  // Update one field of the form. `key` is which field; `value` is its new text.
  // The `...form` ("spread") copies all existing values, then overrides one.
  const setField = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Upload the chosen image file(s) to /api/upload and remember the returned
  // URLs. The first uploaded photo becomes the cover automatically.
  const handlePhotoUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      // Upload each selected file one at a time, collecting the returned URLs.
      const urls: string[] = [];
      for (const file of Array.from(fileList)) {
        const body = new FormData();      // the browser's container for file uploads
        body.append("file", file);        // field name "file" matches the API route
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Upload failed");
        urls.push(data.url);
      }
      setPhotos((prev) => [...prev, ...urls]); // add the new photos to the gallery
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  // Remove one already-uploaded photo from the list (by its position/index).
  const removePhoto = (index: number) =>
    setPhotos((prev) => prev.filter((_, i) => i !== index));

  // Re-load the submissions list (called right after a successful submit).
  const refreshMyVehicles = async () => {
    try {
      const res = await fetch("/api/partner/vehicles");
      if (res.ok) setMyVehicles(await res.json());
    } catch {
      /* a failed refresh isn't worth interrupting the success message for */
    }
  };

  // Submit the whole form to the server.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();   // stop the browser's default "reload the page" behaviour
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
          // Numbers arrive from inputs as text, so convert before sending.
          pricePerDay: Number(form.pricePerDay),
          seats: Number(form.seats),
          image: photos[0],        // first photo is the cover
          images: photos.slice(1), // the rest are the gallery
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit your vehicle");

      // Success: clear the form, clear photos, show a message, refresh the list.
      setForm(EMPTY_FORM);
      setPhotos([]);
      setSuccess("Your vehicle was submitted! An admin will review it shortly.");
      refreshMyVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-black px-6 pb-20 pt-32 text-white md:px-12 lg:px-24">
        <div className="mx-auto max-w-5xl space-y-12">
          {/* Page header */}
          <div className="space-y-3">
            <span className="text-xs uppercase tracking-[0.5em] text-zinc-500">Earn with Avento</span>
            <h1 className="flex items-center gap-3 text-4xl font-black tracking-wide">
              <Handshake className="text-zinc-400" /> BECOME A PARTNER
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
              List your premium vehicle on Avento and earn when others rent it. Tell us about the
              vehicle and yourself, upload a few photos, and our team will review your submission.
            </p>
            {/* Link to the partner's incoming bookings (where they can chat with
                customers who booked their vehicles). Only useful once logged in. */}
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
                Log in to list your vehicle and track your partner submissions.
              </p>
              <button
                onClick={() => setAuthOpen(true)}
                className="mt-8 cursor-pointer rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition hover:scale-105 active:scale-95"
              >
                Log In
              </button>
            </div>
          ) : (
            // STATE 3: logged in -> the submission form + the submissions list.
            <>
              {/* ---- Submission form ---- */}
              <form
                onSubmit={handleSubmit}
                className="space-y-8 rounded-3xl border border-white/10 bg-zinc-950/60 p-6 md:p-8"
              >
                {/* Success / error banners */}
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

                {/* --- Section: the vehicle --- */}
                <div className="space-y-5">
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">Vehicle details</h3>
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

                {/* --- Section: owner / personal details --- */}
                <div className="space-y-5">
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">Your details</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input className={FIELD} placeholder="Your full name" value={form.ownerName} onChange={(e) => setField("ownerName", e.target.value)} required />
                    <input className={FIELD} placeholder="Contact phone" value={form.ownerPhone} onChange={(e) => setField("ownerPhone", e.target.value)} required />
                    <input className={`${FIELD} sm:col-span-2`} placeholder="Vehicle location (city / area)" value={form.location} onChange={(e) => setField("location", e.target.value)} required />
                  </div>
                </div>

                {/* --- Section: photos --- */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">Photos</h3>
                  <div className="flex flex-wrap gap-4">
                    {/* Each already-uploaded photo, with a remove button. The
                        first one is labelled "Cover". */}
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

                    {/* The "add photo" tile. It's a label wrapping a hidden file
                        input, so the whole tile is clickable. */}
                    <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 bg-zinc-900/40 text-zinc-400 transition hover:border-white/40 hover:text-white">
                      {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
                      <span className="text-[11px] font-medium">{uploading ? "Uploading…" : "Add photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e.target.files)}
                      />
                    </label>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold text-black transition hover:scale-[1.01] active:scale-95 disabled:opacity-50 sm:w-auto sm:px-10"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Handshake size={16} />}
                  {submitting ? "Submitting…" : "Submit for review"}
                </button>
              </form>

              {/* ---- My submissions ---- */}
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
                            {/* If the admin left a note (e.g. why it was rejected), show it. */}
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
            </>
          )}
        </div>
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="login" />
      <Footer />
    </>
  );
}
