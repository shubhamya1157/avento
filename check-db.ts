// ===========================================================================
// check-db.ts — A tiny standalone script to inspect the database
// ===========================================================================
//
// This is NOT part of the website. It's a developer "tool" you run by hand from
// the terminal to peek at what's actually stored in MongoDB — handy for
// debugging. It connects, counts the vehicles, and prints how many of each
// brand/model exist (useful for spotting accidental duplicates).
//
// HOW TO RUN IT (from the project folder):
//   npx tsx check-db.ts
// (`tsx` runs a TypeScript file directly without a separate build step.)
// ===========================================================================

import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Read the database URL ourselves from the env file. The main app loads env
// variables automatically, but a standalone script like this doesn't, so we
// parse the file by hand. We read ".env.local", which is where this project
// keeps its real secrets (see .env.example for the template).
// ---------------------------------------------------------------------------
const envPath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");

// Turn the file's "KEY=value" lines into a lookup object.
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const key = parts[0].trim();
    // Re-join in case the value itself contained "=" characters.
    const val = parts.slice(1).join("=").trim();
    env[key] = val;
  }
});

const mongodbUrl = env.MONGODB_URL;
console.log("Connecting to:", mongodbUrl);

// A minimal vehicle schema — just enough fields for the counts we want. (We
// don't need the full schema here since we're only reading.)
const vehicleSchema = new mongoose.Schema({
  brand: String,
  model: String,
  type: String,
});

// Reuse-or-create the model (same hot-reload-safe pattern as the app's models).
const vehicleModel =
  mongoose.models.vehicleModel || mongoose.model("vehicleModel", vehicleSchema);

// ---------------------------------------------------------------------------
// The main routine. It's wrapped in an async function so we can `await` each
// database step in order.
// ---------------------------------------------------------------------------
async function run() {
  try {
    await mongoose.connect(mongodbUrl);
    console.log("Connected to MongoDB!");

    // Quick total, then load every vehicle so we can tally them up.
    const count = await vehicleModel.countDocuments();
    console.log("Total vehicles count:", count);

    const vehicles = await vehicleModel.find();
    console.log("Vehicles sample size:", vehicles.length);

    // Build a "brand model" -> count map to reveal any duplicates.
    const counts: Record<string, number> = {};
    for (const v of vehicles) {
      const key = `${v.brand} ${v.model}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    console.log("Counts per vehicle:", counts);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    // Always disconnect at the end so the script can exit cleanly.
    await mongoose.disconnect();
  }
}

run();
