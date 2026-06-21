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
import { getSocket, bookingRoom } from "@/app/lib/socket-client";
import { Loader2, MapPin, Navigation, AlertCircle, Radio, ArrowLeft, Gauge, Crosshair, Clock } from "lucide-react";

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

  // ---- Load the booking (and learn our role) once we're logged in. ----
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not load this trip");
        if (cancelled) return;
        setRole(data.role);
        if (data.vehicle) setTitle(`${data.vehicle.brand} ${data.vehicle.model}`);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this trip");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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

  // Is the live feed "fresh" (a reading in the last 15s, and not stopped)? Drives
  // the status dot. A driver's own feed is "live" whenever they're sharing.
  const ageSec = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;
  const fresh = ageSec !== null && ageSec < 15;
  const live = role === "driver" ? sharing : fresh && !driverStopped;

  // ---------------------------------------------------------------------------
  // Render: loading / not-logged-in / error / the live map.
  // ---------------------------------------------------------------------------
  if (authStatus === "loading" || loading) {
    return (
      <Screen>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="animate-spin text-zinc-600" size={26} />
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
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/80 px-4 py-3 backdrop-blur sm:px-6">
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

        {role === "driver" ? (
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

      {/* The map fills the rest of the screen, with a floating stats card. */}
      <div className="relative flex-1">
        <TripMap position={coords} accuracy={coords?.accuracy ?? null} label={title} />

        {/* Live stats card (only once we have a fix). */}
        {coords && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4">
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
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
            <span className="rounded-full border border-white/10 bg-black/70 px-4 py-2 text-center text-xs text-zinc-300 backdrop-blur">
              {role === "driver"
                ? "Tap “Share my location” to start the live trip."
                : "Waiting for the driver to start sharing their location…"}
            </span>
          </div>
        )}

        {/* Non-fatal errors (e.g. permission denied) shown without hiding the map. */}
        {error && (
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
            <span className="rounded-full border border-red-500/30 bg-red-500/15 px-4 py-2 text-xs text-red-200 backdrop-blur">
              {error}
            </span>
          </div>
        )}
      </div>
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
