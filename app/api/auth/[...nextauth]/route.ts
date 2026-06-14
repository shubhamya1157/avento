// ===========================================================================
// api/auth/[...nextauth]/route.ts — The login system's web endpoints
// ===========================================================================
//
// This tiny file wires up ALL of NextAuth's built-in URLs (sign in, sign out,
// the Google callback, session checks, and more).
//
// The folder name "[...nextauth]" is a Next.js "catch-all route": the [...]
// means it matches ANY path underneath /api/auth/ — for example
// /api/auth/signin, /api/auth/callback/google, /api/auth/session, etc. NextAuth
// needs many such URLs, and this one file handles them all.
//
// We built those request handlers back in app/auth.ts (the `handlers` object).
// Here we just expose its GET and POST functions so the browser can call them.
// There's no custom logic to add — NextAuth does the work.
// ===========================================================================

import { handlers } from "@/app/auth";

export const { GET, POST } = handlers;
