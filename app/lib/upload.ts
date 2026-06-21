// ===========================================================================
// upload.ts — Storing an uploaded photo (cloud if available, else local disk)
// ===========================================================================
//
// When a partner lists a vehicle they upload photos. This file takes ONE
// uploaded file, checks it's a real image of a sensible size, and stores it —
// returning the public web address (URL) of the stored photo so we can show it
// later.
//
// WHERE does it get stored? Two options, chosen automatically:
//   1. CLOUDINARY (preferred) — if the Cloudinary keys are set (see
//      app/lib/cloudinary.ts), the photo is uploaded to the cloud and we get
//      back a permanent https URL. This is what a real deployment should use,
//      because many hosts wipe the local disk between requests.
//   2. LOCAL DISK (fallback) — if Cloudinary isn't configured, we save into the
//      `public/uploads/` folder instead. Anything in `public/` is served by
//      Next.js at the matching URL, so a file at `public/uploads/x.jpg` is
//      reachable at `/uploads/x.jpg`. Perfect for local development / demos.
//
// The caller (app/api/upload/route.ts) just calls storeUploadedImage() and gets
// a URL back — it doesn't need to know or care which of the two was used.
// ===========================================================================

// Node's built-in tools for working with files and folder paths. `fs/promises`
// is the async (await-able) version of the file system module.
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto"; // built-in: makes a random unique id, no extra package
import { isCloudinaryConfigured, uploadImageToCloudinary } from "@/app/lib/cloudinary";

// The biggest file we allow (5 megabytes). Stops someone uploading a huge file.
const MAX_BYTES = 5 * 1024 * 1024;

// The image formats we accept, mapped to the file extension we'll save them as.
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// ---------------------------------------------------------------------------
// storeUploadedImage: validate one uploaded file, then store it in the cloud
// (if configured) or on local disk — whichever is available.
//
// INPUT:  a `File` (the browser's representation of an uploaded file).
// OUTPUT: the public URL of the stored image (a Cloudinary https URL, or a local
//         "/uploads/<random>.jpg" path).
// THROWS: a clear Error if the file is the wrong type or too big — the calling
//         route catches it and turns it into a 400 response.
// ---------------------------------------------------------------------------
export async function storeUploadedImage(file: File): Promise<string> {
  // 1. Type check: only allow real image formats from the list above.
  const ext = ALLOWED[file.type];
  if (!ext) {
    throw new Error("Only JPG, PNG, WEBP or GIF images are allowed");
  }

  // 2. Size check: reject anything over our limit.
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large (max 5MB)");
  }

  // 3. Read the file's raw bytes. `arrayBuffer()` gives the data; `Buffer.from`
  //    converts it into the form Node/Cloudinary need.
  const bytes = Buffer.from(await file.arrayBuffer());

  // 4. Prefer the cloud when it's set up; otherwise save to local disk.
  if (isCloudinaryConfigured()) {
    return uploadImageToCloudinary(bytes, file.type);
  }
  return saveBytesToDisk(bytes, ext);
}

// ---------------------------------------------------------------------------
// saveBytesToDisk: the local-disk fallback. Writes the bytes into
// public/uploads/ under a unique filename and returns its public path.
// ---------------------------------------------------------------------------
async function saveBytesToDisk(bytes: Buffer, ext: string): Promise<string> {
  // Make sure the destination folder exists. `recursive: true` means "create any
  // missing parent folders too, and don't error if it already exists".
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  // Build a unique filename so two uploads never clash, then write the file.
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(uploadDir, filename), bytes);

  // Return the PUBLIC path (not the disk path) for storing/showing.
  return `/uploads/${filename}`;
}
