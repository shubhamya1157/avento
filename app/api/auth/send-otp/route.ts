import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db";
import userModel from "@/app/models/user";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { sendOTPEmail } from "@/app/lib/email";
import { saveOtp } from "@/app/lib/otp-store";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return apiError("Email is required", 400);
    }

    await connectDB();

    // Don't send an OTP if the account already exists.
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return apiError("Email already registered", 400);
    }

    const otp = generateOTP();

    // Email the code first; only remember it if sending succeeds.
    await sendOTPEmail(email, otp);
    saveOtp(email, otp);

    return NextResponse.json(
      { success: true, message: "OTP sent to your email", email },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send OTP error:", error);
    return apiError(getErrorMessage(error, "Failed to send OTP"), 500);
  }
}
