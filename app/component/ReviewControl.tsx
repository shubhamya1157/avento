// ===========================================================================
// ReviewControl.tsx — A small "rate this ride" widget for a booked vehicle
// ===========================================================================
//
// This appears on each booking card (see app/bookings/page.tsx). It lets the
// user pick a star rating (1–5), optionally write a short comment, and submit a
// review for that vehicle. It talks to POST /api/reviews, which only allows
// reviews for vehicles you've actually booked — so it's safe to show here.
//
// It's its own component (not inline in the bookings page) so each booking card
// keeps its OWN little bit of state — the stars you're hovering, the comment
// you're typing — without those getting tangled up between cards.
// ===========================================================================

'use client';

import { useState } from "react";
import { Star, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

// The two things this widget needs to know: which vehicle to review, and its
// name (just for a friendly "Thanks for rating the Tesla!" message).
interface ReviewControlProps {
  vehicleId: string;
  vehicleName: string;
}

export default function ReviewControl({ vehicleId, vehicleName }: ReviewControlProps) {
  // `rating` is the chosen number of stars (0 = none picked yet). `hover` is the
  // star currently under the mouse, so we can light up stars up to that point as
  // a preview before the user commits by clicking.
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Once submitted (or if the server says "already reviewed"), we flip this to a
  // short thank-you message and hide the form for good.
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  // ------------------------------------------------------------------------
  // Submit the review to the server.
  // ------------------------------------------------------------------------
  const submitReview = async () => {
    // Must pick at least one star first.
    if (rating < 1) {
      setError("Please pick a star rating first");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId, rating, comment }),
      });
      const data = await res.json();

      if (!res.ok) {
        // The server returns 409 if this user already reviewed this vehicle —
        // treat that as "done" (show the message, hide the form) rather than an
        // error the user can retry.
        if (res.status === 409) {
          setDoneMessage(data.message || "You've already reviewed this vehicle");
          return;
        }
        throw new Error(data.message || "Failed to submit review");
      }

      setDoneMessage(`Thanks for rating the ${vehicleName}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------------
  // Once reviewed, show a compact confirmation instead of the form.
  // ------------------------------------------------------------------------
  if (doneMessage) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs font-semibold text-emerald-400">
        <CheckCircle2 size={14} className="shrink-0" />
        <span>{doneMessage}</span>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // The rating form: a row of 5 clickable stars, an optional comment box, and a
  // submit button.
  // ------------------------------------------------------------------------
  return (
    <div className="space-y-3 rounded-2xl border border-white/5 bg-zinc-900/40 p-4">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        Rate your ride
      </span>

      {/* The five stars. We render an array [1,2,3,4,5] and draw a button for
          each. A star is "filled" when its number is <= the hovered star (live
          preview) or, when not hovering, <= the chosen rating. */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hover || rating);
          return (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="cursor-pointer p-0.5 transition hover:scale-110"
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
            >
              <Star
                size={22}
                className={filled ? "text-amber-400" : "text-zinc-700"}
                // `fill` paints the inside of the star (gold) once selected.
                fill={filled ? "currentColor" : "none"}
              />
            </button>
          );
        })}
      </div>

      {/* Optional written comment. */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share a few words about your experience (optional)"
        rows={2}
        maxLength={1000}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-white/30"
      />

      {/* Inline error (e.g. "pick a rating first"). */}
      {error && (
        <div className="flex items-start gap-1.5 text-[11px] text-red-400">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={submitReview}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : "Submit Review"}
      </button>
    </div>
  );
}
