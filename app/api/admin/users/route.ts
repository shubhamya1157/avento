// ===========================================================================
// api/admin/users/route.ts — Admin: list every user account
// ===========================================================================
//
// URL: "/api/admin/users". ADMIN-ONLY (guarded by requireAdmin). Returns all
// users so the admin "Users" page can show who has signed up and what role each
// one has (user / partner / admin).
//
// We deliberately ask Mongoose to LEAVE OUT the password field (".select(...)"
// with a leading "-" means "everything except this"), so a hashed password is
// never sent to the browser even by accident.
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

    // Newest accounts first; never include the password hash.
    const users = await userModel
      .find({})
      .select("-password")
      .sort({ createdAt: -1 });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Admin list users error:", error);
    return apiError(getErrorMessage(error, "Failed to load users"), 500);
  }
}
