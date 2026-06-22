// ===========================================================================
// api/bookings/[id]/route.ts — Read one booking, or change its status
// ===========================================================================
//
// URL pattern: "/api/bookings/SOME_ID". The folder name "[id]" is a "dynamic
// route": the [id] part stands in for whatever booking id is in the URL, and
// Next.js hands it to us. So "/api/bookings/abc123" gives us id = "abc123".
//
// We handle PATCH here. PATCH is the HTTP method for PARTIALLY updating an
// existing thing. It supports three status changes:
//   - "cancelled" — call off a booking. Only the BOOKER may do this.
//   - "ongoing" / "completed" — the RIDE lifecycle (a ride is on its way, or it
//     has finished). Either party (the rider OR the driver/owner/admin) may move
//     a ride along, so this uses the shared booking-party check.
// ===========================================================================

import connectDB from "@/app/lib/db";
import bookingModel from "@/app/models/booking";
import { requireUser } from "@/app/lib/guards";
import { requireBookingParty } from "@/app/lib/booking-access";
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
    // into an object; we then pull out the `status` field it contains.
    const { id } = await context.params;
    const { status } = await req.json();

    // Only these three transitions are allowed through this endpoint.
    if (!["cancelled", "ongoing", "completed"].includes(status)) {
      return apiError("Invalid action", 400);
    }

    await connectDB();

    // Find the booking being changed.
    const booking = await bookingModel.findById(id);
    if (!booking) {
      return apiError("Booking not found", 404);
    }

    const myId = String(session.user.id);

    if (status === "cancelled") {
      // SECURITY CHECK: only the BOOKER may cancel, so nobody can cancel someone
      // else's booking by guessing its id. 403 = "Forbidden" (we know who you
      // are, but you're not allowed). `String(...)` makes the stored id plain
      // text so it compares fairly with the logged-in user's id.
      if (String(booking.userId) !== myId) {
        return apiError("Unauthorized to update this booking", 403);
      }
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
    }

    // Apply the change and save it back to the database.
    booking.status = status;
    await booking.save();

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Update booking error:", error);
    return apiError(getErrorMessage(error, "Failed to update booking"), 500);
  }
}
