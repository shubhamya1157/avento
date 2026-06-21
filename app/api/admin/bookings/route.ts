// ===========================================================================
// api/admin/bookings/route.ts — Admin: list EVERY booking on the platform
// ===========================================================================
//
// URL: "/api/admin/bookings". ADMIN-ONLY (guarded by requireAdmin). Unlike
// "/api/bookings" (which returns only the logged-in user's own bookings), this
// returns ALL bookings so an admin can oversee activity across the whole site.
//
// We "populate" two references on each booking so the admin sees real names
// instead of raw ids:
//   - vehicleId -> the vehicle's brand/model/image (what was booked)
//   - userId    -> the customer's name/email (who booked it)
// ===========================================================================

import { requireAdmin } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import bookingModel from "@/app/models/booking";
import vehicleModel from "@/app/models/vehicle";
import userModel from "@/app/models/user";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    await connectDB();

    const bookings = await bookingModel
      .find({})
      // Fill in the linked vehicle (just the fields the table needs)…
      .populate({ path: "vehicleId", model: vehicleModel, select: "brand model image type" })
      // …and the customer who made the booking (name + email only).
      .populate({ path: "userId", model: userModel, select: "name email" })
      .sort({ createdAt: -1 }); // newest first

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Admin list bookings error:", error);
    return apiError(getErrorMessage(error, "Failed to load bookings"), 500);
  }
}
