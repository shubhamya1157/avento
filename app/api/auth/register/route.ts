import connectDB from "@/app/lib/db";
import userModel from "@/app/models/user";
import bcrypt from "bcryptjs";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return apiError("All fields are required", 400);
    }

    if (password.length < 6) {
      return apiError("Password must be at least 6 characters long", 400);
    }

    await connectDB();

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return apiError("Email already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });

    const userObj = user.toObject();
    delete userObj.password;

    return NextResponse.json(userObj, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return apiError(getErrorMessage(error, "Registration failed"), 500);
  }
}
