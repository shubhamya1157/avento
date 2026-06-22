// ===========================================================================
// create-booking.ts — The shared "make a booking" logic
// ===========================================================================
//
// Two different routes need to create a booking:
//   1. /api/bookings (POST)        — the "demo" path when no payment is taken.
//   2. /api/payment/verify (POST)  — after a real Razorpay payment succeeds.
//
// Rather than copy the date checks, the "is this vehicle free?" check, and the
// double-booking guard into both files, we keep that logic here once and call it
// from both. (This is the "Don't Repeat Yourself" principle again.)
//
// The function returns a small result object: on success `{ booking }`, and on
// any rule failure `{ errorMessage, errorStatus }`. The calling route turns that
// into an HTTP response. This keeps all the BUSINESS rules in one place and all
// the HTTP-response building in the routes.
// ===========================================================================

import connectDB from "@/app/lib/db";
import bookingModel from "@/app/models/booking";
import vehicleModel from "@/app/models/vehicle";
import { STATIC_VEHICLES } from "@/app/lib/seed-vehicles";
import { rentalDays } from "@/app/lib/rental-price";

// What the caller passes in. The `payment` part is optional — it's only present
// for real (paid) bookings; demo bookings leave it out.
//
// NOTE: there is deliberately NO `totalAmount` here. The price is the server's
// to decide (days × the vehicle's pricePerDay), so we compute it below from the
// dates and the vehicle — never from a value the browser sent, which could be
// tampered to underpay. (Rides work the same way; see app/lib/fare.ts.)
interface CreateBookingInput {
  userId: string;
  vehicleId: string;
  startDate: string | Date;
  endDate: string | Date;
  payment?: { paymentId: string; orderId: string }; // present only when paid for real
  // When true, this is a REQUEST (the new "ask first, pay after the owner says
  // yes" flow): the booking is saved as status "requested" and unpaid, and we
  // DON'T hard-block on overlapping dates — several customers may request the
  // same days, and the owner picks one. The real "is this slot still free?"
  // check happens at accept time (see the accept handler in
  // app/api/bookings/[id]/route.ts), where "accepted" counts as taken.
  requested?: boolean;
}

// The shape we hand back: exactly one of `booking` or the error pair is filled.
type CreateBookingResult =
  | { booking: InstanceType<typeof bookingModel>; errorMessage?: undefined; errorStatus?: undefined }
  | { booking?: undefined; errorMessage: string; errorStatus: number };

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const { userId, vehicleId, startDate, endDate, payment, requested } = input;

  // All the core fields must be present.
  if (!vehicleId || !startDate || !endDate) {
    return { errorMessage: "Missing required fields", errorStatus: 400 };
  }

  // Turn the dates into real Date objects so we can compare them.
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Rule 1: the rental must start before it ends.
  if (start >= end) {
    return { errorMessage: "Start date must be before end date", errorStatus: 400 };
  }

  // Rule 2: you can't book a date that has already passed. Comparing against
  // midnight today means booking for "today" still counts as valid.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) {
    return { errorMessage: "Start date cannot be in the past", errorStatus: 400 };
  }

  await connectDB();

  // The house fleet is served from a static list and isn't pre-loaded into the
  // database, so the first time a static vehicle is ever booked we insert it on
  // demand (using its known id) so the booking can reference a real document.
  // (Partner vehicles already live in the database, so they're found directly.)
  let vehicle = await vehicleModel.findById(vehicleId);
  if (!vehicle) {
    const staticVehicle = STATIC_VEHICLES.find((v) => v._id === vehicleId);
    if (!staticVehicle) {
      return { errorMessage: "Vehicle not found", errorStatus: 404 };
    }
    const { _id, ...vehicleData } = staticVehicle;
    vehicle = await vehicleModel.create({ _id, ...vehicleData });
  }

  // Don't allow booking a vehicle that's been marked unavailable.
  if (!vehicle.availability) {
    return { errorMessage: "Vehicle is currently not available for rent", errorStatus: 400 };
  }

  // Rule 3: prevent double-booking — but ONLY for a real (already-decided)
  // booking. A plain REQUEST skips this so several customers may ask for the same
  // dates; the owner's accept is where the slot is actually claimed.
  //
  // A range is "taken" only by a booking that's locked the slot: accepted (owner
  // said yes), confirmed (paid), or ongoing. requested / rejected / cancelled
  // bookings leave the dates open. Two ranges overlap when
  // existing.start <= new.end AND existing.end >= new.start.
  if (!requested) {
    const overlappingBooking = await bookingModel.findOne({
      vehicleId,
      status: { $in: ["accepted", "confirmed", "ongoing"] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (overlappingBooking) {
      return { errorMessage: "This vehicle is already booked for the selected dates.", errorStatus: 400 };
    }
  }

  // The price is OURS to compute, never the browser's: days × this vehicle's
  // pricePerDay. `rentalDays` is the same maths the live estimate uses, so what
  // we store always matches what the customer was shown (and, for paid bookings,
  // what /api/payment/order already charged from the identical calculation).
  const totalAmount = rentalDays(start, end) * vehicle.pricePerDay;

  // All checks passed — save the booking, tied to this user.
  //   - A REQUEST starts at status "requested", unpaid, awaiting the owner.
  //   - Otherwise it's the legacy direct path: "confirmed", and paid:true if a
  //     real payment came with it (else a demo booking).
  const booking = await bookingModel.create({
    userId,
    vehicleId,
    startDate: start,
    endDate: end,
    totalAmount,
    status: requested ? "requested" : "confirmed",
    paid: Boolean(payment),
    paymentId: payment?.paymentId,
    orderId: payment?.orderId,
  });

  return { booking };
}
