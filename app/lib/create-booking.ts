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

// What the caller passes in. The `payment` part is optional — it's only present
// for real (paid) bookings; demo bookings leave it out.
interface CreateBookingInput {
  userId: string;
  vehicleId: string;
  startDate: string | Date;
  endDate: string | Date;
  totalAmount: number;
  payment?: { paymentId: string; orderId: string }; // present only when paid for real
}

// The shape we hand back: exactly one of `booking` or the error pair is filled.
type CreateBookingResult =
  | { booking: InstanceType<typeof bookingModel>; errorMessage?: undefined; errorStatus?: undefined }
  | { booking?: undefined; errorMessage: string; errorStatus: number };

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const { userId, vehicleId, startDate, endDate, totalAmount, payment } = input;

  // All the core fields must be present.
  if (!vehicleId || !startDate || !endDate || !totalAmount) {
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

  // Rule 3: prevent double-booking. Look for any existing, non-cancelled booking
  // for this vehicle whose date range OVERLAPS the requested one. Two ranges
  // overlap when: existing.start <= new.end AND existing.end >= new.start.
  const overlappingBooking = await bookingModel.findOne({
    vehicleId,
    status: { $ne: "cancelled" },
    startDate: { $lte: end },
    endDate: { $gte: start },
  });

  if (overlappingBooking) {
    return { errorMessage: "This vehicle is already booked for the selected dates.", errorStatus: 400 };
  }

  // All checks passed — save the booking, tied to this user. If a payment was
  // made, record it (paid:true + the Razorpay ids); otherwise it's a demo booking.
  const booking = await bookingModel.create({
    userId,
    vehicleId,
    startDate: start,
    endDate: end,
    totalAmount,
    status: "confirmed",
    paid: Boolean(payment),
    paymentId: payment?.paymentId,
    orderId: payment?.orderId,
  });

  return { booking };
}
