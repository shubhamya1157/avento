// ===========================================================================
// api/admin/users/[id]/route.ts — Admin: permanently delete a user account
// ===========================================================================
//
// URL pattern: DELETE "/api/admin/users/SOME_ID". ADMIN-ONLY (requireAdmin).
//
// This HARD-deletes a user and cascades everything they own / created: the
// vehicles they submitted (and the bookings + reviews on those), the bookings
// they made (and those bookings' chat messages), the reviews they wrote, and the
// chat messages they sent. See app/lib/cascade-delete.ts for the full sweep.
//
// Pass ?dryRun=1 to PREVIEW — returns the same count summary WITHOUT deleting,
// so the admin UI can show the blast radius in a confirm dialog first.
//
// TWO SAFETY RAILS so an admin can't lock the platform (or themselves) out:
//   - you can't delete YOURSELF, and
//   - you can't delete ANOTHER ADMIN.
// ===========================================================================

import { requireAdmin } from "@/app/lib/guards";
import connectDB from "@/app/lib/db";
import userModel from "@/app/models/user";
import { cascadeDeleteUser } from "@/app/lib/cascade-delete";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await context.params;
    const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";

    // Rail 1: never delete your own account (would lock you out mid-action).
    if (id === session.user.id) {
      return apiError("You can't delete your own account", 400);
    }

    await connectDB();

    const target = await userModel.findById(id).select("role");
    if (!target) {
      // Dry-run of a missing user reports zeros; a real delete 404s.
      if (dryRun) return NextResponse.json({ dryRun, deleted: { bookings: 0, vehicles: 0, reviews: 0, messages: 0, users: 0 } });
      return apiError("User not found", 404);
    }

    // Rail 2: admins can't delete other admins (no removing each other).
    if (target.role === "admin") {
      return apiError("Admin accounts can't be deleted from here", 403);
    }

    const deleted = await cascadeDeleteUser(id, { dryRun });
    return NextResponse.json({ dryRun, deleted });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return apiError(getErrorMessage(error, "Failed to delete user"), 500);
  }
}
