// ===========================================================================
// api/admin/bookings/[id]/route.ts — Admin: answer or cancel one booking
// ===========================================================================
//
// URL pattern: "/api/admin/bookings/SOME_ID". The "[id]" folder is a dynamic
// route: [id] stands in for the booking's id from the URL.
//
// PATCH here lets an admin move a booking along. ADMIN-ONLY (guarded by
// requireAdmin). Two jobs:
//   - "accepted" / "rejected" — answer a rental REQUEST for a HOUSE-FLEET
//     vehicle. PARTNER vehicles are answered by their own owner on the partner
//     page (via /api/bookings/[id]); the house fleet has no owner, so the admin
//     stands in. This mirrors the owner's accept/reject flow exactly.
//   - "cancelled" — call off a booking (e.g. on a customer's behalf or to free
//     up a vehicle). Cancelling — rather than deleting — keeps the record for
//     history.
//
// It also handles DISPATCH: when the body carries a `driverId`, the admin is
// assigning an approved partner to actually DRIVE a ride (the house fleet has no
// owner of its own). That sets booking.driverId + dispatchedAt; the assigned
// driver then gains trip/chat access and can share live GPS on /trip/[id].
// ===========================================================================

import { requireAdmin } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import bookingModel from "@/app/models/booking";
import userModel from "@/app/models/user";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await context.params;
    // `status` is the new state to move to; `note` is an optional reason the
    // admin can attach when rejecting (the customer sees it on My Bookings);
    // `driverId` (when present) means "dispatch this ride to that driver".
    const { status, note, driverId } = await req.json();

    await connectDB();

    const booking = await bookingModel.findById(id);
    if (!booking) {
      return apiError("Booking not found", 404);
    }

    // --- DISPATCH: assign a driver to a ride. ---
    // The body carrying a `driverId` is what flags this as a dispatch (no status
    // change — a dispatched ride stays confirmed/ongoing). We handle it first and
    // return, so the status switch below only sees real status changes.
    if (driverId !== undefined) {
      // Only RIDES get a driver dispatched; a rental has no live trip to run.
      if (booking.kind !== "ride") {
        return apiError("Only rides can be dispatched to a driver", 400);
      }
      // A cancelled/finished ride can't be (re)dispatched.
      if (booking.status === "cancelled" || booking.status === "completed") {
        return apiError("This ride is no longer active", 400);
      }
      // The driver must be a vetted (KYC-passed) partner — same pool the
      // /api/admin/drivers list offers. Guards against a stale or hand-crafted id.
      const driver = await userModel.findById(driverId).select("partnerStatus");
      if (!driver || driver.partnerStatus !== "approved") {
        return apiError("That driver isn't an approved partner", 400);
      }

      booking.driverId = driverId as never;
      booking.dispatchedAt = new Date();
      await booking.save();
      return NextResponse.json(booking);
    }

    // From here on we're changing the booking's status. Answering a request or
    // cancelling are the only status moves this admin endpoint supports.
    if (!["accepted", "rejected", "cancelled"].includes(status)) {
      return apiError("Unsupported action", 400);
    }

    if (status === "accepted" || status === "rejected") {
      // --- The admin answers a HOUSE-FLEET rental request. ---
      // You can only decide a request that's still pending a decision; once it's
      // accepted/rejected/cancelled there's nothing left to answer.
      if (booking.status !== "requested") {
        return apiError("This request has already been answered", 400);
      }

      if (status === "accepted") {
        // Final availability check: make sure no OTHER booking has already
        // claimed these dates (accepted/confirmed/ongoing all count as taken).
        // Same guard the owner's accept path uses, so the fleet can't double-book.
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

      // Record WHO decided and WHEN (plus the optional rejection note). `as never`
      // satisfies the typed ObjectId field from a plain string id.
      booking.status = status;
      booking.decisionBy = session.user.id as never;
      booking.decisionAt = new Date();
      if (status === "rejected" && typeof note === "string") {
        booking.decisionNote = note.slice(0, 500); // keep notes sane in size
      }
    } else {
      // --- Cancel the booking. ---
      booking.status = "cancelled";
    }

    await booking.save();

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Admin update booking error:", error);
    return apiError(getErrorMessage(error, "Failed to update booking"), 500);
  }
}
