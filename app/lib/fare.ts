// ===========================================================================
// fare.ts — Working out how far a ride is and what it costs
// ===========================================================================
//
// This file holds the maths for the "Get a Ride" flow. It is deliberately a set
// of PURE functions (no database, no network) so the SAME code runs in two
// places and always agrees:
//   - in the browser, to show a live fare estimate as the user picks a vehicle;
//   - on the server (app/lib/create-ride.ts), to compute the REAL fare we charge
//     — never trusting a price sent from the browser, which could be tampered.
//
// DISTANCE: we use the "haversine" formula — the straight-line distance between
// two latitude/longitude points across the curved surface of the Earth. It's not
// the exact road distance (a routing service like OSRM would give that), but it
// needs no API key and never fails, which suits this project. Swapping in OSRM
// later would only mean changing how `distanceKm` is produced — the fare maths
// below stays the same.
// ===========================================================================

import type { VehicleType } from "@/app/lib/types";

// A bare coordinate pair. (GeoPoint in types.ts also carries an address; here we
// only care about the numbers, so we accept just lat/lng.)
export interface LatLng {
  lat: number;
  lng: number;
}

// --- Fare knobs, all in Indian Rupees (₹) ---------------------------------
// Tweak these in one place to re-price every ride across the app.
export const BASE_FARE = 50;                 // ₹ flat "flag-down" charge per ride
export const PER_KM: Record<VehicleType, number> = {
  bike: 8,   // cheapest
  car: 14,
  suv: 20,   // priciest
};
export const MIN_FARE = 60;                  // ₹ no ride costs less than this

// ---------------------------------------------------------------------------
// haversineKm — straight-line distance between two points, in kilometres.
// Rounded to 1 decimal place so the UI shows tidy numbers like "7.4 km".
// ---------------------------------------------------------------------------
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371; // Earth's radius in km

  // Convert the latitude/longitude gap from degrees into radians (the unit the
  // trig functions below expect). toRad just does degrees × π / 180.
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  // The haversine formula itself. `h` is an intermediate value; the final line
  // turns it into an angle and then a distance along the Earth's surface.
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const km = R * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));

  return Math.round(km * 10) / 10; // 1 decimal place
}

// ---------------------------------------------------------------------------
// estimateFare — turn a distance + vehicle type into a whole-rupee price.
// Price = base fare + (per-km rate for this vehicle × distance), but never less
// than MIN_FARE. Rounded to a whole rupee for a clean total.
// ---------------------------------------------------------------------------
export function estimateFare(distanceKm: number, type: VehicleType): number {
  const perKm = PER_KM[type] ?? PER_KM.car; // fall back to the car rate if unknown
  const raw = BASE_FARE + perKm * distanceKm;
  return Math.max(MIN_FARE, Math.round(raw));
}
