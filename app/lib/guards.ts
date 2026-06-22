// ===========================================================================
// guards.ts — Reusable "who's allowed in?" checks for our API routes
// ===========================================================================
//
// Many of our API routes start the same way: "is someone logged in?" and, for
// admin-only routes, "are they actually an admin?". Instead of copy-pasting that
// check into every file, we write it once here and reuse it. This is the
// "Don't Repeat Yourself" (DRY) principle — fix a bug once, fixed everywhere.
//
// HOW TO USE THESE (the pattern every route follows):
//
//     const { session, error } = await requireAdmin();
//     if (error) return error;   // not allowed -> send the ready-made error reply
//     // ...from here on, `session` is guaranteed to be a logged-in admin.
//
// Each helper returns an object with TWO fields:
//   - session: the logged-in user's info (or null if the check failed)
//   - error:   a ready-to-return error response (or null if the check passed)
// Exactly one of them is filled in, so the caller just checks `error` first.
// ===========================================================================

import { auth } from "@/app/auth";              // "who is logged in?" (reads the session)
import { apiError } from "@/app/lib/api-response"; // builds a JSON error response
import { isAdminEmail } from "@/app/lib/roles";    // is this email an admin email?
import type { Session } from "next-auth";          // the shape of a logged-in session

// The shape every guard hands back: either a session (and no error) on success,
// or an error (and no session) on failure.
type GuardResult = { session: Session; error: null } | { session: null; error: ReturnType<typeof apiError> };

// ---------------------------------------------------------------------------
// requireUser: pass only if SOMEONE is logged in (any role).
// ---------------------------------------------------------------------------
export async function requireUser(): Promise<GuardResult> {
  const session = await auth();

  // No session, or a session with no user id, means "not logged in" -> 401.
  if (!session?.user?.id) {
    return { session: null, error: apiError("Unauthorized", 401) };
  }

  return { session, error: null };
}

// ---------------------------------------------------------------------------
// requireAdmin: pass only if the logged-in user is an admin.
//
// 401 (Unauthorized) = "we don't know who you are" (not logged in).
// 403 (Forbidden)    = "we know who you are, but you're not allowed here".
// ---------------------------------------------------------------------------
export async function requireAdmin(): Promise<GuardResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { session: null, error: apiError("Unauthorized", 401) };
  }

  // Trust the role on the session, but ALSO accept the ADMIN_EMAILS list as a
  // fallback (so a brand-new admin works even before their token refreshes).
  const isAdmin = session.user.role === "admin" || isAdminEmail(session.user.email);
  if (!isAdmin) {
    return { session: null, error: apiError("Admin access required", 403) };
  }

  return { session, error: null };
}

// NOTE: there used to be a `requireCustomer` guard here that blocked partners and
// admins from booking. That rule was removed — on Avento everyone who's logged in
// can rent and ride (a partner might want to book someone else's car too). Booking
// entry points now use `requireUser` (just "are you logged in?") instead.
