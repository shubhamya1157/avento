import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/db";
import userModel from "@/app/models/user";
import bcrypt from "bcryptjs";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { verifyOtp } from "@/app/lib/otp-store";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, name, password } = await req.json();

    if (!email || !otp || !name || !password) {
      return apiError("All fields are required", 400);
    }

    if (password.length < 6) {
      return apiError("Password must be at least 6 characters long", 400);
    }

    // Check the OTP before touching the database.
    const result = verifyOtp(email, otp);
    if (!result.ok) {
      return apiError(result.message, result.status);
    }

    await connectDB();

    // Guard against a duplicate account created between sending and verifying.
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return apiError("Email already registered", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      emailVerified: true,
    });

    // Return the user without the password hash.
    const userObj = user.toObject();
    delete userObj.password;

    return NextResponse.json(
      {
        success: true,
        message: "Email verified successfully. Account created!",
        user: userObj,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Verify OTP error:", error);
    return apiError(getErrorMessage(error, "Verification failed"), 500);
  }
}
