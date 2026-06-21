// ===========================================================================
// api/admin/vehicles/route.ts — Admin: list partner vehicle submissions
// ===========================================================================
//
// URL: "/api/admin/vehicles". ADMIN-ONLY (guarded by requireAdmin). Returns the
// partner-submitted vehicles for the admin review queue.
//
//   GET /api/admin/vehicles               -> pending submissions (the default)
//   GET /api/admin/vehicles?status=approved -> approved ones, etc.
//   GET /api/admin/vehicles?status=all     -> every partner submission
// ===========================================================================

import { requireAdmin } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import vehicleModel from "@/app/models/vehicle";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    await connectDB();

    // Read the optional ?status= filter. Default to "pending" because that's the
    // review queue the admin cares about most.
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") ?? "pending";

    // Always limit to partner submissions (never the house fleet). Add the
    // status filter unless the admin asked for "all".
    const query: Record<string, unknown> = { source: "partner" };
    if (statusFilter !== "all") {
      query.status = statusFilter;
    }

    const vehicles = await vehicleModel.find(query).sort({ createdAt: -1 });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("Admin list vehicles error:", error);
    return apiError(getErrorMessage(error, "Failed to load submissions"), 500);
  }
}
