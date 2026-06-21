// ===========================================================================
// api/upload/route.ts — Receive an uploaded photo and save it
// ===========================================================================
//
// URL: "/api/upload". The browser sends ONE image file here (as "multipart form
// data", the format browsers use for file uploads). We save it and reply with
// the public URL of the saved image, which the page then stores on the vehicle.
//
// PROTECTED: you must be logged in to upload (so random visitors can't fill the
// server's disk with files).
// ===========================================================================

import { requireUser } from "@/app/lib/guards";
import { storeUploadedImage } from "@/app/lib/upload";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// POST /api/upload — save one image, return { url }.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // Only logged-in users may upload.
    const { error } = await requireUser();
    if (error) return error;

    // Read the uploaded file out of the form data. The field is named "file".
    const formData = await req.formData();
    const file = formData.get("file");

    // `formData.get` returns null if the field is missing, or a string if it
    // wasn't actually a file. We need a real File object to continue.
    if (!file || !(file instanceof File)) {
      return apiError("No image file was provided", 400);
    }

    // Hand it to our helper, which validates and stores it (cloud or disk), then
    // returns the URL.
    const url = await storeUploadedImage(file);

    return NextResponse.json({ url }, { status: 201 }); // 201 = Created
  } catch (error) {
    console.error("Upload error:", error);
    // Type/size problems throw a clear message -> show it to the user as a 400.
    return apiError(getErrorMessage(error, "Failed to upload image"), 400);
  }
}
