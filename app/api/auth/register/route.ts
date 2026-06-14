// ===========================================================================
// api/auth/register/route.ts — Create a new account (direct sign-up)
// ===========================================================================
//
// WHAT IS AN "API ROUTE"?
// It's a piece of code that runs on the SERVER and answers requests from the
// browser. In Next.js, a file named route.ts inside app/api/ becomes a web
// address. This file lives at app/api/auth/register/, so the browser reaches it
// at the URL "/api/auth/register".
//
// We export a function named after the HTTP method it handles. `POST` is the
// method browsers use to SEND data to create something (here, a new user).
//
// NOTE: The app's main sign-up flow goes through send-otp + verify-otp (email
// verification). This simpler register route creates an account directly.
// ===========================================================================

import connectDB from "@/app/lib/db";
import userModel from "@/app/models/user";
import bcrypt from "bcryptjs";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Wrap everything in try/catch so that if ANY step throws, we send back a
  // clean error response instead of crashing the server.
  try {
    // 1. Read the data the browser sent. It arrives as JSON text; `.json()`
    //    turns it into a JavaScript object we can pick fields out of.
    const { name, email, password } = await req.json();

    // 2. Validate the input. Never trust data from the browser — always check.
    if (!name || !email || !password) {
      return apiError("All fields are required", 400);
    }

    if (password.length < 6) {
      return apiError("Password must be at least 6 characters long", 400);
    }

    // 3. Make sure the database is connected before querying it.
    await connectDB();

    // 4. Don't allow two accounts with the same email.
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return apiError("Email already exists", 400);
    }

    // 5. Scramble ("hash") the password before saving. bcrypt.hash turns
    //    "mypassword" into a long unreadable string. The `10` is the "cost":
    //    how much work the scrambling takes — higher is more secure but slower.
    //    We store ONLY the hash, so even we can never see the real password.
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. Create the user record in the database.
    const user = await userModel.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });

    // 7. Before replying, remove the password hash from the object so it never
    //    travels back to the browser. `.toObject()` makes a plain editable copy
    //    of the saved record first.
    const userObj = user.toObject();
    delete userObj.password;

    // 8. Success: send the new user back with status 201 ("Created").
    return NextResponse.json(userObj, { status: 201 });
  } catch (error) {
    // Something unexpected broke. Log the real reason for developers, and send
    // the user a generic message (with status 500 = server error).
    console.error("Registration error:", error);
    return apiError(getErrorMessage(error, "Registration failed"), 500);
  }
}
