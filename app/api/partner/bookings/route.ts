// ===========================================================================
// api/partner/bookings/route.ts — Bookings made on the partner's OWN vehicles
// ===========================================================================
//
// URL: "/api/partner/bookings". PROTECTED (must be logged in). Returns every
// booking a customer has made on a vehicle THIS partner owns — so the partner
// can see who booked what, and chat with them.
//
// HOW: first find the ids of the vehicles this user owns, then find all bookings
// that point at any of those vehicles, with the vehicle and the customer filled
// in (populated) so the page can show real names.
// ===========================================================================

import { requireUser } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import vehicleModel from "@/app/models/vehicle";
import bookingModel from "@/app/models/booking";
import userModel from "@/app/models/user";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { session, error } = await requireUser();
    if (error) return error;

    await connectDB();

    // 1. Which vehicles does this partner own? We only need their ids.
    const myVehicles = await vehicleModel
      .find({ ownerId: session.user.id, source: "partner" })
      .select("_id");
    const vehicleIds = myVehicles.map((v) => v._id);

    // No vehicles -> no bookings. Return early with an empty list.
    if (vehicleIds.length === 0) {
      return NextResponse.json([]);
    }

    // 2. All bookings on any of those vehicles, newest first, with the vehicle
    //    and the booking customer filled in.
    const bookings = await bookingModel
      .find({ vehicleId: { $in: vehicleIds } })
      .populate({ path: "vehicleId", model: vehicleModel, select: "brand model image type" })
      .populate({ path: "userId", model: userModel, select: "name email" })
      .sort({ createdAt: -1 });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Fetch partner bookings error:", error);
    return apiError(getErrorMessage(error, "Failed to load your bookings"), 500);
  }
}
