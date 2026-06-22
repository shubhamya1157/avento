// ===========================================================================
// api/partner/bookings/route.ts — Bookings made on the partner's OWN vehicles
// ===========================================================================
//
// URL: "/api/partner/bookings". PROTECTED (must be logged in). Returns two kinds
// of work for this partner:
//   1. Bookings customers made on a vehicle THIS partner owns (their own rentals).
//   2. RIDES an admin DISPATCHED to this partner to drive (booking.driverId == me)
//      — these can be on the house fleet, which the partner doesn't own.
//
// The vehicle can live in TWO places (DB partner vehicles vs the static house
// fleet), so — like the admin bookings route — we resolve it by hand instead of
// a single .populate(), and tag each booking's vehicle with a small object (or
// null if it truly can't be found).
// ===========================================================================

import { requireUser } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import vehicleModel from "@/app/models/vehicle";
import bookingModel from "@/app/models/booking";
import userModel from "@/app/models/user";
import { STATIC_VEHICLES } from "@/app/lib/seed-vehicles";
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

    // 2. Find bookings that are EITHER on one of my vehicles OR a ride dispatched
    //    to me. (A partner with no listed vehicles can still have dispatched
    //    rides, so we always include the driverId clause.) Newest first; the
    //    customer is populated, the vehicle resolved by hand below.
    const bookings = await bookingModel
      .find({
        $or: [
          { vehicleId: { $in: vehicleIds } },
          { driverId: session.user.id },
        ],
      })
      .populate({ path: "userId", model: userModel, select: "name email" })
      .sort({ createdAt: -1 })
      .lean();

    if (bookings.length === 0) {
      return NextResponse.json([]);
    }

    // Resolve each booking's vehicle from the DB (partner vehicles) first, then
    // the static house fleet — covering dispatched fleet rides too.
    const ids = bookings.map((b) => b.vehicleId).filter(Boolean);
    const dbVehicles = await vehicleModel
      .find({ _id: { $in: ids } })
      .select("brand model image type")
      .lean();
    const partnerMap = new Map(dbVehicles.map((v) => [String(v._id), v]));
    const fleetMap = new Map(STATIC_VEHICLES.map((v) => [String(v._id), v]));

    const withVehicles = bookings.map((b) => {
      const vid = String(b.vehicleId);
      const v = partnerMap.get(vid) ?? fleetMap.get(vid) ?? null;
      return {
        ...b,
        vehicleId: v
          ? { _id: vid, brand: v.brand, model: v.model, image: v.image, type: v.type }
          : null,
      };
    });

    return NextResponse.json(withVehicles);
  } catch (error) {
    console.error("Fetch partner bookings error:", error);
    return apiError(getErrorMessage(error, "Failed to load your bookings"), 500);
  }
}
