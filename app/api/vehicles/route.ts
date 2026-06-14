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
    // Pull the query parameters out of the request URL.
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // e.g. "car", or null if absent

    // If a real type was given (and it isn't "all"), keep only matching
    // vehicles; otherwise return the whole list. `.filter(...)` builds a new
    // array containing only the items where the test is true.
    const vehicles = type && type !== "all"
      ? STATIC_VEHICLES.filter((v) => v.type === type)
      : STATIC_VEHICLES;

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
