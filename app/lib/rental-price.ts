// ===========================================================================
// rental-price.ts — The one true place that works out what a rental costs
// ===========================================================================
//
// This is the rental twin of app/lib/fare.ts (which prices rides). Like that
// file, the golden rule is: NEVER trust a price sent by the browser. A rental's
// price is simply `number of days × the vehicle's pricePerDay`, and BOTH of
// those must be decided on the server:
//   - the day count, from the dates (a tampered request could lie about it);
//   - the pricePerDay, read from the vehicle itself (never from the request).
//
// Two server routes need this:
//   - /api/payment/order  — to charge the correct amount up front, and
//   - app/lib/create-booking.ts — to store the correct amount on the booking.
// Keeping the maths here means those two can never disagree.
//
// `rentalDays` is a PURE function (no database) so the BookingModal in the
// browser can call the exact same code to show a live estimate, and it will
// always match what the server finally charges.
// ===========================================================================

import connectDB from "@/app/lib/db";
import vehicleModel from "@/app/models/vehicle";
import { STATIC_VEHICLES } from "@/app/lib/seed-vehicles";

// One day in milliseconds — pulled out so the maths below reads clearly.
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ---------------------------------------------------------------------------
// rentalDays — how many days a pick-up→return range spans.
// Math.ceil rounds a partial day up to a whole rental day, matching the live
// estimate in BookingModal. An invalid range (return on/before pick-up) is 0.
// ---------------------------------------------------------------------------
export function rentalDays(start: Date, end: Date): number {
  if (!(start instanceof Date) || !(end instanceof Date)) return 0;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end <= start) return 0;
  return Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY);
}

// What `quoteRental` hands back: exactly one of `amount` OR the error pair is
// filled in (the same little result shape used by create-booking / create-ride).
type RentalQuote =
  | { amount: number; pricePerDay: number; days: number; errorMessage?: undefined; errorStatus?: undefined }
  | { amount?: undefined; pricePerDay?: undefined; days?: undefined; errorMessage: string; errorStatus: number };

// ---------------------------------------------------------------------------
// quoteRental — the SERVER's authoritative price for a rental.
//
// Given a vehicle id and a date range, it resolves the vehicle (from the
// database, falling back to the static house fleet — the same lookup pattern as
// create-booking.ts), re-validates the dates, and returns the price WE compute.
// The /api/payment/order route uses this so the customer is charged the real
// price, not one the browser claims.
// ---------------------------------------------------------------------------
export async function quoteRental(input: {
  vehicleId: string;
  startDate: string | Date;
  endDate: string | Date;
}): Promise<RentalQuote> {
  const { vehicleId, startDate, endDate } = input;

  if (!vehicleId || !startDate || !endDate) {
    return { errorMessage: "Missing required fields", errorStatus: 400 };
  }

  // Turn the dates into real Date objects and apply the same two rules the
  // booking itself enforces, so a bad request is rejected before we charge.
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (rentalDays(start, end) <= 0) {
    return { errorMessage: "Start date must be before end date", errorStatus: 400 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // booking for "today" is still allowed
  if (start < today) {
    return { errorMessage: "Start date cannot be in the past", errorStatus: 400 };
  }

  await connectDB();

  // Resolve the vehicle's price. Partner vehicles live in the database; the
  // house fleet lives in the static list (and may not be inserted yet), so we
  // fall back to STATIC_VEHICLES — exactly as create-booking.ts does.
  const dbVehicle = await vehicleModel.findById(vehicleId);
  const vehicle = dbVehicle ?? STATIC_VEHICLES.find((v) => v._id === vehicleId);
  if (!vehicle) {
    return { errorMessage: "Vehicle not found", errorStatus: 404 };
  }
  if (!vehicle.availability) {
    return { errorMessage: "Vehicle is currently not available for rent", errorStatus: 400 };
  }

  const days = rentalDays(start, end);
  const pricePerDay = vehicle.pricePerDay;
  const amount = days * pricePerDay;

  return { amount, pricePerDay, days };
}
