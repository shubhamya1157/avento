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
