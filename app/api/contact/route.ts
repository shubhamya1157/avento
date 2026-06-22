// ===========================================================================
// api/contact/route.ts — Receive a message from the /contact form
// ===========================================================================
//
// URL: POST /api/contact. PUBLIC (no login) — any visitor can reach out. We
// validate the required fields, SAVE the message to the database (the lasting
// record the team can read later), then BEST-EFFORT email a copy to the team.
//
// The email is a convenience only: if it isn't configured or fails, the request
// still succeeds because the message is already safely stored.
// ===========================================================================

import connectDB from "@/app/lib/db";
import contactMessageModel from "@/app/models/contactMessage";
import { sendContactNotification } from "@/app/lib/email";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Pull out the fields and coerce to trimmed strings (phone is optional).
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    // Every required field must be present, and the email must look real.
    if (!name || !subject || !message) {
      return apiError("Please fill in your name, subject, and message", 400);
    }
    if (!EMAIL_RE.test(email)) {
      return apiError("Please enter a valid email address", 400);
    }

    await connectDB();

    // 1. Persist — this is the record that matters.
    await contactMessageModel.create({ name, email, phone, subject, message });

    // 2. Best-effort notify the team. We don't await its success/failure as a
    //    gate — a false return just means email wasn't configured or hiccuped.
    await sendContactNotification({ name, email, phone, subject, message });

    return NextResponse.json(
      { message: "Thanks! Your message has been received — we'll be in touch soon." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return apiError(getErrorMessage(error, "Could not send your message right now"), 500);
  }
}
