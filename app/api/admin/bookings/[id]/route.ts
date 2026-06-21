// ===========================================================================
// api/admin/bookings/[id]/route.ts — Admin: cancel one booking
// ===========================================================================
//
// URL pattern: "/api/admin/bookings/SOME_ID". The "[id]" folder is a dynamic
// route: [id] stands in for the booking's id from the URL.
//
// PATCH here lets an admin cancel a booking (set its status to "cancelled"),
// e.g. on a customer's behalf or to free up a vehicle. Cancelling — rather than
// deleting — keeps the record for history. ADMIN-ONLY (guarded by requireAdmin).
// ===========================================================================

import { requireAdmin } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import bookingModel from "@/app/models/booking";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await context.params;
    const { status } = await req.json();

    // This endpoint only supports cancelling, so that's the only value allowed.
    if (status !== "cancelled") {
      return apiError("Only 'cancelled' is supported here", 400);
    }

    await connectDB();

    const booking = await bookingModel.findById(id);
    if (!booking) {
      return apiError("Booking not found", 404);
    }

    booking.status = "cancelled";
    await booking.save();

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Admin cancel booking error:", error);
    return apiError(getErrorMessage(error, "Failed to cancel booking"), 500);
  }
}
