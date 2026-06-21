// ===========================================================================
// booking-access.ts — "Who is allowed in this booking's conversation?"
// ===========================================================================
//
// The live chat and video call for a booking are private to the two people
// involved (plus admins, who can help). Several routes need the exact same
// "are you allowed?" check, so we write it once here.
//
// WHO COUNTS AS A PARTY TO A BOOKING:
//   - the BOOKER     — the customer who made the booking (booking.userId)
//   - the OWNER      — the partner who owns the booked vehicle (vehicle.ownerId);
//                      house-fleet vehicles have no owner, so an admin stands in
//   - any ADMIN      — can join to mediate / provide support
//
// Returns either { booking, vehicle } on success, or { error } — a ready-to-
// return HTTP error — if the booking is missing or the user isn't a party.
// ===========================================================================

import connectDB from "@/app/lib/db";
import bookingModel from "@/app/models/booking";
import vehicleModel from "@/app/models/vehicle";
import { isAdminEmail } from "@/app/lib/roles";
import { apiError } from "@/app/lib/api-response";
import type { Session } from "next-auth";

type AccessResult =
  | {
      booking: InstanceType<typeof bookingModel>;
      vehicle: InstanceType<typeof vehicleModel> | null;
      error: null;
    }
  | { booking: null; vehicle: null; error: ReturnType<typeof apiError> };

export async function requireBookingParty(
  bookingId: string,
  session: Session
): Promise<AccessResult> {
  await connectDB();

  const booking = await bookingModel.findById(bookingId);
  if (!booking) {
    return { booking: null, vehicle: null, error: apiError("Booking not found", 404) };
  }

  // Look up the booked vehicle so we can check who owns it.
  const vehicle = await vehicleModel.findById(booking.vehicleId);

  const myId = String(session.user.id);
  const isBooker = String(booking.userId) === myId;
  const isOwner = vehicle?.ownerId ? String(vehicle.ownerId) === myId : false;
  const isAdmin = session.user.role === "admin" || isAdminEmail(session.user.email);

  if (!isBooker && !isOwner && !isAdmin) {
    return { booking: null, vehicle: null, error: apiError("You are not part of this booking", 403) };
  }

  return { booking, vehicle, error: null };
}
