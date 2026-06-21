// ===========================================================================
// cloudinary.ts — Storing uploaded photos in the cloud (Cloudinary), safely
// ===========================================================================
//
// Cloudinary is an online service that HOSTS images for us: we send it a photo,
// it stores it and gives back a permanent web address (URL) we can show anywhere.
//
// WHY USE IT? Saving photos to the server's own disk (see app/lib/upload.ts) is
// fine on your laptop, but many hosts (especially "serverless" ones like Vercel)
// wipe the disk between requests — so disk-saved photos vanish. Cloudinary keeps
// them safely off-box, served fast from a CDN.
//
// DESIGN CHOICE — graceful fallback (same idea as razorpay.ts): if the Cloudinary
// keys are NOT set, the app still works — uploads just fall back to local disk.
// The rest of the app uses `isCloudinaryConfigured()` to decide which to do.
// ===========================================================================

// The official Cloudinary SDK. `v2` is their current API; we rename it to a
// friendlier `cloudinary` for use below.
import { v2 as cloudinary } from "cloudinary";

// Read the three credentials from the environment (never hard-coded). Get these
// for free from the Cloudinary dashboard (https://cloudinary.com).
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// ---------------------------------------------------------------------------
// isCloudinaryConfigured: true only if ALL THREE credentials are present. The
// upload helper uses this to choose between cloud storage and local disk.
// ---------------------------------------------------------------------------
export function isCloudinaryConfigured(): boolean {
  return Boolean(cloudName && apiKey && apiSecret);
}

// Configure the SDK once, the first time we actually need it (lazy setup), so we
// don't repeat `cloudinary.config(...)` on every upload.
let configured = false;
function ensureConfigured() {
  if (!configured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    configured = true;
  }
}

// ---------------------------------------------------------------------------
// uploadImageToCloudinary: send one image (already read into a Buffer) up to
// Cloudinary and return its hosted URL.
//
// INPUTS:  `bytes` (the raw image data) and `mimeType` (e.g. "image/png").
// OUTPUT:  the permanent https URL of the stored image.
// THROWS:  if Cloudinary isn't configured, or the upload fails.
//
// HOW: Cloudinary's `upload()` accepts a "data URI" — the image encoded as a
// base64 text string with a small header saying what type it is. We build that
// from the buffer and hand it over. `folder: "avento"` keeps all our uploads
// tidily grouped inside the Cloudinary account.
// ---------------------------------------------------------------------------
export async function uploadImageToCloudinary(bytes: Buffer, mimeType: string): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured");
  }
  ensureConfigured();

  // Turn the raw bytes into a data URI: "data:image/png;base64,iVBORw0KGgo...".
  const dataUri = `data:${mimeType};base64,${bytes.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "avento",
  });

  // `secure_url` is the https address of the stored image — what we save + show.
  return result.secure_url;
}
