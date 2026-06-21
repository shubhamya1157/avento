// ===========================================================================
// roles.ts — Deciding who is an "admin"
// ===========================================================================
//
// We don't want to edit the database by hand just to make someone an admin.
// Instead, we keep a list of admin emails in an environment variable called
// ADMIN_EMAILS (see .env.local). Anyone who logs in with one of those emails is
// treated as an admin automatically.
//
// This tiny file lives on its own (instead of inside auth.ts) so that BOTH the
// login code (app/auth.ts) and the server-side guards (app/lib/guards.ts) can
// import it without creating an "import loop" (two files importing each other).
// ===========================================================================

// Read the comma-separated list from the environment, e.g.
//   ADMIN_EMAILS=alice@x.com, bob@y.com
// and turn it into a clean array of lowercased emails: ["alice@x.com", "bob@y.com"].
// `?? ""` guards against the variable being missing. `.split(",")` breaks the
// text on each comma, `.map(...)` trims spaces + lowercases each one, and
// `.filter(Boolean)` drops any empty pieces (e.g. from a trailing comma).
function adminEmailList(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// isAdminEmail: true if the given email is in the ADMIN_EMAILS list.
//
// We compare in lowercase so "Alice@X.com" and "alice@x.com" count as the same
// person (emails are not case-sensitive). Returns false for a missing email.
// ---------------------------------------------------------------------------
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailList().includes(email.toLowerCase());
}
