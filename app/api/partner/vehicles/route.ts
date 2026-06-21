// ===========================================================================
// api/partner/vehicles/route.ts — A partner lists a vehicle & sees their list
// ===========================================================================
//
// URL: "/api/partner/vehicles". This is the "become a partner" backend.
//   - GET  : return the logged-in user's OWN vehicle submissions (any status).
//   - POST : submit a NEW vehicle for the admin to review (starts as "pending").
//
// Both methods are PROTECTED: you must be logged in. A partner-submitted vehicle
// is stored in the SAME collection as the house fleet (see app/models/vehicle.ts)
// but tagged with source:"partner" and status:"pending" so it stays hidden from
// renters until an admin approves it.
// ===========================================================================

import { requireUser } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import vehicleModel from "@/app/models/vehicle";
import userModel from "@/app/models/user";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/partner/vehicles — the current partner's submissions, newest first.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const { session, error } = await requireUser();
    if (error) return error;

    await connectDB();

    // Only vehicles this user submitted. (`source: "partner"` guards against
    // ever matching house-fleet rows.)
    const vehicles = await vehicleModel
      .find({ ownerId: session.user.id, source: "partner" })
      .sort({ createdAt: -1 });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("Fetch partner vehicles error:", error);
    return apiError(getErrorMessage(error, "Failed to fetch your vehicles"), 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/partner/vehicles — submit a new vehicle for review.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireUser();
    if (error) return error;

    const body = await req.json();

    // Pull out every field we expect. The vehicle details PLUS the owner's
    // personal/contact details PLUS at least one photo.
    const {
      brand,
      model,
      type,
      image,
      images,
      pricePerDay,
      description,
      transmission,
      fuel,
      seats,
      ownerName,
      ownerPhone,
      licensePlate,
      location,
    } = body;

    // Validate: none of the important fields may be empty. (We check `image`
    // separately with a friendlier message because it comes from an upload.)
    if (
      !brand || !model || !type || !pricePerDay || !description ||
      !transmission || !fuel || !seats ||
      !ownerName || !ownerPhone || !licensePlate || !location
    ) {
      return apiError("Please fill in all the vehicle and owner details", 400);
    }

    if (!image) {
      return apiError("Please upload at least one photo of the vehicle", 400);
    }

    await connectDB();

    // Create the vehicle as a PENDING partner submission. It will not appear in
    // the public fleet until an admin approves it (see app/api/vehicles/route.ts).
    const vehicle = await vehicleModel.create({
      brand,
      model,
      type,
      image,                              // the cover photo (uploaded URL)
      images: Array.isArray(images) ? images : [], // any extra gallery photos
      pricePerDay,
      description,
      transmission,
      fuel,
      seats,
      availability: true,
      source: "partner",
      status: "pending",                  // waits for admin review
      ownerId: session.user.id,
      ownerName,
      ownerPhone,
      licensePlate,
      location,
    });

    // Promote the submitter from "user" to "partner" (unless they're already a
    // partner or an admin). This is what unlocks their partner dashboard view.
    await userModel.updateOne(
      { _id: session.user.id, role: "user" },
      { $set: { role: "partner" } }
    );

    return NextResponse.json(vehicle, { status: 201 }); // 201 = Created
  } catch (error) {
    console.error("Submit partner vehicle error:", error);
    return apiError(getErrorMessage(error, "Failed to submit your vehicle"), 500);
  }
}
