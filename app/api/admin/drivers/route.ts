// ===========================================================================
// api/admin/drivers/route.ts — Admin: list the drivers a ride can be sent to
// ===========================================================================
//
// URL: "/api/admin/drivers". ADMIN-ONLY (guarded by requireAdmin). Returns the
// people an admin may DISPATCH a ride to — i.e. run it as the driver.
//
// WHO QUALIFIES: only APPROVED PARTNERS. A partner reaches "approved" by passing
// the one-time video KYC, so the pool is already vetted. (A house-fleet ride has
// no owner of its own, which is exactly why dispatch exists: the admin hands the
// ride to a trusted partner to actually drive.)
// ===========================================================================

import { requireAdmin } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import userModel from "@/app/models/user";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    await connectDB();

    // Only vetted (KYC-passed) partners can be handed a ride. We return just the
    // name + email the admin needs to pick one — no other personal details.
    const drivers = await userModel
      .find({ partnerStatus: "approved" })
      .select("name email")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(drivers);
  } catch (error) {
    console.error("List drivers error:", error);
    return apiError(getErrorMessage(error, "Failed to load drivers"), 500);
  }
}
