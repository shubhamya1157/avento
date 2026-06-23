// ===========================================================================
// api/admin/vehicles/[id]/route.ts — Admin: approve or reject a submission
// ===========================================================================
//
// URL pattern: "/api/admin/vehicles/SOME_ID". The "[id]" folder is a dynamic
// route: [id] stands in for the vehicle's id from the URL.
//
// PATCH here flips a partner submission's status to "approved" or "rejected"
// (and optionally records an admin note, e.g. the reason for a rejection).
// Approving a vehicle is what makes it appear in the public fleet for renters.
// ADMIN-ONLY (guarded by requireAdmin).
// ===========================================================================

import { requireAdmin } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import vehicleModel from "@/app/models/vehicle";
import { cascadeDeleteVehicle } from "@/app/lib/cascade-delete";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await context.params;
    const { status, adminNote } = await req.json();

    // Only these two decisions are allowed from this endpoint.
    if (status !== "approved" && status !== "rejected") {
      return apiError("Status must be 'approved' or 'rejected'", 400);
    }

    await connectDB();

    const vehicle = await vehicleModel.findById(id);
    if (!vehicle) {
      return apiError("Vehicle not found", 404);
    }

    // Guard: this endpoint is only for reviewing PARTNER submissions, never the
    // house fleet.
    if (vehicle.source !== "partner") {
      return apiError("This vehicle is not a partner submission", 400);
    }

    // Apply the decision and save it.
    vehicle.status = status;
    vehicle.adminNote = adminNote ?? "";
    await vehicle.save();

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("Admin review vehicle error:", error);
    return apiError(getErrorMessage(error, "Failed to update submission"), 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/vehicles/[id] — permanently remove a partner vehicle and
// everything tied to it (its bookings + those bookings' chat messages + its
// reviews; see app/lib/cascade-delete.ts). ADMIN-ONLY.
//
// Only PARTNER submissions live in the database and can be deleted here — the
// house fleet is a static list (app/lib/seed-vehicles.ts), so there's nothing to
// delete for those. Pass ?dryRun=1 to preview the counts without deleting.
// ---------------------------------------------------------------------------
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await context.params;
    const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";

    await connectDB();

    const vehicle = await vehicleModel.findById(id).select("source");
    if (!vehicle) {
      // A dry-run of a missing vehicle just reports zeros; a real delete 404s.
      if (dryRun) return NextResponse.json({ dryRun, deleted: { bookings: 0, vehicles: 0, reviews: 0, messages: 0, users: 0 } });
      return apiError("Vehicle not found", 404);
    }
    // Never delete a house-fleet row through here (it shouldn't exist in the DB,
    // but guard anyway so a stray seeded doc can't be wiped by mistake).
    if (vehicle.source !== "partner") {
      return apiError("Only partner submissions can be deleted", 400);
    }

    const deleted = await cascadeDeleteVehicle(id, { dryRun });
    return NextResponse.json({ dryRun, deleted });
  } catch (error) {
    console.error("Admin delete vehicle error:", error);
    return apiError(getErrorMessage(error, "Failed to delete vehicle"), 500);
  }
}
