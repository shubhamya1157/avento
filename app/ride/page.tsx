// ===========================================================================
// ride/page.tsx — The "/ride" page: book a point-to-point ride ("Get a Ride")
// ===========================================================================
//
// This is the ride-hailing flow, the companion to the day-rental flow on
// /vehicles. It's a small WIZARD (a few steps shown one at a time):
//
//   1. Addresses — type a pickup and a drop address; we look each up on the map
//                  (geocoding) via /api/geocode.
//   2. Vehicles  — show the trip on a map with the straight-line distance, then
//                  list available vehicles, each with a fare worked out for THIS
//                  trip (see app/lib/fare.ts).
//   3. Confirm   — the chosen vehicle, a trip summary, and a fare breakdown.
//                  "Pay & Book" pays via Razorpay (or books directly in demo mode).
//   4. Done      — the ride is created: track it live, message the driver, or
//                  jump to "My Bookings".
//
// A ride is saved as a booking with kind:"ride", so it reuses ALL the existing
// booking machinery — live tracking (/trip), chat, reviews, and the /bookings
// list — with no duplicate plumbing.
// ===========================================================================

'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, LocateFixed, ArrowRight, ArrowLeft, Loader2,
  Car, Zap, Users, IndianRupee, CheckCircle, AlertCircle, MessageSquare, X,
} from "lucide-react";

import Nav from "@/app/component/Nav";
import Footer from "@/app/component/Footer";
import AuthModal from "@/app/component/AuthModal";
import RouteMap from "@/app/component/RouteMap";
import BookingChat from "@/app/component/BookingChat";
import type { Vehicle, GeoPoint } from "@/app/lib/types";
import { STATIC_VEHICLES } from "@/app/lib/seed-vehicles";
import { haversineKm, estimateFare, BASE_FARE, PER_KM, MIN_FARE } from "@/app/lib/fare";
import { razorpayEnabled, loadRazorpayScript } from "@/app/lib/razorpay-client";

// What /api/geocode hands back for each suggestion.
interface GeoResult {
  displayName: string;
  lat: number;
  lng: number;
}

