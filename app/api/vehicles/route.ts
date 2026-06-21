// ===========================================================================
// api/vehicles/route.ts — List vehicles (GET) and add a vehicle (POST)
// ===========================================================================
//
// URL: "/api/vehicles". This file handles TWO methods at the same address:
//   - GET  : read/list the vehicles (used by the homepage slider & /vehicles)
//   - POST : create a brand-new vehicle in the database (admin-style action)
//
// GET reads from the fixed STATIC_VEHICLES list (instant, no database needed),
// while POST writes to the real database.
// ===========================================================================

import connectDB from "@/app/lib/db";
import vehicleModel from "@/app/models/vehicle";
import reviewModel from "@/app/models/review";
import { STATIC_VEHICLES } from "@/app/lib/seed-vehicles";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/vehicles            -> all vehicles
// GET /api/vehicles?type=car   -> only cars
//
// The "?type=car" part is a "query parameter": optional extra info tacked onto
// the URL. We read it to optionally filter the list.
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    // Pull the query parameters out of the request URL. `new URL(req.url)`
    // parses the full web address into pieces; `searchParams` is the bag of
    // "?key=value" extras, which we then read by name below.
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // e.g. "car", or null if absent

    // The fleet is the fixed house list PLUS any partner-submitted vehicles an
    // admin has APPROVED. We fetch the approved partner vehicles from the
    // database and tack them onto the static list. `.lean()` returns plain
    // objects (not heavy Mongoose documents), which is all we need to send back.
    // If the database is briefly unreachable we still return the house fleet,
    // so the page never goes blank over a hiccup.
    let partnerVehicles: unknown[] = [];
    // A lookup table of vehicleId -> { average, count } so we can stamp each
    // vehicle below with its star rating. Empty by default, so if the database
    // is unreachable every vehicle simply shows "no reviews yet".
    let ratingByVehicle: Record<string, { average: number; count: number }> = {};
    try {
      await connectDB();
      partnerVehicles = await vehicleModel
        .find({ source: "partner", status: "approved" })
        .sort({ createdAt: -1 })
        .lean();

      // Ratings in ONE query. Instead of asking the database for each vehicle's
      // reviews separately (slow, one round-trip per card), we use an
      // "aggregation": the database groups ALL reviews by which vehicle they're
      // about and hands back, per vehicle, the average rating and how many there
      // are. `$group` buckets by `vehicleId`; `$avg`/`$sum` do the maths.
      const ratingAgg = await reviewModel.aggregate([
        {
          $group: {
            _id: "$vehicleId",
            average: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ]);

      // Turn that list of {_id, average, count} rows into a quick lookup keyed by
      // the vehicle's id as text (so it matches both the static list's string ids
      // and the partner vehicles' ObjectId ids). Round the average to 1 decimal.
      ratingByVehicle = Object.fromEntries(
        ratingAgg.map((r) => [
          String(r._id),
          { average: Math.round(r.average * 10) / 10, count: r.count },
        ])
      );
    } catch (dbError) {
      console.error("Could not load partner vehicles / ratings (showing house fleet only):", dbError);
    }

    // Combine the two sources into one list.
    const allVehicles = [...STATIC_VEHICLES, ...partnerVehicles];

    // If a real type was given (and it isn't "all"), keep only matching
    // vehicles; otherwise return the whole list. `.filter(...)` builds a new
    // array containing only the items where the test is true.
    const filtered = type && type !== "all"
      ? allVehicles.filter((v) => (v as { type?: string }).type === type)
      : allVehicles;

    // Stamp each vehicle with its rating summary from the lookup above. We spread
    // (`...v`) into a fresh object so we never mutate the shared STATIC_VEHICLES.
    // A vehicle with no reviews yet gets a zero summary the UI reads as "new".
    const vehicles = filtered.map((v) => {
      const id = String((v as { _id?: unknown })._id);
      return { ...v, rating: ratingByVehicle[id] ?? { average: 0, count: 0 } };
    });

    // Send the list back as JSON (status defaults to 200 = OK).
    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("Fetch vehicles error:", error);
    return apiError(getErrorMessage(error, "Failed to fetch vehicles"), 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/vehicles — add a new vehicle to the database.
// The new vehicle's details come in the request body as JSON.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    // Pull out each expected field so we can check none are missing.
    const { brand, model, type, image, pricePerDay, description, transmission, fuel, seats } = body;
    if (!brand || !model || !type || !image || !pricePerDay || !description || !transmission || !fuel || !seats) {
      return apiError("All fields are required", 400);
    }

    // Save the whole body as a new vehicle document and return it.
    const newVehicle = await vehicleModel.create(body);
    return NextResponse.json(newVehicle, { status: 201 }); // 201 = Created
  } catch (error) {
    console.error("Create vehicle error:", error);
    return apiError(getErrorMessage(error, "Failed to create vehicle"), 500);
  }
}
