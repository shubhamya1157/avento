// ===========================================================================
// api/reviews/route.ts — Read a vehicle's reviews (GET) and leave one (POST)
// ===========================================================================
//
// URL: "/api/reviews".
//   - GET  /api/reviews?vehicleId=XXX  is PUBLIC — anyone can read the reviews
//     and the average rating for a vehicle (it helps people decide to book).
//   - POST /api/reviews                is PROTECTED — you must be logged in, AND
//     you can only review a vehicle you've actually booked. That keeps reviews
//     honest (no rating a car you never rented).
//
// See app/models/review.ts for the data shape and the "one review per user per
// vehicle" rule this route relies on.
// ===========================================================================

import { requireUser } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import reviewModel from "@/app/models/review";
import bookingModel from "@/app/models/booking";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/reviews?vehicleId=XXX — list a vehicle's reviews, newest first, plus
// a summary (how many, and the average star rating).
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    // Read the vehicleId from the URL's query string (the "?vehicleId=..." part).
    const vehicleId = req.nextUrl.searchParams.get("vehicleId");
    if (!vehicleId) {
      return apiError("vehicleId is required", 400);
    }

    await connectDB();

    const reviews = await reviewModel.find({ vehicleId }).sort({ createdAt: -1 });

    // Work out the average rating. With no reviews the average is 0 (so the UI can
    // show "no reviews yet" instead of dividing by zero).
    const count = reviews.length;
    const average =
      count === 0
        ? 0
        // Sum every rating, divide by how many, round to 1 decimal place.
        : Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10;

    return NextResponse.json({ reviews, count, average });
  } catch (error) {
    console.error("Fetch reviews error:", error);
    return apiError(getErrorMessage(error, "Failed to fetch reviews"), 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/reviews — leave a review for a vehicle you've booked.
// Body: { vehicleId: string, rating: number (1–5), comment?: string }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireUser();
    if (error) return error;

    const { vehicleId, rating, comment } = await req.json();

    // The rating must be a whole number from 1 to 5.
    if (!vehicleId) {
      return apiError("vehicleId is required", 400);
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return apiError("Rating must be a whole number from 1 to 5", 400);
    }

    await connectDB();

    // Honesty rule: only let people review a vehicle they actually booked. We
    // look for any non-cancelled booking by this user for this vehicle.
    const hasBooked = await bookingModel.findOne({
      userId: session.user.id,
      vehicleId,
      status: { $ne: "cancelled" },
    });
    if (!hasBooked) {
      return apiError("You can only review a vehicle you've booked", 403);
    }

    // Create the review. `userName` is copied in so the GET list can show who
    // wrote each review without a second lookup.
    const review = await reviewModel.create({
      userId: session.user.id,
      vehicleId,
      userName: session.user.name || "Anonymous",
      rating,
      comment,
    });

    return NextResponse.json(review, { status: 201 }); // 201 = Created
  } catch (error: unknown) {
    // A duplicate-key error (Mongo code 11000) means this user already reviewed
    // this vehicle — the unique index in the model caught it. Turn that into a
    // friendly 409 (Conflict) instead of a scary 500.
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return apiError("You've already reviewed this vehicle", 409);
    }
    console.error("Create review error:", error);
    return apiError(getErrorMessage(error, "Failed to submit review"), 500);
  }
}
