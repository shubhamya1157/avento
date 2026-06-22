// ===========================================================================
// api/subscribe/route.ts — Save a newsletter sign-up from the footer
// ===========================================================================
//
// URL: POST /api/subscribe. PUBLIC (no login) — anyone browsing the site can
// drop their email into the footer's "Subscribe" bar. We validate the address,
// store it (one row per email), and answer with a friendly message.
//
// Signing up twice is NOT an error from the visitor's point of view, so a
// duplicate email returns success ("already subscribed") rather than a failure.
// ===========================================================================

import connectDB from "@/app/lib/db";
import subscriberModel from "@/app/models/subscriber";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

// A light email sanity check — enough to reject obvious junk without being
// fussy about every exotic-but-valid address. The real guard is the unique index.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Must be a string that looks like an email.
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return apiError("Please enter a valid email address", 400);
    }
    const clean = email.trim().toLowerCase();

    await connectDB();

    // Already on the list? Treat that as success — the visitor's goal is met.
    const existing = await subscriberModel.findOne({ email: clean });
    if (existing) {
      return NextResponse.json({ message: "You're already subscribed — thanks!" });
    }

    await subscriberModel.create({ email: clean });
    return NextResponse.json({ message: "You're subscribed. Welcome to Avento!" }, { status: 201 });
  } catch (error) {
    // A race can still trip the unique index between the check and the insert;
    // mongoose flags that with code 11000. Treat it the same as "already on".
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000) {
      return NextResponse.json({ message: "You're already subscribed — thanks!" });
    }
    console.error("Subscribe error:", error);
    return apiError(getErrorMessage(error, "Could not subscribe right now"), 500);
  }
}
