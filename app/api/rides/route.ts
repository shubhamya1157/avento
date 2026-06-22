// ===========================================================================
// api/rides/route.ts — Book a ride (POST), the "demo" (no-payment) path
// ===========================================================================
//
// URL: "/api/rides". This is the ride-hailing twin of POST /api/bookings: it's
// the path used when Razorpay is NOT configured, so no real money is taken. When
// Razorpay IS set up, the browser instead goes through /api/payment/order +
// /api/payment/verify-ride, which calls the SAME createRide() helper after the
// payment succeeds — so both paths apply identical rules.
//
// There's no GET here on purpose: a ride is stored in the bookings collection,
// so the existing GET /api/bookings already returns a user's rides alongside
// their rentals.
// ===========================================================================

import { createRide } from "@/app/lib/create-ride";
import { requireCustomer } from "@/app/lib/guards";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// POST /api/rides — create a ride for the logged-in user.
// Body: { vehicleId, pickup: {address,lat,lng}, drop: {address,lat,lng} }
// (The distance and fare are computed on the server inside createRide.)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // Must be a CUSTOMER: partners and admins are blocked from booking rides.
    const { session, error } = await requireCustomer();
    if (error) return error;

    const { vehicleId, pickup, drop } = await req.json();

    // Hand off to the shared helper, which validates the points, recomputes the
    // fare, and either creates the ride or returns a clear error + status code.
    const result = await createRide({
      userId: session.user.id!,
      vehicleId,
      pickup,
      drop,
    });

    if (result.errorMessage) {
      return apiError(result.errorMessage, result.errorStatus);
    }

    return NextResponse.json(result.booking, { status: 201 }); // 201 = Created
  } catch (error) {
    console.error("Create ride error:", error);
    return apiError(getErrorMessage(error, "Failed to book ride"), 500);
  }
}
