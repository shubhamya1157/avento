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
import { Calendar, Clock, AlertCircle, Trash2, Loader2, CheckCircle2, XCircle, MessageSquare, Video, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
                      const days = getDaysCount(booking.startDate, booking.endDate);
                      const isCancelled = booking.status === "cancelled"; // true/false
                      const vehicle = booking.vehicleId; // may be null (see types)

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
                                  Reservation
                                </span>
                                <h3 className="mt-0.5 text-xl font-bold text-white">
                                  {vehicle ? `${vehicle.brand} ${vehicle.model}` : "Unknown Vehicle"}
                                </h3>
                              </div>

                              {/* Show a red "Cancelled" badge or a green
                                  "Confirmed" badge depending on isCancelled. */}
                              {isCancelled ? (
                                <span className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400">
                                  <XCircle size={12} /> Cancelled
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                                  <CheckCircle2 size={12} /> Confirmed
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-xs text-zinc-400 sm:grid-cols-4">
                              <div className="space-y-1">
                                <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Dates</span>
                                <span className="font-semibold text-zinc-200">
                                  {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
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
                                <span className="font-semibold text-zinc-200">${booking.totalAmount}</span>
                              </div>
                              <div className="space-y-1">
                                <span className="block text-[10px] uppercase tracking-wider text-zinc-500">Booked On</span>
                                <span className="font-semibold text-zinc-200">{formatDate(booking.createdAt)}</span>
                              </div>
                            </div>

                            {/* Let the user rate a ride they actually took. Only
                                shown for non-cancelled bookings whose vehicle is
                                still known (we need its id to post the review). */}
                            {!isCancelled && vehicle && (
                              <ReviewControl
                                vehicleId={vehicle._id}
                                vehicleName={`${vehicle.brand} ${vehicle.model}`}
                              />
                            )}
                          </div>

                          {/* Action buttons. "Message" opens the live chat with
                              the vehicle's owner (always available). "Cancel Ride"
                              only shows while the booking isn't already cancelled. */}
                          <div className="flex w-full shrink-0 flex-col gap-3 md:w-auto">
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

                            {/* "Video" starts a live video call / KYC with the
                                vehicle's owner (always available). */}
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

                            {/* "Track trip" opens the live map for this booking. */}
                            <Link
                              href={`/trip/${booking._id}`}
                              className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-zinc-200 transition hover:bg-white/10 active:scale-95"
                            >
                              <Navigation size={14} /> Track trip
                            </Link>

                            {/* onClick cancels THIS booking by its id. The button
                                disables itself while this exact row is mid-cancel
                                (cancellingId matches its id). */}
                            {!isCancelled && (
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
                                Cancel Ride
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
