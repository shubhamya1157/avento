// ===========================================================================
// api/bookings/[id]/route.ts — Read one booking, or change its status
// ===========================================================================
//
// URL pattern: "/api/bookings/SOME_ID". The folder name "[id]" is a "dynamic
// route": the [id] part stands in for whatever booking id is in the URL, and
// Next.js hands it to us. So "/api/bookings/abc123" gives us id = "abc123".
//
// We handle PATCH here. PATCH is the HTTP method for PARTIALLY updating an
// existing thing. It supports the booking lifecycle changes:
//   - "accepted" / "rejected" — the OWNER (or an admin) answers a rental
//     REQUEST. Only they may decide; the booker can't accept their own request.
//   - "confirmed" — the BOOKER pays for an ACCEPTED rental (the demo "pay now").
//   - "cancelled" — call off a booking. Only the BOOKER may do this.
//   - "ongoing" / "completed" — the RIDE lifecycle (a ride is on its way, or it
//     has finished). Either party (the rider OR the driver/owner/admin) may move
//     a ride along, so this uses the shared booking-party check.
// ===========================================================================

import connectDB from "@/app/lib/db";
import bookingModel from "@/app/models/booking";
import { requireUser } from "@/app/lib/guards";
import { requireBookingParty } from "@/app/lib/booking-access";
import { isAdminEmail } from "@/app/lib/roles";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET — one booking's details, plus who the viewer is relative to it.
// ---------------------------------------------------------------------------
// Used by the live trip page (/trip/[id]) to render a title and to decide
// whether the viewer is the DRIVER (vehicle owner or admin — shares location)
// or the PASSENGER (the booker — watches the location). Only parties to the
// booking may read it.
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireUser();
    if (error) return error;

    const { id } = await context.params;

    const access = await requireBookingParty(id, session);
    if (access.error) return access.error;

    const { booking, vehicle } = access;

    // Work out the viewer's role so the client knows which UI to show.
    const myId = String(session.user.id);
    const isPassenger = String(booking.userId) === myId;
    const isDriver = !isPassenger; // owner or admin standing in for the house fleet

    return NextResponse.json({
      booking,
      vehicle,
      role: isDriver ? "driver" : "passenger",
    });
  } catch (error) {
    console.error("Fetch booking error:", error);
    return apiError(getErrorMessage(error, "Failed to load booking"), 500);
  }
}

export async function PATCH(
  req: NextRequest,
  // The second argument carries the URL's dynamic parts. Here `params` is a
  // Promise we await to read the booking `id` from "/api/bookings/[id]".
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Must be logged in.
    const { session, error } = await requireUser();
    if (error) return error;

    // Get the id from the URL and the requested new status from the body.
    // `await req.json()` reads the JSON the browser sent and turns that text
    // into an object; we then pull out the `status` field (and an optional
    // `note`, used to tell the customer WHY a request was rejected).
    const { id } = await context.params;
    const { status, note } = await req.json();

    // Only these transitions are allowed through this endpoint.
    if (!["accepted", "rejected", "confirmed", "cancelled", "ongoing", "completed"].includes(status)) {
      return apiError("Invalid action", 400);
    }

    await connectDB();

    // Find the booking being changed.
    const booking = await bookingModel.findById(id);
    if (!booking) {
      return apiError("Booking not found", 404);
    }

    const myId = String(session.user.id);
    const isBooker = String(booking.userId) === myId;

    if (status === "accepted" || status === "rejected") {
      // --- The OWNER (or an admin) answers a rental request. ---
      // requireBookingParty confirms the viewer is tied to this booking and also
      // hands back the vehicle so we can tell owners apart from the booker.
      const access = await requireBookingParty(id, session);
      if (access.error) return access.error;

      // The decision is the OWNER's (or an admin's) to make — never the booker's.
      const isAdmin = session.user.role === "admin" || isAdminEmail(session.user.email);
      const isOwner = access.vehicle?.ownerId ? String(access.vehicle.ownerId) === myId : false;
      if (isBooker || (!isOwner && !isAdmin)) {
        return apiError("Only the vehicle owner can answer this request", 403);
      }

      // You can only decide a request that's still pending a decision.
      if (booking.status !== "requested") {
        return apiError("This request has already been answered", 400);
      }

      if (status === "accepted") {
        // Final availability check: make sure no OTHER booking has already
        // claimed these dates (accepted/confirmed/ongoing all count as taken).
        const clash = await bookingModel.findOne({
          _id: { $ne: booking._id },
          vehicleId: booking.vehicleId,
          status: { $in: ["accepted", "confirmed", "ongoing"] },
          startDate: { $lte: booking.endDate },
          endDate: { $gte: booking.startDate },
        });
        if (clash) {
          return apiError("Those dates were just taken by another booking", 409);
        }
      }

      // Record WHO decided and WHEN (plus the optional rejection note).
      booking.status = status;
      booking.decisionBy = session.user.id as never;
      booking.decisionAt = new Date();
      if (status === "rejected" && typeof note === "string") {
        booking.decisionNote = note.slice(0, 500); // keep notes sane in size
      }
    } else if (status === "confirmed") {
      // --- The BOOKER pays for an accepted rental (demo "pay now"). ---
      if (!isBooker) {
        return apiError("Only the booker can confirm this booking", 403);
      }
      // Payment only makes sense once the owner has accepted the request.
      if (booking.status !== "accepted") {
        return apiError("This booking isn't ready to pay for yet", 400);
      }
      booking.status = "confirmed";
      // Demo confirm — no real money moves, so `paid` stays false (the Razorpay
      // path in /api/payment/verify is what sets paid:true).
    } else if (status === "cancelled") {
      // SECURITY CHECK: only the BOOKER may cancel, so nobody can cancel someone
      // else's booking by guessing its id. 403 = "Forbidden" (we know who you
      // are, but you're not allowed).
      if (!isBooker) {
        return apiError("Unauthorized to update this booking", 403);
      }
      booking.status = "cancelled";
    } else {
      // "ongoing" / "completed" belong to the RIDE lifecycle only.
      if (booking.kind !== "ride") {
        return apiError("Only rides can be marked ongoing or completed", 400);
      }
      // Either party to the ride (rider OR driver/owner/admin) may move it along.
      const access = await requireBookingParty(id, session);
      if (access.error) return access.error;
      // A cancelled ride can't be revived/completed.
      if (booking.status === "cancelled") {
        return apiError("This ride was cancelled", 400);
      }
      booking.status = status;
    }

    // Save the change back to the database.
    await booking.save();

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Update booking error:", error);
    return apiError(getErrorMessage(error, "Failed to update booking"), 500);
  }
}
