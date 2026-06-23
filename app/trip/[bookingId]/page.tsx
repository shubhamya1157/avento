// ===========================================================================
// trip/[bookingId]/page.tsx — Live trip tracking for one booking
// ===========================================================================
//
// Folder "trip/[bookingId]" -> web address "/trip/SOME_BOOKING_ID". The
// "[bookingId]" part is a dynamic segment: whatever id is in the URL is read
// with useParams() below.
//
// TWO ROLES share this one page (the server tells us which we are):
//   - DRIVER    (the vehicle's owner, or an admin): sees a "Share my location"
//               switch. While on, the browser's GPS is read continuously and
//               each new position is sent to the booking's room over Socket.io.
//   - PASSENGER (the person who booked): joins the room and watches the marker
//               move on the map as the driver's positions arrive.
//
// The map itself lives in <TripMap>; this page handles data, the live location
// plumbing, and the on-screen stats. Reading the booking is permission-checked
// on the server (only the two parties / an admin may open it).
// ===========================================================================

'use client';

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Nav from "@/app/component/Nav";
import Footer from "@/app/component/Footer";
import TripMap from "@/app/component/TripMap";
import BookingChat from "@/app/component/BookingChat";
import VideoCall from "@/app/component/VideoCall";
import { getSocket, bookingRoom } from "@/app/lib/socket-client";
import { Loader2, MapPin, Navigation, AlertCircle, Radio, ArrowLeft, Gauge, Crosshair, Clock, MessageSquare, Video, Flag, Key, Check, CheckCircle2, Shield, User } from "lucide-react";

// A single live reading from the driver's device. lat/lng are required; accuracy
// (metres) and speed (m/s) are sent when the device provides them.
type Coords = { lat: number; lng: number; accuracy?: number; speed?: number | null };

