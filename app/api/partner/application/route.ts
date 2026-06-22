// ===========================================================================
// api/partner/application/route.ts — The applicant's own onboarding status
// ===========================================================================
//
// URL: GET "/api/partner/application". PROTECTED (any logged-in user).
//
// The /partner page reads this to decide WHAT to show: the application form, an
// "under review" panel, the "join your video KYC call" button, or the full
// partner dashboard. We return it FRESH from the database (not from the login
// token) because an admin can move the applicant forward — approve their details
// or pass their KYC — while they sit on the page, and we want that reflected
// without making them log out and back in.
//
// Reply: { role, partnerStatus, kycNote, vehicles }  (see PartnerApplicationState
// in app/lib/types.ts).
// ===========================================================================

import { requireUser } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import userModel from "@/app/models/user";
import vehicleModel from "@/app/models/vehicle";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { session, error } = await requireUser();
    if (error) return error;

    await connectDB();

    // The person's current role + where they are in the partner journey.
    const me = await userModel.findById(session.user.id).select("role partnerStatus kycNote");
    if (!me) return apiError("Account not found", 404);

    // Every vehicle they've submitted (any status), newest first — shown on the
    // dashboard both while applying and once they're a partner.
    const vehicles = await vehicleModel
      .find({ ownerId: session.user.id, source: "partner" })
      .sort({ createdAt: -1 });

    return NextResponse.json({
      role: me.role,
      partnerStatus: me.partnerStatus ?? "none",
      kycNote: me.kycNote,
      vehicles,
    });
  } catch (error) {
    console.error("Fetch partner application error:", error);
    return apiError(getErrorMessage(error, "Failed to load your application"), 500);
  }
}
