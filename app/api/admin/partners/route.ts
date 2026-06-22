// ===========================================================================
// api/admin/partners/route.ts — Admin: the partner-application review queue
// ===========================================================================
//
// URL: GET "/api/admin/partners". ADMIN-ONLY (requireAdmin).
//
// Lists people applying to become partners, so the admin can vet their details
// and run the video KYC. By default it returns the ACTIVE queue (applications
// still awaiting a decision); pass ?status=all to include decided ones too.
//
// Each row pairs the applicant (a user) with the vehicle they submitted, so the
// admin sees both the person AND the car on one card. See PartnerApplication in
// app/lib/types.ts for the shape.
// ===========================================================================

import { requireAdmin } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import userModel from "@/app/models/user";
import vehicleModel from "@/app/models/vehicle";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    await connectDB();

    // ?status=all shows decided applications too; the default is the live queue
    // (details to review + KYC to run).
    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get("status") === "all";
    const statuses = showAll
      ? ["pending_review", "kyc_pending", "approved", "rejected"]
      : ["pending_review", "kyc_pending"];

    const applicants = await userModel
      .find({ partnerStatus: { $in: statuses } })
      .sort({ updatedAt: -1 });

    // For each applicant, attach the vehicle their application is for. We prefer
    // the explicit applicationVehicleId; if it's missing (older data) we fall
    // back to their most recent partner submission.
    const applications = await Promise.all(
      applicants.map(async (u) => {
        let vehicle = u.applicationVehicleId
          ? await vehicleModel.findById(u.applicationVehicleId)
          : null;
        if (!vehicle) {
          vehicle = await vehicleModel
            .findOne({ ownerId: u._id, source: "partner" })
            .sort({ createdAt: -1 });
        }
        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          partnerStatus: u.partnerStatus,
          kycNote: u.kycNote,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          vehicle,
        };
      })
    );

    return NextResponse.json(applications);
  } catch (error) {
    console.error("Admin list partner applications error:", error);
    return apiError(getErrorMessage(error, "Failed to load applications"), 500);
  }
}
