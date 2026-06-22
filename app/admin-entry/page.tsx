// ===========================================================================
// admin-entry/page.tsx — A tiny "where should I go after login?" router
// ===========================================================================
//
// When someone logs in with Google, NextAuth does a full-page redirect to a
// `callbackUrl` we choose up front — BEFORE we know whether that person is an
// admin. So we can't decide their destination at click time. Instead we point
// Google's callbackUrl at THIS page, which runs on the server, reads the now-
// established session, and forwards them:
//   - admins  -> /admin   (straight into the panel)
//   - everyone else -> /  (the public home page)
//
// (The email/password login handles its own redirect inside AuthModal, where it
// can read the session without a full page reload. This page is mainly for the
// Google flow, but it's safe to send any login through it.)
//
// This file has no "use client" line, so it's a SERVER component: it runs on the
// server only, which is exactly where we want to check the session and redirect.
// ===========================================================================

import { redirect } from "next/navigation"; // server-side "go to this URL" helper
import { auth } from "@/app/auth";           // "who is logged in right now?" (server)

// A page is an async function here because reading the session (auth()) is a
// slow, awaitable step. It never returns visible markup — it always redirects.
export default async function AdminEntryPage() {
  // Ask the server who is signed in. `session` is null if nobody is.
  const session = await auth();

  // Admins go straight to the panel; everyone else lands on the home page.
  if (session?.user?.role === "admin") {
    redirect("/admin");
  }

  redirect("/");
}
