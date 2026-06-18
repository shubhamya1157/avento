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
import { STATIC_VEHICLES } from "@/app/lib/seed-vehicles";
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
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    // Read the booking details the browser sent. The body arrives as JSON text;
    // `await req.json()` waits for it to load and turns it into an object. The
    // { a, b, c } = ... syntax then plucks those named fields out in one line.
    const { vehicleId, startDate, endDate, totalAmount } = await req.json();

    if (!vehicleId || !startDate || !endDate || !totalAmount) {
      return apiError("Missing required fields", 400);
    }

    // The dates arrive as text; turn them into real Date objects so we can
    // compare them.
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Rule 1: the rental must start before it ends.
    if (start >= end) {
      return apiError("Start date must be before end date", 400);
    }

    // Rule 2: you can't book a date that has already passed. We set today's
    // time to midnight (00:00) so that booking for "today" still counts as
    // valid rather than being treated as in the past.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      return apiError("Start date cannot be in the past", 400);
    }

    await connectDB();

    // The fleet is served from a static list and isn't pre-loaded into the
    // database, so the first time a vehicle is ever booked we insert it on
    // demand (using its known id) so the booking can reference a real document.
    let vehicle = await vehicleModel.findById(vehicleId);
    if (!vehicle) {
      // Look up the vehicle in the static list by its id.
      const staticVehicle = STATIC_VEHICLES.find((v) => v._id === vehicleId);
      if (!staticVehicle) {
        return apiError("Vehicle not found", 404); // unknown id
      }
      // Separate the id from the rest of the fields, then create the database
      // record using that same id so future bookings find it next time.
      const { _id, ...vehicleData } = staticVehicle;
      vehicle = await vehicleModel.create({ _id, ...vehicleData });
    }

    // Don't allow booking a vehicle that's been marked unavailable.
    if (!vehicle.availability) {
      return apiError("Vehicle is currently not available for rent", 400);
    }

    // Rule 3: prevent double-booking. Look for any existing, non-cancelled
    // booking for this vehicle whose date range OVERLAPS the requested one.
    // Two ranges overlap when: existing.start <= new.end AND existing.end >= new.start.
    const overlappingBooking = await bookingModel.findOne({
      vehicleId,
      status: { $ne: "cancelled" }, // $ne = "not equal": ignore cancelled ones
      startDate: { $lte: end },     // $lte = "less than or equal"
      endDate: { $gte: start },     // $gte = "greater than or equal"
    });

    if (overlappingBooking) {
      return apiError("This vehicle is already booked for the selected dates.", 400);
    }

    // All checks passed — save the booking, tied to this user.
    const booking = await bookingModel.create({
      userId: session.user.id,
      vehicleId,
      startDate: start,
      endDate: end,
      totalAmount,
      status: "confirmed",
    });

    return NextResponse.json(booking, { status: 201 }); // 201 = Created
  } catch (error) {
    console.error("Create booking error:", error);
    return apiError(getErrorMessage(error, "Failed to place booking"), 500);
  }
}