// ===========================================================================
// AddressField — one address input with a live suggestion dropdown.
// Once a suggestion is chosen it collapses to a tidy "chosen" pill with a clear
// (×) button. It manages its own typing/searching and reports the final choice
// up through onSelect.
// ===========================================================================
function AddressField({
  label,
  placeholder,
  point,
  onSelect,
  onClear,
  showMyLocation = false,
}: {
  label: string;
  placeholder: string;
  point: GeoPoint | null;          // the chosen point (null until picked)
  onSelect: (p: GeoPoint) => void;
  onClear: () => void;
  showMyLocation?: boolean;        // offer a "use my location" shortcut (pickup)
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  // Debounced geocode: 500ms after the user stops typing, look the text up.
  // (Nominatim asks callers not to hammer it, so we wait and only search text of
  // a useful length.) Skipped entirely once a point is chosen.
  useEffect(() => {
    if (point) return;
    const text = query.trim();
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(text)}`);
        const data = await res.json();
        if (!cancelled) {
          setSuggestions(Array.isArray(data) ? data : []);
          setOpen(true);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, point]);

  // Use the device's GPS as the pickup (no reverse-geocode needed — the coords
  // alone are enough for the map and the distance).
  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSelect({
          address: "My current location",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-1.5">
      <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <span>{label}</span>
        {showMyLocation && !point && (
          <button
            type="button"
            onClick={useMyLocation}
            className="inline-flex items-center gap-1 text-[11px] font-medium normal-case tracking-normal text-zinc-400 transition hover:text-white"
          >
            {locating ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
            Use my location
          </button>
        )}
      </label>

      {/* Once a point is picked, show it as a pill with a clear button. */}
      {point ? (
        <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3">
          <MapPin size={16} className="shrink-0 text-white" />
          <span className="flex-1 truncate text-sm text-white">{point.address}</span>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-zinc-400 transition hover:text-white"
            aria-label={`Clear ${label}`}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => suggestions.length && setOpen(true)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-10 text-sm text-white placeholder-zinc-500 outline-none focus:border-white/30"
          />
          {loading && (
            <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-zinc-500" />
          )}

          {/* Suggestion dropdown */}
          {open && suggestions.length > 0 && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl">
              {suggestions.map((s, i) => (
                <button
                  key={`${s.lat}-${s.lng}-${i}`}
                  type="button"
                  onClick={() => {
                    onSelect({ address: s.displayName, lat: s.lat, lng: s.lng });
                    setQuery("");
                    setSuggestions([]);
                    setOpen(false);
                  }}
                  className="flex w-full items-start gap-2.5 border-b border-white/5 px-4 py-3 text-left text-xs text-zinc-300 transition last:border-0 hover:bg-white/5 hover:text-white"
                >
                  <MapPin size={13} className="mt-0.5 shrink-0 text-zinc-500" />
                  <span className="line-clamp-2">{s.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// The page itself.
// ===========================================================================
type Step = "addresses" | "vehicles" | "confirm" | "done";

export default function RidePage() {
  const { data: session } = useSession();

  const [step, setStep] = useState<Step>("addresses");
  const [pickup, setPickup] = useState<GeoPoint | null>(null);
  const [drop, setDrop] = useState<GeoPoint | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>(STATIC_VEHICLES);
  const [selected, setSelected] = useState<Vehicle | null>(null);

  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRideId, setCreatedRideId] = useState<string | null>(null);

  const [showLogin, setShowLogin] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // We only ever want to fetch the live fleet once; this ref guards that.
  const fetchedVehicles = useRef(false);

  // Straight-line trip distance, recomputed whenever an endpoint changes.
  const distanceKm = useMemo(
    () => (pickup && drop ? haversineKm(pickup, drop) : 0),
    [pickup, drop]
  );

  // Load the live fleet the first time we reach the vehicle step (falls back to
  // the static list already in state if the request fails).
  useEffect(() => {
    if (step !== "vehicles" || fetchedVehicles.current) return;
    fetchedVehicles.current = true;
    (async () => {
      try {
        const res = await fetch("/api/vehicles");
        if (res.ok) setVehicles(await res.json());
      } catch (err) {
        console.error("Failed to load vehicles", err);
      }
    })();
  }, [step]);

  // Only vehicles that are free to ride right now.
  const availableVehicles = useMemo(
    () => vehicles.filter((v) => v.availability),
    [vehicles]
  );

  // The fare for the currently chosen vehicle on this trip.
  const fare = useMemo(
    () => (selected ? estimateFare(distanceKm, selected.type) : 0),
    [selected, distanceKm]
  );

  // ---- Pay & book the ride (Razorpay path, or a direct demo booking). ----
  const handlePay = async () => {
    if (!session) {
      setShowLogin(true);
      return;
    }
    // Anyone logged in can ride on Avento (a partner may want a ride too), so
    // there's no role gate here — the server only checks you're signed in.
    if (!selected || !pickup || !drop) return;

    setError(null);
    setPaying(true);

    // The ride details are the same however we pay. Distance + fare are
    // recomputed on the server, so we don't send them.
    const rideDetails = { vehicleId: selected._id, pickup, drop };

    try {
      if (razorpayEnabled) {
        // 1. Create the payment order on our server.
        const orderRes = await fetch("/api/payment/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ totalAmount: fare }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.message || "Could not start payment");

        // 2. Load Razorpay's checkout script.
        const ready = await loadRazorpayScript();
        if (!ready || !window.Razorpay) {
          throw new Error("Could not load the payment gateway. Check your connection.");
        }

        // 3. Open the checkout. On success Razorpay calls our handler, which
        //    verifies the payment AND creates the ride in one server step.
        const razorpay = new window.Razorpay({
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          order_id: orderData.orderId,
          name: "Avento",
          description: `Ride · ${selected.brand} ${selected.model}`,
          image: selected.image,
          prefill: { name: session.user?.name || "", email: session.user?.email || "" },
          theme: { color: "#ffffff" },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const verifyRes = await fetch("/api/payment/verify-ride", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...response, ...rideDetails }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.message || "Payment could not be verified");
              setCreatedRideId(verifyData._id);
              setStep("done");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Payment verification failed.");
            } finally {
              setPaying(false);
            }
          },
          modal: {
            // If the rider closes the popup without paying, re-enable the button.
            ondismiss: () => setPaying(false),
          },
        });
        razorpay.open();
        return; // the handler/ondismiss above finish the flow
      }

      // --- Demo path: no payment configured, just create the ride. ---
      const res = await fetch("/api/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rideDetails),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to book ride");
      setCreatedRideId(data._id);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      // For the Razorpay path we already manage `paying` inside the callbacks.
      if (!razorpayEnabled) setPaying(false);
    }
  };

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-black px-6 pb-24 pt-32 text-white md:px-12 lg:px-24">
        <div className="mx-auto max-w-5xl">
          {/* ---- Heading + step indicator ---- */}
          <div className="space-y-3 text-center md:text-left">
            <span className="text-xs uppercase tracking-[0.5em] text-zinc-500">On-demand</span>
            <h1 className="text-4xl font-black tracking-wide sm:text-5xl">GET A RIDE</h1>
            <p className="max-w-lg text-sm leading-relaxed text-zinc-400">
              Tell us where you&apos;re going, pick your ride, and we&apos;ll take it from there.
            </p>
          </div>

          <StepDots step={step} />

          {/* Error banner (shared across steps) */}
          {error && (
            <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ================= STEP 1: ADDRESSES ================= */}
            {step === "addresses" && (
              <motion.div
                key="addresses"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="mt-10 max-w-xl space-y-6 rounded-3xl border border-white/10 bg-zinc-950/50 p-6 md:p-8"
              >
                <AddressField
                  label="Pickup"
                  placeholder="Where are you starting from?"
                  point={pickup}
                  onSelect={setPickup}
                  onClear={() => setPickup(null)}
                  showMyLocation
                />
                <AddressField
                  label="Drop"
                  placeholder="Where are you going?"
                  point={drop}
                  onSelect={setDrop}
                  onClear={() => setDrop(null)}
                />

                {/* Live distance preview once both ends are set. */}
                {pickup && drop && (
                  <p className="text-xs text-zinc-400">
                    Straight-line distance:{" "}
                    <span className="font-semibold text-white">{distanceKm} km</span>
                  </p>
                )}

                <button
                  disabled={!pickup || !drop}
                  onClick={() => setStep("vehicles")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-black transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100"
                >
                  Find rides <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {/* ================= STEP 2: VEHICLES ================= */}
            {step === "vehicles" && (
              <motion.div
                key="vehicles"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="mt-10 space-y-8"
              >
                {/* Trip map + summary */}
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/50">
                  <div className="h-64 w-full md:h-72">
                    <RouteMap
                      pickup={pickup ? { ...pickup, label: "Pickup" } : null}
                      drop={drop ? { ...drop, label: "Drop" } : null}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 text-xs">
                    <span className="flex items-center gap-2 text-zinc-400">
                      <Navigation size={14} className="text-white" />
                      <span className="truncate">{pickup?.address}</span>
                      <ArrowRight size={12} className="shrink-0 text-zinc-600" />
                      <span className="truncate">{drop?.address}</span>
                    </span>
                    <span className="font-semibold text-white">{distanceKm} km</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold tracking-tight">Choose your ride</h2>
                  <button
                    onClick={() => setStep("addresses")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition hover:text-white"
                  >
                    <ArrowLeft size={14} /> Edit trip
                  </button>
                </div>

                {availableVehicles.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 py-16 text-center text-sm text-zinc-500">
                    No vehicles are available right now.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {availableVehicles.map((v) => (
                      <button
                        key={v._id}
                        onClick={() => {
                          setSelected(v);
                          setError(null);
                          setStep("confirm");
                        }}
                        className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/30 text-left transition hover:border-white/25"
                      >
                        <div className="relative h-40 overflow-hidden bg-zinc-800">
                          <img
                            src={v.image}
                            alt={`${v.brand} ${v.model}`}
                            style={{ objectPosition: v.imagePosition ?? "center" }}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                          <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-xs font-bold text-white">
                            ₹{estimateFare(distanceKm, v.type)}
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col gap-3 p-5">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                              {v.type}
                            </span>
                            <h3 className="mt-0.5 text-base font-bold text-white">
                              {v.brand} <span className="font-normal text-zinc-400">{v.model}</span>
                            </h3>
                          </div>
                          <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-[11px] text-zinc-400">
                            <span className="flex items-center gap-1"><Car size={12} /> {v.transmission}</span>
                            <span className="flex items-center gap-1"><Zap size={12} /> {v.fuel}</span>
                            <span className="flex items-center gap-1"><Users size={12} /> {v.seats}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ================= STEP 3: CONFIRM ================= */}
            {step === "confirm" && selected && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="mt-10 grid gap-6 lg:grid-cols-2"
              >
                {/* Left: vehicle + trip */}
                <div className="space-y-6">
                  <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/30">
                    <div className="h-48 w-full overflow-hidden bg-zinc-800">
                      <img
                        src={selected.image}
                        alt={`${selected.brand} ${selected.model}`}
                        style={{ objectPosition: selected.imagePosition ?? "center" }}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-1 p-5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        {selected.type}
                      </span>
                      <h3 className="text-xl font-bold">
                        {selected.brand} <span className="font-normal text-zinc-400">{selected.model}</span>
                      </h3>
                      <p className="text-xs capitalize text-zinc-400">
                        {selected.transmission} • {selected.fuel} • {selected.seats} seats
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-3xl border border-white/10 bg-zinc-950/50 p-5 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-white" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Pickup</p>
                        <p className="text-zinc-200">{pickup?.address}</p>
                      </div>
                    </div>
                    <div className="ml-[7px] h-4 w-px bg-white/15" />
                    <div className="flex items-start gap-3">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-zinc-400" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Drop</p>
                        <p className="text-zinc-200">{drop?.address}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: fare breakdown + pay */}
                <div className="space-y-6">
                  <div className="space-y-3 rounded-3xl border border-white/10 bg-zinc-950/50 p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Fare estimate</h3>
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Base fare</span>
                      <span className="text-zinc-200">₹{BASE_FARE}</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Distance · {distanceKm} km × ₹{PER_KM[selected.type]}/km</span>
                      <span className="text-zinc-200">₹{Math.round(PER_KM[selected.type] * distanceKm)}</span>
                    </div>
                    <div className="my-1 h-px bg-white/5" />
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200">Total</span>
                      <span className="flex items-center text-2xl font-black text-white">
                        <IndianRupee size={20} />{fare}
                      </span>
                    </div>
                    {fare === MIN_FARE && (
                      <p className="text-[11px] text-zinc-500">A minimum fare of ₹{MIN_FARE} applies to short trips.</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep("vehicles")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-5 py-3.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button
                      onClick={handlePay}
                      disabled={paying}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-black transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {paying ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : !session ? (
                        "Login to book"
                      ) : razorpayEnabled ? (
                        `Pay ₹${fare} & Book`
                      ) : (
                        `Confirm ride · ₹${fare}`
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ================= STEP 4: DONE ================= */}
            {step === "done" && createdRideId && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 flex flex-col items-center rounded-3xl border border-white/10 bg-zinc-950/50 px-6 py-16 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 11 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white"
                >
                  <CheckCircle size={36} />
                </motion.div>
                <h3 className="mt-6 text-2xl font-black tracking-wider">RIDE CONFIRMED</h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
                  Your {selected?.brand} {selected?.model} is booked. Track it live or message your
                  driver any time.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href={`/trip/${createdRideId}`}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:scale-105"
                  >
                    <Navigation size={15} /> Track ride
                  </Link>
                  <button
                    onClick={() => setChatOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <MessageSquare size={15} /> Message driver
                  </button>
                  <Link
                    href="/bookings"
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    My Bookings
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Login popup, shown if a logged-out visitor tries to pay. */}
      <AuthModal open={showLogin} onClose={() => setShowLogin(false)} initialMode="login" />

      {/* Chat with the driver, opened from the success screen. */}
      {chatOpen && createdRideId && (
        <BookingChat
          bookingId={createdRideId}
          title={selected ? `${selected.brand} ${selected.model}` : "Your ride"}
          onClose={() => setChatOpen(false)}
        />
      )}

      <Footer />
    </>
  );
}

// ===========================================================================
// StepDots — a tiny "1 — 2 — 3" progress indicator across the top.
// ===========================================================================
function StepDots({ step }: { step: Step }) {
  // Map each step to its position so we can light up the ones reached so far.
  const order: Step[] = ["addresses", "vehicles", "confirm", "done"];
  const current = order.indexOf(step);
  const labels = ["Trip", "Ride", "Pay", "Done"];

  return (
    <div className="mt-8 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] ${
              i <= current
                ? "border-white bg-white text-black"
                : "border-white/15 text-zinc-500"
            }`}
          >
            {i + 1}
          </span>
          <span className={i <= current ? "text-white" : "text-zinc-600"}>{label}</span>
          {i < labels.length - 1 && <span className="mx-1 h-px w-5 bg-white/15" />}
        </div>
      ))}
    </div>
  );
}
