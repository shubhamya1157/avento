// ===========================================================================
// api/admin/stats/route.ts — Admin: headline numbers for the dashboard
// ===========================================================================
//
// URL: "/api/admin/stats". ADMIN-ONLY. Returns a few counts the admin dashboard
// shows at a glance: how many submissions are waiting, how many users there are,
// total bookings, etc. `.countDocuments(...)` just counts matching rows without
// loading them, which is fast.
// ===========================================================================

import { requireAdmin } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import vehicleModel from "@/app/models/vehicle";
import userModel from "@/app/models/user";
import bookingModel from "@/app/models/booking";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    await connectDB();

    // Run all the counts at once with Promise.all (they don't depend on each
    // other, so doing them in parallel is faster than one after another).
    const [pending, approved, partners, users, bookings] = await Promise.all([
      vehicleModel.countDocuments({ source: "partner", status: "pending" }),
      vehicleModel.countDocuments({ source: "partner", status: "approved" }),
      userModel.countDocuments({ role: "partner" }),
      userModel.countDocuments({}),
      bookingModel.countDocuments({}),
    ]);

    return NextResponse.json({ pending, approved, partners, users, bookings });
  } catch (error) {
    console.error("Admin stats error:", error);
    return apiError(getErrorMessage(error, "Failed to load stats"), 500);
  }
}
