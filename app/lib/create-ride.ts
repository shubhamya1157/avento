// ===========================================================================
// create-ride.ts — The shared "make a ride" logic (the ride-hailing twin of
// create-booking.ts)
// ===========================================================================
//
// A ride is REQUEST-FIRST, exactly like a rental: the rider sends a request (no
// money up front), the vehicle's owner — or an admin for the house fleet —
// accepts or rejects it, and only AFTER acceptance does the rider pay (from the
// My Bookings page, the same accepted -> pay -> confirmed path rentals use). So
// this helper just CREATES THE REQUEST (status "requested", unpaid); it's the
// ride-hailing twin of create-booking.ts and is called from POST /api/rides.
//
// A RIDE is not a rental: it has a pickup and drop instead of dates, it is priced
// by distance, and a single vehicle can do many rides — so there is NO date
// range, NO "start before end" rule, and NO double-booking check here.
//
// SECURITY NOTE: we never trust a price sent by the browser. We recompute the
// distance and fare on the server (using app/lib/fare.ts) and store THAT as the
// amount the rider will pay once accepted, so a tampered request can't underpay.
//
// Returns the same little result object shape as createBooking:
//   success -> { booking };  failure -> { errorMessage, errorStatus }.
// ===========================================================================

import connectDB from "@/app/lib/db";
import bookingModel from "@/app/models/booking";
import vehicleModel from "@/app/models/vehicle";
import { STATIC_VEHICLES } from "@/app/lib/seed-vehicles";
import { haversineKm, estimateFare } from "@/app/lib/fare";
import type { VehicleType } from "@/app/lib/types";

// One end of the trip: a human address plus the coordinates we geocoded it to.
interface RidePoint {
  address: string;
  lat: number;
  lng: number;
}

// What the caller passes in. No payment here — a ride starts as an unpaid
// request and is paid for later, after the owner/admin accepts it.
interface CreateRideInput {
  userId: string;
  vehicleId: string;
  pickup: RidePoint;
  drop: RidePoint;
}

// Exactly one of `booking` or the error pair is filled in.
type CreateRideResult =
  | { booking: InstanceType<typeof bookingModel>; errorMessage?: undefined; errorStatus?: undefined }
  | { booking?: undefined; errorMessage: string; errorStatus: number };

// Small helper: a point is valid only if it carries two real, finite numbers.
function isValidPoint(p: RidePoint | undefined): p is RidePoint {
  return Boolean(
    p &&
    typeof p.lat === "number" && Number.isFinite(p.lat) &&
    typeof p.lng === "number" && Number.isFinite(p.lng)
  );
}

export async function createRide(input: CreateRideInput): Promise<CreateRideResult> {
  const { userId, vehicleId, pickup, drop } = input;

  // The core fields must be present and the coordinates must be real numbers.
  if (!vehicleId) {
    return { errorMessage: "Missing vehicle", errorStatus: 400 };
  }
  if (!isValidPoint(pickup) || !isValidPoint(drop)) {
    return { errorMessage: "Pickup and drop locations are required", errorStatus: 400 };
  }

  await connectDB();

  // Same as create-booking: the house fleet lives in a static list and isn't
  // pre-loaded into the database, so the first time a static vehicle is used we
  // insert it on demand (with its known id) so the ride can reference a real
  // document (which the chat / reviews / access guard all need).
  let vehicle = await vehicleModel.findById(vehicleId);
  if (!vehicle) {
    const staticVehicle = STATIC_VEHICLES.find((v) => v._id === vehicleId);
    if (!staticVehicle) {
      return { errorMessage: "Vehicle not found", errorStatus: 404 };
    }
    const { _id, ...vehicleData } = staticVehicle;
    vehicle = await vehicleModel.create({ _id, ...vehicleData });
  }

  // Don't allow a ride on a vehicle that's been marked unavailable.
  if (!vehicle.availability) {
    return { errorMessage: "This vehicle is currently not available", errorStatus: 400 };
  }

  // Recompute distance + fare on the server — this is the price we charge.
  const distanceKm = haversineKm(pickup, drop);
  const fare = estimateFare(distanceKm, vehicle.type as VehicleType);

  // Save the ride as a REQUEST. Note kind:"ride", no dates, and totalAmount ===
  // fare so the rest of the app (which reads totalAmount) shows the right number
  // — this is what the rider will pay once the owner/admin accepts. status starts
  // "requested" and paid is false; no money has moved yet.
  const rideOtp = Math.floor(1000 + Math.random() * 9000).toString();

  const booking = await bookingModel.create({
    userId,
    vehicleId,
    kind: "ride",
    pickup,
    drop,
    distanceKm,
    fare,
    totalAmount: fare,
    status: "requested",
    paid: false,
    rideOtp,
  });

  return { booking };
}
