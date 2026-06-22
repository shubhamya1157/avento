// ===========================================================================
// api/admin/bookings/route.ts — Admin: list EVERY booking on the platform
// ===========================================================================
//
// URL: "/api/admin/bookings". ADMIN-ONLY (guarded by requireAdmin). Unlike
// "/api/bookings" (which returns only the logged-in user's own bookings), this
// returns ALL bookings so an admin can oversee activity across the whole site.
//
// We attach each booking's vehicle and customer so the admin sees real names
// instead of raw ids. The vehicle can come from TWO places, so we can't just
// `.populate()` it:
//   - PARTNER vehicles live in the database (populate would find them), and
//   - HOUSE-FLEET vehicles are the static list in seed-vehicles.ts — they're
//     NOT in the database, so a populate returns null for them.
// To cover both we keep the raw vehicle id, then resolve it against the partner
// collection first and the static fleet second, tagging where it came from
// (`source: "partner" | "fleet"`). That `source` also lets the admin page show
// Accept/Reject only for HOUSE-FLEET rental requests (partners decide their own).
// ===========================================================================

import { requireAdmin } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import bookingModel from "@/app/models/booking";
import vehicleModel from "@/app/models/vehicle";
import userModel from "@/app/models/user";
import { STATIC_VEHICLES } from "@/app/lib/seed-vehicles";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    await connectDB();

    // Pull every booking, newest first, with just the customer filled in. We
    // use .lean() so we get plain objects we can freely reshape below, and we
    // deliberately DON'T populate the vehicle (see the header note for why).
    const bookings = await bookingModel
      .find({})
      .populate({ path: "userId", model: userModel, select: "name email" })
      .sort({ createdAt: -1 })
      .lean();

    // Gather the vehicle ids and look up any that are real PARTNER vehicles in
    // the database, in one query. We build a Map (id -> vehicle) for fast lookup.
    const vehicleIds = bookings.map((b) => b.vehicleId).filter(Boolean);
    const partnerVehicles = await vehicleModel
      .find({ _id: { $in: vehicleIds } })
      .select("brand model image type")
      .lean();
    const partnerMap = new Map(partnerVehicles.map((v) => [String(v._id), v]));
    // The static house-fleet list, also keyed by id for quick lookup.
    const fleetMap = new Map(STATIC_VEHICLES.map((v) => [String(v._id), v]));

    // Reshape each booking so `vehicleId` is a small {brand, model, …, source}
    // object (or null if the vehicle truly can't be found anywhere).
    const withVehicles = bookings.map((b) => {
      const id = String(b.vehicleId);
      const partner = partnerMap.get(id);
      const fleet = fleetMap.get(id);
      const v = partner ?? fleet ?? null;
      return {
        ...b,
        vehicleId: v
          ? {
              _id: id,
              brand: v.brand,
              model: v.model,
              image: v.image,
              type: v.type,
              // "partner" = an owner handles its requests; "fleet" = the admin does.
              source: partner ? "partner" : "fleet",
            }
          : null,
      };
    });

    return NextResponse.json(withVehicles);
  } catch (error) {
    console.error("Admin list bookings error:", error);
    return apiError(getErrorMessage(error, "Failed to load bookings"), 500);
  }
}
