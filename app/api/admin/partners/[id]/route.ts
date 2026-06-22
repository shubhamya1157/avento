// ===========================================================================
// api/admin/partners/[id]/route.ts — Admin: move a partner application along
// ===========================================================================
//
// URL pattern: PATCH "/api/admin/partners/USER_ID" ([id] = the applicant's user
// id, which is also their KYC video room key). ADMIN-ONLY (requireAdmin).
//
// The application is a small state machine. This endpoint applies one ADMIN
// decision to it via an `action`:
//
//   pending_review --approve_details--> kyc_pending --kyc_pass--> approved (PARTNER)
//         |                                   |
//         +--------------reject---------------+----kyc_fail----> rejected
//
//   - approve_details : the details look good; proceed to the video KYC.
//   - kyc_pass        : KYC went well -> the user BECOMES a partner (role flips)
//                       and their submitted vehicle goes live in the fleet.
//   - reject / kyc_fail : turn the application down (records a note); the vehicle
//                       is marked rejected. The user may apply again later.
//
// Body: { action, note? }
// ===========================================================================

import { requireAdmin } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import userModel from "@/app/models/user";
import vehicleModel from "@/app/models/vehicle";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

type Action = "approve_details" | "reject" | "kyc_pass" | "kyc_fail";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await context.params;
    const { action, note } = (await req.json()) as { action: Action; note?: string };

    if (!["approve_details", "reject", "kyc_pass", "kyc_fail"].includes(action)) {
      return apiError("Unknown action", 400);
    }

    await connectDB();

    const user = await userModel.findById(id);
    if (!user) return apiError("Applicant not found", 404);
    if (user.partnerStatus === "none") {
      return apiError("This user has not applied to become a partner", 400);
    }

    // The vehicle the application is about (explicit link, else newest submission).
    let vehicle = user.applicationVehicleId
      ? await vehicleModel.findById(user.applicationVehicleId)
      : null;
    if (!vehicle) {
      vehicle = await vehicleModel
        .findOne({ ownerId: user._id, source: "partner" })
        .sort({ createdAt: -1 });
    }

    // Apply the decision, guarding that it's valid from the current stage.
    switch (action) {
      case "approve_details": {
        if (user.partnerStatus !== "pending_review") {
          return apiError("Details can only be approved while review is pending", 409);
        }
        user.partnerStatus = "kyc_pending";
        break;
      }
      case "kyc_pass": {
        if (user.partnerStatus !== "kyc_pending") {
          return apiError("KYC can only be completed after details are approved", 409);
        }
        // The moment someone actually becomes a partner.
        user.partnerStatus = "approved";
        user.role = "partner";
        user.kycNote = note ?? undefined;
        if (vehicle) {
          vehicle.status = "approved"; // the vehicle goes live in the public fleet
          await vehicle.save();
        }
        break;
      }
      case "reject":
      case "kyc_fail": {
        user.partnerStatus = "rejected";
        user.kycNote = note ?? "";
        if (vehicle) {
          vehicle.status = "rejected";
          vehicle.adminNote = note ?? "";
          await vehicle.save();
        }
        break;
      }
    }

    await user.save();

    return NextResponse.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      partnerStatus: user.partnerStatus,
      kycNote: user.kycNote,
      vehicle,
    });
  } catch (error) {
    console.error("Admin partner action error:", error);
    return apiError(getErrorMessage(error, "Failed to update application"), 500);
  }
}
