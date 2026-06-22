// ===========================================================================
// api/bookings/route.ts — List my bookings (GET) and make a booking (POST)
// ===========================================================================
//
// URL: "/api/bookings". Both methods here are PROTECTED: you must be logged in.
// We check that by calling `auth()`, which reads the session "wristband" set up
// in app/auth.ts. No valid session -> we reply 401 (Unauthorized) and stop.
//
// A few words you'll see a lot in this file, explained once:
//   - API route: server code the browser talks to over the web at a URL.
//   - request / response: the browser's incoming message, and our reply.
//   - HTTP method: the "verb" of the request. GET = "give me data",
//     POST = "here's new data to save". The function name picks the verb.
//   - status code: a 3-digit number summarising the result. 200/201 = success,
//     400 = bad input, 401 = not logged in, 404 = not found, 500 = server broke.
//   - JSON: a simple text format for data, like { "name": "Sam" }. It's how the
//     browser and server pass objects back and forth.
//   - async / await: this work takes time (talking to a database, etc.). An
//     `async` function is allowed to pause; `await` means "wait here for this
//     slow step to finish before moving to the next line."
//   - session / auth: proof of who is logged in — like a wristband at an event.
//   - database query: a question we ask the database, e.g. "find this user's
//     bookings."
// ===========================================================================

import { auth } from "@/app/auth";
import connectDB from "@/app/lib/db";
import bookingModel from "@/app/models/booking";
import vehicleModel from "@/app/models/vehicle";
import { createBooking } from "@/app/lib/create-booking";
import { requireUser } from "@/app/lib/guards";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/bookings — return the logged-in user's bookings, newest first.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    // Who's calling? If not logged in, refuse.
    const session = await auth();
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    await connectDB();

    // Find only THIS user's bookings.
    const bookings = await bookingModel
      .find({ userId: session.user.id })
      // "populate" replaces the stored vehicleId (just an id) with the actual
      // vehicle document, so the frontend gets the brand, image, price, etc.
      // without making a second request.
      .populate({ path: "vehicleId", model: vehicleModel })
      // Sort by creation time, -1 = descending = newest bookings at the top.
      .sort({ createdAt: -1 });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return apiError(getErrorMessage(error, "Failed to fetch bookings"), 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/bookings — create a new booking for the logged-in user.
//
// This is the "demo" booking path (no real payment taken). When Razorpay IS
// configured, the browser instead goes through /api/payment/order + /verify,
// which calls the SAME createBooking() helper after the payment succeeds. All
// the actual booking rules (dates, availability, double-booking) live in that
// shared helper so both paths behave identically.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // Must be a CUSTOMER: partners and admins are blocked from booking here.
    const { session, error } = await requireCustomer();
    if (error) return error;

    // Read the booking details the browser sent (JSON -> object). Note we do
    // NOT read a price here — createBooking computes the amount itself from the
    // dates + the vehicle, so a tampered request can't set its own price.
    const { vehicleId, startDate, endDate } = await req.json();

    // Hand off to the shared helper, which validates everything and either
    // creates the booking or returns a clear error + status code.
    const result = await createBooking({
      userId: session.user.id!,
      vehicleId,
      startDate,
      endDate,
    });

    if (result.errorMessage) {
      return apiError(result.errorMessage, result.errorStatus);
    }

    return NextResponse.json(result.booking, { status: 201 }); // 201 = Created
  } catch (error) {
    console.error("Create booking error:", error);
    return apiError(getErrorMessage(error, "Failed to place booking"), 500);
  }
}
