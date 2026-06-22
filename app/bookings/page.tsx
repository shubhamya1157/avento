// ===========================================================================
// bookings/page.tsx — The "/bookings" page: the logged-in user's reservations
// ===========================================================================
//
// Folder name "bookings" -> this page lives at the web address "/bookings".
//
// This page has three possible states it shows the user:
//   1. Loading       — while we check the session / fetch data.
//   2. Not logged in — a "Sign In Required" prompt with a login button.
//   3. Logged in     — the list of their bookings, each cancellable.
//
// A "session" is the website remembering WHO is logged in right now (like a
// wristband at an event that proves you already paid to get in).
// `useSession()` is a hook (a "use..." helper) that reads that login info and
// gives us `status`, which is one of "loading", "authenticated" (logged in), or
// "unauthenticated" (logged out). We branch on it to decide what to render.
//
// This page also talks to "API routes" — these are small server addresses (like
// /api/bookings) that THIS app provides to fetch or change data behind the
// scenes. The browser asks them for data; they reply, usually in JSON (a plain
// text format for sending structured data, made of the same { } objects and
// [ ] lists you see in the code).
// ===========================================================================

// Runs in the browser (needs state, clicks, and login info). See note above.
'use client';

// useState = remembered values; useEffect = run code at certain moments (e.g.
// right after the page appears). Both are React hooks.
import { useState, useEffect } from "react";
import Link from "next/link";
// useSession reads the current login/session info (from the next-auth library).
import { useSession } from "next-auth/react";
import Nav from "@/app/component/Nav";
import Footer from "@/app/component/Footer";
// AuthModal = the pop-up login/signup window shown when a guest must sign in.
import AuthModal from "@/app/component/AuthModal";
// The little "rate this ride" widget shown on each non-cancelled booking.
import ReviewControl from "@/app/component/ReviewControl";
// "import type" brings in only a TYPE description (the shape of a Booking), used
// by TypeScript to check our data. It vanishes when the app actually runs.
import type { Booking } from "@/app/lib/types";
// The live chat panel for talking to the vehicle's owner about a booking.
import BookingChat from "@/app/component/BookingChat";
// The live video call / KYC panel for the same booking.
import VideoCall from "@/app/component/VideoCall";
import { Calendar, Clock, AlertCircle, Trash2, Loader2, CheckCircle2, XCircle, MessageSquare, Video, Navigation, MapPin, Flag, Hourglass, Ban, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// Shared Razorpay browser helpers — the same ones the booking popup and the ride
// wizard use, so the "Pay now" button here behaves identically to the rest.
import { razorpayEnabled, loadRazorpayScript } from "@/app/lib/razorpay-client";

// Helper: turn a stored date string into a friendly label like "Jun 16, 2026".
//   - Input: dateString, a date written as text (e.g. "2026-06-16").
//   - Output: a nicely formatted, human-readable date string.
// new Date(...) turns the text into a real date the computer understands, and
// toLocaleDateString formats that date using the options we pass (US style,
// short month name, etc.).
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Helper: count how many days a booking spans (used to show "3 days").
//   - Inputs: start and end dates (as text).
//   - Output: the number of days between them, rounded up.
// Computers measure time in milliseconds. .getTime() gives each date as a count
// of milliseconds; we subtract to get the gap, Math.abs makes it positive (never
// negative), and dividing by (1000*60*60*24) converts milliseconds -> days.
// Math.ceil rounds UP so even a partial day counts as a full day.
function getDaysCount(start: string, end: string) {
  const diff = Math.abs(new Date(end).getTime() - new Date(start).getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function BookingsPage() {
  // useSession() hands back an object; we pull two fields out of it. The
  // "data: session" part renames `data` to the friendlier name `session`.
  // `status` tells us the login state; `session` holds the user's info.
  const { data: session, status } = useSession();

  // The user's bookings, plus flags for our different on-screen states.
  // useState<Booking[]>([]) means: this remembers a LIST of Bookings, starting
  // empty ([]). "Booking[]" is TypeScript for "an array of Booking items".
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadedForSession, setLoadedForSession] = useState(false); // first fetch done?
  const [cancellingId, setCancellingId] = useState<string | null>(null); // which booking is mid-cancel
  const [completingId, setCompletingId] = useState<string | null>(null); // which ride is mid-complete
  const [payingId, setPayingId] = useState<string | null>(null); // which accepted booking is mid-payment
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false); // login popup open?
  // The booking whose chat panel is open (null = no chat showing).
  const [chat, setChat] = useState<{ id: string; title: string } | null>(null);
  // The booking whose video call is open (null = no call showing).
  const [call, setCall] = useState<{ id: string; title: string } | null>(null);

  // useEffect lets us run some code AFTER the page draws, and again whenever a
  // value we depend on changes. The list at the very end — [status] — is the
  // "watch list": React re-runs this block each time `status` changes. (An empty
  // [] would mean "run only once"; no list would mean "run after every redraw".)
  //
  // Here: fetch the user's bookings once they're logged in.
  useEffect(() => {
    if (status !== "authenticated") return; // only fetch when logged in

    // `cancelled` guards against a subtle bug: if the user navigates away while
    // the fetch is still in flight, we must NOT call setState afterward (React
    // would warn). The cleanup function at the bottom flips this to true.
    let cancelled = false;

    // An immediately-invoked async function: we define a little async function
    // and call it right away with the "(...)()" at the end. (useEffect itself
    // can't be async, so this is the standard way to use await inside it.)
    (async () => {
      // "try { ... } catch { ... }" = attempt the risky stuff; if anything goes
      // wrong (e.g. no internet), jump to catch instead of crashing the page.
      try {
        // fetch(...) asks our server's /api/bookings address for this user's
        // bookings; await pauses until the reply arrives. res is the response.
        const res = await fetch("/api/bookings");
        // res.ok is true for a successful reply. "!res.ok" = NOT ok, so we throw
        // an error (which sends us down to the catch block below).
        if (!res.ok) throw new Error("Failed to load booking details");
        // The reply body is text in JSON form; res.json() turns it back into
        // real JavaScript data (here, the array of bookings).
        const data = await res.json();
        if (!cancelled) setBookings(data); // save them into state -> redraw
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load bookings");
        }
      } finally {
        // "finally" always runs at the end, whether it succeeded or failed.
        // Either way, the first fetch attempt is now finished.
        if (!cancelled) setLoadedForSession(true);
      }
    })();

    // Cleanup: runs if the component unmounts or the effect re-runs. It marks
    // the in-flight request as stale so its result is ignored.
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Re-fetch the bookings after a change (e.g. right after a cancellation) so
  // the list reflects the latest data. Same fetch-then-json steps as above.
  //   - Input: none.  Output: none (it just updates the bookings state).
  const refreshBookings = async () => {
    try {
      const res = await fetch("/api/bookings");
      if (!res.ok) throw new Error("Failed to load booking details");
      setBookings(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookings");
    }
  };

  // Cancel one booking. We first ask for confirmation, then PATCH the API, then
  // refresh the list. `cancellingId` lets us show a spinner on just that row.
  //   - Input: bookingId, the unique id of the booking the user wants to cancel.
  //   - Output: none returned; it updates the server and our on-screen state.
  const handleCancelBooking = async (bookingId: string) => {
    // confirm() shows a built-in browser yes/no dialog; false = user clicked No.
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    setCancellingId(bookingId);
    setError(null);

    try {
      // This fetch SENDS data, not just reads it. The second argument is an
      // options bundle:
      //   method "PATCH" = partially update an existing booking (vs GET = read).
      //   headers       = a note telling the server the body is JSON text.
      //   body          = the actual data we send. JSON.stringify turns our
      //                   object { status: "cancelled" } into JSON text, since
      //                   the network can only carry text, not live objects.
      // The backticks `.../${bookingId}` slot this booking's id into the URL.
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH", // PATCH = partially update an existing booking
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      const data = await res.json(); // read the server's reply back into data
      // If the server reported a problem, show its message (or a fallback).
      // "a || b" means "use a, but if a is empty/missing, use b instead".
      if (!res.ok) throw new Error(data.message || "Failed to cancel booking");

      refreshBookings(); // success -> reload the list so the row updates
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while cancelling");
    } finally {
      setCancellingId(null);
    }
  };

  // Mark a RIDE as completed (shown only on rides). Same PATCH pattern as cancel,
  // but sends status "completed". Either party to the ride may do this, so it's
  // handy once the rider has been dropped off.
  //   - Input: bookingId, the ride's id.  Output: none (updates server + state).
  const handleCompleteRide = async (bookingId: string) => {
    setCompletingId(bookingId);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to complete ride");
      refreshBookings(); // success -> reload so the row shows "Completed"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCompletingId(null);
    }
  };

  // Pay for an ACCEPTED booking (the "pay after the owner accepts" step). In the
  // new request flow no money is taken up front: the customer sends a request,
  // the owner accepts, and only THEN does this button appear so they can pay.
  //   - With Razorpay configured: create an order for this booking, open the
  //     checkout popup, then verify the payment on our server.
  //   - In demo mode (no keys): just PATCH the booking to "confirmed".
  // Either way the booking moves accepted -> confirmed and the list refreshes.
  //   - Input: the booking to pay for.  Output: none (updates server + state).
  const handlePay = async (booking: Booking) => {
    setPayingId(booking._id);
    setError(null);

    try {
      // --- Demo mode: no real payment gateway, so just confirm the booking. ---
      if (!razorpayEnabled) {
        const res = await fetch(`/api/bookings/${booking._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "confirmed" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not confirm booking");
        await refreshBookings();
        setPayingId(null);
        return;
      }

      // --- Real payment: ask our server to create a Razorpay order for THIS
      //     booking (it prices from the stored, server-computed amount). ---
      const orderRes = await fetch("/api/payment/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking._id }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.message || "Could not start payment");

      // Make sure Razorpay's checkout script is on the page (no-op if loaded).
      const ready = await loadRazorpayScript();
      if (!ready || !window.Razorpay) {
        throw new Error("Could not load the payment gateway. Check your connection.");
      }

      const vehicle = booking.vehicleId;
      const razorpay = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "Avento",
        description: vehicle ? `${vehicle.brand} ${vehicle.model}` : "Avento booking",
        prefill: {
          name: session?.user?.name || "",
          email: session?.user?.email || "",
        },
        theme: { color: "#ffffff" },
        // Razorpay calls this AFTER a successful payment; we verify it server-side
        // and, on success, the server flips the booking to "confirmed".
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              // Send Razorpay's signed result PLUS the booking id so the server
              // knows which accepted booking to confirm.
              body: JSON.stringify({ ...response, bookingId: booking._id }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.message || "Payment could not be verified");
            await refreshBookings();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed.");
          } finally {
            setPayingId(null);
          }
        },
        modal: {
          // If they close the popup without paying, re-enable the button.
          ondismiss: () => {
            setPayingId(null);
            setError("Payment cancelled — you can try again whenever you're ready.");
          },
        },
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while paying");
      setPayingId(null);
    }
  };

  // We're "loading" while the session is still being checked, OR while logged in
  // but the first bookings fetch hasn't finished yet. "||" means OR (either side
  // true makes it true); "&&" means AND (both sides must be true).
  const isLoading = status === "loading" || (status === "authenticated" && !loadedForSession);

  // STATE 1: still loading — show a centered spinner and nothing else.
  // Returning early here means the rest of the function below never runs while
  // we're loading. Loader2 with "animate-spin" is just a spinning circle icon.
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
        <div className="mx-auto max-w-5xl">
          {/* STATE 2 vs STATE 3 chosen by a ternary (condition ? A : B). If the
              user is logged out, show the sign-in prompt (A); otherwise show
              their bookings dashboard (B, far below after the ":"). */}
          {/* STATE 2: not logged in — show a sign-in prompt instead of bookings. */}
          {status === "unauthenticated" ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-zinc-900/15 py-24 text-center backdrop-blur-md">
              <Calendar size={48} className="mb-6 text-zinc-600" />
              <h2 className="text-2xl font-black tracking-wide text-white">Sign In Required</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
                Log in to view your booking history and manage active reservations.
              </p>
              {/* Clicking sets authOpen to true, which makes the login pop-up
                  (the AuthModal near the bottom of the file) appear. */}
              <button
                onClick={() => setAuthOpen(true)}
                className="mt-8 cursor-pointer rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition hover:scale-105 active:scale-95"
              >
                Log In
              </button>
            </div>
          ) : (
            // STATE 3: logged in — header, optional error, then the bookings.
            <div className="space-y-12">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.5em] text-zinc-500">Dashboard</span>
                  <h1 className="text-4xl font-black tracking-wide">MY BOOKINGS</h1>
                </div>
                <div className="rounded-full border border-white/10 bg-zinc-900/60 px-4 py-2 text-xs font-semibold text-zinc-400">
                  Logged in as: <span className="text-white">{session?.user?.email}</span>
                </div>
              </div>

              {/* "error && (...)" shows this red banner ONLY when `error` holds
                  a message; if error is null, nothing appears here. */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* No bookings yet -> a prompt to browse the fleet. Otherwise,
                  loop over the bookings and render a card for each one. */}
              {bookings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-900/5 py-24 text-center">
                  <Calendar size={36} className="mx-auto mb-4 text-zinc-600" />
                  <p className="text-sm font-medium text-zinc-400">You have no bookings yet.</p>
                  <Link
                    href="/vehicles"
                    className="mt-6 inline-block rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"
                  >
                    Browse Our Fleet
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {/* Loop over the bookings and draw one card per booking.
                        `booking` is the current item each time around. */}
                    {bookings.map((booking) => {
                      // Pre-compute a few values used in this card's markup, so
                      // the JSX below stays clean and easy to read.
                      const isRide = booking.kind === "ride"; // ride vs rental
                      const isCancelled = booking.status === "cancelled";
                      const isCompleted = booking.status === "completed";
                      // The new request-loop states: waiting on the owner,
                      // accepted (ready to pay), or declined by the owner.
                      const isRequested = booking.status === "requested";
                      const isAccepted = booking.status === "accepted";
                      const isRejected = booking.status === "rejected";
                      // "Live" = the booking has actually been paid/locked in or
                      // is in progress, i.e. the customer is using (or used) the
                      // vehicle. Only then do chat/track/review/complete apply.
                      const isLive =
                        booking.status === "confirmed" ||
                        booking.status === "ongoing" ||
                        isCompleted;
                      const vehicle = booking.vehicleId; // may be null (see types)
                      // Rentals have a date range; rides don't, so only compute
                      // the day count for rentals (and guard the optional dates).
                      const days =
                        !isRide && booking.startDate && booking.endDate
                          ? getDaysCount(booking.startDate, booking.endDate)
                          : 0;

                      return (
                        <motion.div
                          key={booking._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="flex flex-col items-center gap-6 overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/60 p-6 md:flex-row"
                        >
                          <div className="h-36 w-full shrink-0 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 md:w-56">
                            {/* If we have the vehicle's details, show its photo;
                                otherwise (the ":" branch) show a placeholder. */}
                            {vehicle ? (
                              <img
                                src={vehicle.image}
                                alt={`${vehicle.brand} ${vehicle.model}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-zinc-600">
                                No Vehicle Data
                              </div>
                            )}
                          </div>

                          <div className="w-full flex-1 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                  {isRide ? "Ride" : "Reservation"}
                                </span>
                                <h3 className="mt-0.5 text-xl font-bold text-white">
                                  {vehicle ? `${vehicle.brand} ${vehicle.model}` : "Unknown Vehicle"}
                                </h3>
                              </div>

                              {/* Status badge — its colour and label depend on the
                                  booking's status. The request loop adds three
                                  new states up front: requested (waiting on the
                                  owner, amber), accepted (ready to pay, sky), and
                                  rejected (declined, red). */}
                              {isRequested ? (
                                <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
                                  <Hourglass size={12} /> Waiting for approval
                                </span>
                              ) : isAccepted ? (
                                <span className="flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400">
                                  <CheckCircle2 size={12} /> Accepted — pay now
                                </span>
                              ) : isRejected ? (
                                <span className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400">
                                  <Ban size={12} /> Declined
                                </span>
                              ) : isCancelled ? (
                                <span className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400">
                                  <XCircle size={12} /> Cancelled
                                </span>
                              ) : isCompleted ? (
                                <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                                  <Flag size={12} /> Completed
                                </span>
                              ) : booking.status === "ongoing" ? (
                                <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                                  <Navigation size={12} /> On the way
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                                  <CheckCircle2 size={12} /> Confirmed
                                </span>
                              )}
                            </div>

                            {/* The middle details row differs by kind: a ride
                                shows its route + distance + fare; a rental shows
                                its dates + duration + cost. */}
                            {isRide ? (
                              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-xs text-zinc-400 sm:grid-cols-4">
                                <div className="space-y-1 sm:col-span-2">
                                  <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Route</span>
                                  <span className="flex items-start gap-1.5 font-semibold text-zinc-200">
                                    <MapPin size={12} className="mt-0.5 shrink-0" />
                                    <span className="line-clamp-2">
                                      {booking.pickup?.address ?? "—"} → {booking.drop?.address ?? "—"}
                                    </span>
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Distance</span>
                                  <span className="flex items-center gap-1 font-semibold text-zinc-200">
                                    <Navigation size={12} /> {booking.distanceKm ?? 0} km
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Fare</span>
                                  <span className="font-semibold text-zinc-200">₹{booking.totalAmount}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-xs text-zinc-400 sm:grid-cols-4">
                                <div className="space-y-1">
                                  <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Dates</span>
                                  <span className="font-semibold text-zinc-200">
                                    {formatDate(booking.startDate!)} - {formatDate(booking.endDate!)}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Duration</span>
                                  <span className="flex items-center gap-1 font-semibold text-zinc-200">
                                    {/* Show "1 day" but "3 days": a tiny ternary
                                        picks the singular or plural word. */}
                                    <Clock size={12} /> {days} {days === 1 ? "day" : "days"}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Cost</span>
                                  <span className="font-semibold text-zinc-200">₹{booking.totalAmount}</span>
                                </div>
                                <div className="space-y-1">
                                  <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Booked On</span>
                                  <span className="font-semibold text-zinc-200">{formatDate(booking.createdAt)}</span>
                                </div>
                              </div>
                            )}

                            {/* If the owner declined, show their reason (if any)
                                so the customer understands why. */}
                            {isRejected && booking.decisionNote && (
                              <p className="flex items-start gap-2 rounded-xl border border-red-500/15 bg-red-500/5 p-3 text-xs text-red-300">
                                <Ban size={13} className="mt-0.5 shrink-0" />
                                <span>{booking.decisionNote}</span>
                              </p>
                            )}

                            {/* Let the user rate a ride they actually took. Only
                                shown once the booking is LIVE (confirmed/ongoing/
                                completed) and the vehicle is still known (we need
                                its id to post the review) — you can't review a
                                booking that's only been requested or was declined. */}
                            {isLive && vehicle && (
                              <ReviewControl
                                vehicleId={vehicle._id}
                                vehicleName={`${vehicle.brand} ${vehicle.model}`}
                              />
                            )}
                          </div>

                          {/* Action buttons. Which ones show depends on the
                              booking's stage in the request loop. */}
                          <div className="flex w-full shrink-0 flex-col gap-3 md:w-auto">
                            {/* "Pay now" — the headline action once the owner has
                                ACCEPTED. Opens Razorpay (or demo-confirms) and
                                moves the booking accepted -> confirmed. */}
                            {isAccepted && (
                              <button
                                onClick={() => handlePay(booking)}
                                disabled={payingId === booking._id}
                                className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-bold text-black transition hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
                              >
                                {payingId === booking._id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <CreditCard size={14} />
                                )}
                                {razorpayEnabled ? `Pay ₹${booking.totalAmount}` : "Confirm booking"}
                              </button>
                            )}

                            {/* "Message" / "Video" — talk to the owner. Useful from
                                the moment a request is sent right through the trip,
                                so we show them unless it was declined or called off. */}
                            {!isRejected && !isCancelled && (
                              <>
                                <button
                                  onClick={() =>
                                    setChat({
                                      id: booking._id,
                                      title: vehicle ? `${vehicle.brand} ${vehicle.model}` : "Booking",
                                    })
                                  }
                                  className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-zinc-200 transition hover:bg-white/10 active:scale-95"
                                >
                                  <MessageSquare size={14} /> Message
                                </button>

                                <button
                                  onClick={() =>
                                    setCall({
                                      id: booking._id,
                                      title: vehicle ? `${vehicle.brand} ${vehicle.model}` : "Booking",
                                    })
                                  }
                                  className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-zinc-200 transition hover:bg-white/10 active:scale-95"
                                >
                                  <Video size={14} /> Video
                                </button>
                              </>
                            )}

                            {/* "Track trip" — only meaningful once the booking is
                                LIVE (paid/in-progress), so hidden while it's still
                                just a request or was declined. */}
                            {isLive && (
                              <Link
                                href={`/trip/${booking._id}`}
                                className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-zinc-200 transition hover:bg-white/10 active:scale-95"
                              >
                                <Navigation size={14} /> Track trip
                              </Link>
                            )}

                            {/* "Complete ride" — only on rides that are still
                                active. Marks the ride finished once the rider has
                                been dropped off (then it becomes reviewable). */}
                            {isRide && isLive && !isCompleted && (
                              <button
                                onClick={() => handleCompleteRide(booking._id)}
                                disabled={completingId === booking._id}
                                className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-bold text-black transition hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
                              >
                                {completingId === booking._id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Flag size={14} />
                                )}
                                Complete ride
                              </button>
                            )}

                            {/* Withdraw / cancel THIS booking. The booker may back
                                out at any pre-completion stage (a pending request,
                                an accepted-but-unpaid booking, or a confirmed one).
                                Hidden once it's already declined, cancelled, or a
                                ride has completed. The label reads "Withdraw" while
                                it's still just a request, else "Cancel". */}
                            {!isRejected && !isCancelled && !isCompleted && (
                              <button
                                onClick={() => handleCancelBooking(booking._id)}
                                disabled={cancellingId === booking._id}
                                className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-3 text-xs font-bold text-red-400 transition hover:bg-red-500/10 active:scale-95 disabled:opacity-50"
                              >
                                {/* While cancelling this row, show a spinning
                                    loader; otherwise show a trash-can icon. */}
                                {cancellingId === booking._id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                                {isRequested ? "Withdraw request" : "Cancel booking"}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* The login pop-up. "open" controls whether it's visible (driven by our
          authOpen state); "onClose" lets it tell us to hide it again. These are
          props — settings we pass into the AuthModal component. */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="login" />

      {/* The live chat panel, shown when "Message" was clicked on a booking. */}
      {chat && (
        <BookingChat bookingId={chat.id} title={chat.title} onClose={() => setChat(null)} />
      )}

      {/* The live video call panel, shown when "Video" was clicked on a booking. */}
      {call && (
        <VideoCall bookingId={call.id} title={call.title} onClose={() => setCall(null)} />
      )}
      <Footer />
    </>
  );
}
