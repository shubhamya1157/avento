// ===========================================================================
// api/auth/verify-otp/route.ts — Step 2 of sign-up: check code, create account
// ===========================================================================
//
// URL: "/api/auth/verify-otp". After send-otp emailed a code, the form sends it
// back here along with the user's details. If the code is right, we finally
// create the verified account.
//
// "OTP" = One-Time Password: a short code that's good once, for a short time.
// This is a POST route (the browser SENDS data here to create the account).
// ===========================================================================

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db";
import userModel from "@/app/models/user";
import bcrypt from "bcryptjs";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { verifyOtp } from "@/app/lib/otp-store";

export async function POST(req: NextRequest) {
  try {
    // The browser sends everything needed to create the account in one go:
    // the code (otp) plus the name/email/password from the first form.
    const { email, otp, name, password } = await req.json();

    if (!email || !otp || !name || !password) {
      return apiError("All fields are required", 400);
    }

    if (password.length < 6) {
      return apiError("Password must be at least 6 characters long", 400);
    }

    // Check the code BEFORE touching the database. If it's wrong/expired,
    // verifyOtp returns the exact message and status to send back, and we stop
    // here — no point doing database work for a failed verification.
    const result = verifyOtp(email, otp);
    if (!result.ok) {
      return apiError(result.message, result.status);
    }

    await connectDB();

    // Safety re-check: it's possible (though unlikely) that an account with
    // this email appeared in the brief window between sending and verifying.
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return apiError("Email already registered", 400);
    }

    // Scramble the password (see register route for why), then create the user.
    // Note emailVerified is set to true here because they just proved the email
    // is theirs by entering the correct code.
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      emailVerified: true,
    });

    // Strip the password hash out of the reply. `.toObject()` makes a plain,
    // editable copy of the saved record, and `delete` removes the password
    // field from that copy so the scrambled password never goes to the browser.
    const userObj = user.toObject();
    delete userObj.password;

    return NextResponse.json(
      {
        success: true,
        message: "Email verified successfully. Account created!",
        user: userObj,
      },
      { status: 201 } // 201 = Created
    );
  } catch (error) {
    console.error("Verify OTP error:", error);
    return apiError(getErrorMessage(error, "Verification failed"), 500);
  }
}