export default function TripPage() {
  // Read the booking id out of the URL ("/trip/<id>").
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;

  const { status: authStatus } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("Your trip");
  const [role, setRole] = useState<"driver" | "passenger" | null>(null);

  // New States for rich ride dashboard
  const [booking, setBooking] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [completing, setCompleting] = useState(false);

  // The latest known vehicle reading (null until the first fix arrives), plus
  // WHEN it arrived (epoch ms) so we can show a live "updated Ns ago".
  const [coords, setCoords] = useState<Coords | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  // A 1-second ticker so the "Ns ago" label stays current without new data.
  const [now, setNow] = useState(() => Date.now());

  // Driver-only: whether we're currently broadcasting our GPS.
  const [sharing, setSharing] = useState(false);
  // Passenger-only: the driver explicitly stopped sharing.
  const [driverStopped, setDriverStopped] = useState(false);
  // The id returned by watchPosition, so we can stop watching later.
  const watchIdRef = useRef<number | null>(null);

  // Record a new reading from either source (our own GPS, or the socket).
  const applyReading = (c: Coords) => {
    setCoords(c);
    setUpdatedAt(Date.now());
    setDriverStopped(false); // a fresh reading means sharing has (re)started
  };

  // ---- Tick once a second so relative times stay fresh. ----
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ---- Load the booking details & vehicle ----
  const refreshBooking = async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const data = await res.json();
      if (res.ok) {
        setBooking(data.booking);
        setVehicle(data.vehicle);
        setRole(data.role);
        if (data.vehicle) setTitle(`${data.vehicle.brand} ${data.vehicle.model}`);
      } else {
        throw new Error(data.message || "Failed to load trip details");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trip details");
    }
  };

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    setLoading(true);
    refreshBooking().finally(() => setLoading(false));
  }, [authStatus, bookingId]);

  // ---- PASSENGER: join the room and listen for the driver's positions. ----
  useEffect(() => {
    if (role !== "passenger") return;

    const socket = getSocket();
    const room = bookingRoom(bookingId);
    socket.emit("join", room);
    const onLocation = (c: Coords) => applyReading(c);
    const onStop = () => setDriverStopped(true);
    socket.on("trip:location", onLocation);
    socket.on("trip:stop", onStop);

    return () => {
      socket.off("trip:location", onLocation);
      socket.off("trip:stop", onStop);
      socket.emit("leave", room);
    };
  }, [role, bookingId]);

  // ---- DRIVER: start/stop sharing GPS. ----
  const toggleSharing = () => {
    const socket = getSocket();
    const room = bookingRoom(bookingId);

    // Turn sharing OFF.
    if (sharing) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      socket.emit("trip:stop", room); // let the passenger know immediately
      setSharing(false);
      return;
    }

    // Turn sharing ON: the browser asks permission, then calls us with each new
    // position. We show it on our own map AND relay it to the passenger's room.
    if (!("geolocation" in navigator)) {
      setError("This device can't share location.");
      return;
    }
    setError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const c: Coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
        };
        applyReading(c);
        socket.emit("trip:location", { room, coords: c });
      },
      (err) => setError(err.message || "Couldn't read your location"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    setSharing(true);
  };

  // Stop watching GPS — and tell the passenger — if the driver leaves mid-share.
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        getSocket().emit("trip:stop", bookingRoom(bookingId));
      }
    };
  }, [bookingId]);

  // ---- OTP verification (Driver starts the ride) ----
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) return;

    setVerifying(true);
    setOtpError(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ongoing", otp: otpInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to verify OTP");
      
      setOtpInput("");
      await refreshBooking();
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Invalid OTP. Please check code.");
    } finally {
      setVerifying(false);
    }
  };

  // ---- Complete the ride ----
  const handleCompleteRide = async () => {
    if (!confirm("Are you sure you want to mark this ride as completed?")) return;

    setCompleting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to complete ride");
      await refreshBooking();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to complete ride");
    } finally {
      setCompleting(false);
    }
  };

  // Is the live feed "fresh" (a reading in the last 15s, and not stopped)? Drives
  // the status dot. A driver's own feed is "live" whenever they're sharing.
  const ageSec = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;
  const fresh = ageSec !== null && ageSec < 15;
  const live = role === "driver" ? sharing : fresh && !driverStopped;

  // ---------------------------------------------------------------------------
  // Render: loading / not-logged-in / error / the split dashboard & map.
  // ---------------------------------------------------------------------------
  if (authStatus === "loading" || loading) {
    return (
      <Screen>
        <div className="flex flex-1 items-center justify-center bg-black min-h-[50vh]">
          <Loader2 className="animate-spin text-zinc-500" size={32} />
        </div>
      </Screen>
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <Screen>
        <Centered icon={<MapPin size={26} className="text-zinc-500" />} title="Sign in required">
          Please sign in to view this trip.{" "}
          <Link href="/" className="underline">Go home</Link>
        </Centered>
      </Screen>
    );
  }

  if (error && !coords) {
    return (
      <Screen>
        <Centered icon={<AlertCircle size={26} className="text-red-400" />} title="Can't open trip">
          {error}
        </Centered>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Header strip: back link, trip title, and the live status / share toggle. */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/80 px-4 py-3 backdrop-blur sm:px-6 z-20 relative">
        <div className="flex items-center gap-3">
          <Link
            href="/bookings"
            aria-label="Back to bookings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-white/20 to-white/5 text-white">
            <Navigation size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">{title}</h1>
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500">
              <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-400" : "bg-zinc-600"}`} />
              {live ? "Live trip" : "Trip"}
            </p>
          </div>
        </div>

        {role === "driver" && booking?.status === "ongoing" ? (
          <button
            onClick={toggleSharing}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold shadow-lg transition active:scale-95 ${
              sharing
                ? "bg-emerald-500 text-black shadow-emerald-500/20"
                : "bg-white text-black hover:scale-105"
            }`}
          >
            <Radio size={14} className={sharing ? "animate-pulse" : ""} />
            {sharing ? "Sharing live" : "Share my location"}
          </button>
        ) : (
          <span className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            live ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/5 text-zinc-400"
          }`}>
            <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-emerald-400" : "bg-zinc-600"}`} />
            {live ? "Live" : driverStopped ? "Driver paused" : "Waiting for driver"}
          </span>
        )}
      </div>

      {/* Split Layout: Dashboard Panel on Left, Map on Right */}
      <div className="relative flex flex-1 flex-col md:flex-row overflow-hidden min-h-[calc(100vh-8.5rem)]">
        
        {/* Left Side Dashboard Panel */}
        <div className="w-full md:w-[380px] bg-zinc-950/90 border-b md:border-b-0 md:border-r border-white/10 p-5 overflow-y-auto z-10 flex flex-col justify-between shrink-0 space-y-6">
          <div className="space-y-6">
            {/* Vehicle Card */}
            {vehicle && (
              <div className="space-y-3">
                <div className="h-40 w-full overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 shadow-inner">
                  <img src={vehicle.image} alt={title} className="h-full w-full object-cover" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {booking?.kind === "ride" ? "Ride Hailing" : "Rental Reservation"}
                  </span>
                  <h2 className="text-lg font-black text-white">{title}</h2>
                  <p className="text-xs capitalize text-zinc-400">
                    {vehicle.type} • {vehicle.transmission} • {vehicle.fuel}
                  </p>
                </div>
              </div>
            )}

            {/* Ride Details (Pickup / Drop / Distance) */}
            {booking && booking.kind === "ride" && (
              <div className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Route details</h3>
                <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                  {/* Pickup */}
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <MapPin size={10} />
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Pickup Location</span>
                    <span className="block text-xs font-semibold text-zinc-200">{booking.pickup?.address}</span>
                  </div>
                  {/* Drop */}
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                      <Flag size={10} />
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Drop Location</span>
                    <span className="block text-xs font-semibold text-zinc-200">{booking.drop?.address}</span>
                  </div>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-3 text-[11px] text-zinc-400">
                  <span>Distance: <strong className="text-white">{booking.distanceKm} km</strong></span>
                  <span>Fare: <strong className="text-white">₹{booking.totalAmount}</strong></span>
                </div>
              </div>
            )}

            {/* Chat & Call Controls */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setChatOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-zinc-200 transition hover:bg-white/10 active:scale-95 cursor-pointer"
              >
                <MessageSquare size={13} /> Message
              </button>
              <button
                onClick={() => setCallOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-zinc-200 transition hover:bg-white/10 active:scale-95 cursor-pointer"
              >
                <Video size={13} /> Video Call
              </button>
            </div>

            {/* OTP and Ride Status Management */}
            {booking && (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Ride verification</h3>
                
                {/* Requested */}
                {booking.status === "requested" && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-400">
                      Awaiting Approval
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {role === "driver"
                        ? "This request is pending your decision. Please go to your Partner dashboard to approve or decline."
                        : "Your ride request has been sent to the driver. Please wait for them to approve."}
                    </p>
                  </div>
                )}

                {/* Accepted */}
                {booking.status === "accepted" && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-400">
                      Approved
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {role === "driver"
                        ? "You accepted this request. Waiting for the passenger to complete the payment."
                        : "Your ride is approved! Please go to My Bookings and complete the payment to proceed."}
                    </p>
                  </div>
                )}

                {/* Confirmed - Start ride / OTP verification */}
                {booking.status === "confirmed" && booking.kind === "ride" && (
                  <div className="space-y-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Ready for Pickup
                    </span>
                    
                    {role === "passenger" ? (
                      <div className="rounded-xl bg-white/5 border border-white/5 p-4 space-y-1 text-center shadow-inner">
                        <span className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Provide OTP to Driver</span>
                        <div className="text-3xl font-black tracking-[0.2em] text-emerald-400 py-1">{booking.rideOtp}</div>
                        <span className="block text-[9px] text-zinc-500 leading-normal">
                          Ask your driver to start the ride by sharing this secure 4-digit code.
                        </span>
                      </div>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-3">
                        <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Enter Passenger OTP</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="OTP"
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            className="flex-1 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-center text-lg font-black tracking-[0.3em] text-white outline-none focus:border-white/30"
                          />
                          <button
                            type="submit"
                            disabled={verifying || otpInput.length !== 4}
                            className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-zinc-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
                          >
                            {verifying ? "Verifying..." : "Verify & Start"}
                          </button>
                        </div>
                        {otpError && <p className="text-[11px] text-red-400 font-semibold">{otpError}</p>}
                      </form>
                    )}
                  </div>
                )}

                {/* Ongoing */}
                {booking.status === "ongoing" && (
                  <div className="space-y-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400 animate-pulse">
                      Trip in Progress
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {role === "driver"
                        ? "You are currently driving. Please make sure location sharing is enabled so the passenger can track you."
                        : "Your trip is in progress. You can view the live location of the vehicle on the map."}
                    </p>
                    {role === "driver" && (
                      <button
                        onClick={handleCompleteRide}
                        disabled={completing}
                        className="w-full rounded-xl bg-white py-3 text-xs font-bold text-black transition hover:bg-zinc-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {completing ? "Completing trip..." : "Complete Ride"}
                      </button>
                    )}
                  </div>
                )}

                {/* Completed */}
                {booking.status === "completed" && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Trip Completed
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      This ride has been completed. Thank you for riding with Avento!
                    </p>
                  </div>
                )}

                {/* Cancelled */}
                {booking.status === "cancelled" && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-red-400">
                      Cancelled
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      This ride was cancelled.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Info text at the bottom */}
          <div className="text-[10px] text-zinc-600 leading-relaxed pt-4 border-t border-white/5">
            Having trouble? Contact support or initiate a chat/video call directly with the {role === "driver" ? "passenger" : "driver"}.
          </div>
        </div>

        {/* Right Side Map panel */}
        <div className="relative flex-1 h-[50vh] md:h-auto z-0">
          <TripMap position={coords} accuracy={coords?.accuracy ?? null} label={title} />

          {/* Live stats card (only once we have a fix). */}
          {coords && (
            <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4 z-10">
              <div className="pointer-events-auto flex items-center gap-5 rounded-2xl border border-white/10 bg-zinc-950/85 px-5 py-3 text-xs text-zinc-300 shadow-2xl backdrop-blur">
                <Stat icon={<Clock size={13} />} label="Updated">
                  {ageSec === null ? "—" : ageSec < 2 ? "just now" : `${ageSec}s ago`}
                </Stat>
                <span className="h-6 w-px bg-white/10" />
                <Stat icon={<Gauge size={13} />} label="Speed">
                  {coords.speed != null && coords.speed >= 0
                    ? `${Math.round(coords.speed * 3.6)} km/h`
                    : "—"}
                </Stat>
                <span className="h-6 w-px bg-white/10" />
                <Stat icon={<Crosshair size={13} />} label="Accuracy">
                  {coords.accuracy ? `±${Math.round(coords.accuracy)} m` : "—"}
                </Stat>
              </div>
            </div>
          )}

          {/* Empty state hint before the first fix. */}
          {!coords && (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 z-10">
              <span className="rounded-full border border-white/10 bg-black/70 px-4 py-2 text-center text-xs text-zinc-300 backdrop-blur">
                {role === "driver"
                  ? booking?.status === "ongoing"
                    ? "Tap “Share my location” to start the live trip tracking."
                    : "Verify OTP and start the trip to enable location sharing."
                  : "Waiting for the driver to start sharing their location…"}
              </span>
            </div>
          )}

          {/* Non-fatal errors (e.g. permission denied) shown without hiding the map. */}
          {error && (
            <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4 z-10">
              <span className="rounded-full border border-red-500/30 bg-red-500/15 px-4 py-2 text-xs text-red-200 backdrop-blur">
                {error}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Live Chat Panel overlay */}
      {chatOpen && (
        <BookingChat bookingId={bookingId} title={title} onClose={() => setChatOpen(false)} />
      )}

      {/* Live Video Call overlay */}
      {callOpen && (
        <VideoCall bookingId={bookingId} title={title} onClose={() => setCallOpen(false)} />
      )}
    </Screen>
  );
}

// ---- Small layout helpers (keep the main component readable). ----
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="flex min-h-[calc(100vh-4rem)] flex-col bg-black">{children}</main>
      <Footer />
    </>
  );
}

function Stat({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-zinc-500">
        {icon} {label}
      </span>
      <span className="font-bold text-white">{children}</span>
    </div>
  );
}

function Centered({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      {icon}
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="max-w-sm text-sm text-zinc-400">{children}</p>
    </div>
  );
}
