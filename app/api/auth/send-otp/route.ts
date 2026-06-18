// ===========================================================================
// api/auth/send-otp/route.ts — Step 1 of sign-up: email a verification code
// ===========================================================================
//
// URL: "/api/auth/send-otp". The sign-up form calls this first. It generates a
// random 6-digit code, emails it to the user, and remembers it for 10 minutes.
// Step 2 (verify-otp) checks the code and actually creates the account.
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db";
import userModel from "@/app/models/user";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { sendOTPEmail } from "@/app/lib/email";
import { saveOtp } from "@/app/lib/otp-store";

// ---------------------------------------------------------------------------
// Make a random 6-digit code as text, e.g. "047302".
//   Math.random()            -> a random decimal from 0 up to (not incl.) 1
//   * 900000                 -> spreads it across a 0–899999 range
//   + 100000                 -> shifts it to 100000–999999 (always 6 digits)
//   Math.floor(...)          -> drop the decimals to get a whole number
//   .toString()              -> turn the number into text
// ---------------------------------------------------------------------------
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    // Read the email the user typed.
    const { email } = await req.json();

    if (!email) {
      return apiError("Email is required", 400);
    }

    await connectDB();

    // Don't send a sign-up code to an email that already has an account.
    // `findOne({ email })` is a database query: "find one user with this email."
    // It returns the matching user, or null (nothing) if none exists.
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return apiError("Email already registered", 400);
    }

    // Generate the code.
    const otp = generateOTP();

    // Email the code FIRST. If sending fails, sendOTPEmail throws, we jump to
    // the catch block, and we never reach saveOtp — so we never remember a code
    // the user never actually received.
    await sendOTPEmail(email, otp);
    saveOtp(email, otp);

    // Tell the browser it worked so the UI can move to the "enter code" screen.
    return NextResponse.json(
      { success: true, message: "OTP sent to your email", email },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send OTP error:", error);
    return apiError(getErrorMessage(error, "Failed to send OTP"), 500);
  }
}
