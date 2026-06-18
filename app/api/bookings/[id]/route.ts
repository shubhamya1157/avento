// ===========================================================================
// api/bookings/[id]/route.ts — Cancel a single booking
// ===========================================================================
//
// URL pattern: "/api/bookings/SOME_ID". The folder name "[id]" is a "dynamic
// route": the [id] part stands in for whatever booking id is in the URL, and
// Next.js hands it to us. So "/api/bookings/abc123" gives us id = "abc123".
//
// We handle PATCH here. PATCH is the HTTP method for PARTIALLY updating an
// existing thing — in this app, flipping a booking's status to "cancelled".
// ===========================================================================

import { auth } from "@/app/auth";
import connectDB from "@/app/lib/db";
import bookingModel from "@/app/models/booking";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  // The second argument carries the URL's dynamic parts. Here `params` is a
  // Promise we await to read the booking `id` from "/api/bookings/[id]".
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Must be logged in.
    const session = await auth();
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    // Get the id from the URL and the requested new status from the body.
    // `await req.json()` reads the JSON the browser sent and turns that text
    // into an object; we then pull out the `status` field it contains.
    const { id } = await context.params;
    const { status } = await req.json();

    // This endpoint only supports cancelling. Any other status is rejected.
    if (status !== "cancelled") {
      return apiError("Invalid action", 400);
    }

    await connectDB();

    // Find the booking being cancelled.
    const booking = await bookingModel.findById(id);
    if (!booking) {
      return apiError("Booking not found", 404);
    }

    // SECURITY CHECK: make sure this booking belongs to the logged-in user, so
    // nobody can cancel someone else's booking by guessing its id. 403 means
    // "Forbidden" — we know who you are, but you're not allowed to do this.
    // `.toString()` turns the stored id (a special database object) into plain
    // text so it can be fairly compared with the logged-in user's id text.
    // `!==` means "is NOT exactly equal to".
    if (booking.userId.toString() !== session.user.id) {
      return apiError("Unauthorized to update this booking", 403);
    }

    // Flip the status and save the change back to the database.
    booking.status = "cancelled";
    await booking.save();

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Update booking error:", error);
    return apiError(getErrorMessage(error, "Failed to update booking"), 500);
  }
}
