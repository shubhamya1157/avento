// ===========================================================================
// db.ts — Connecting our app to the MongoDB database
// ===========================================================================
//
// WHAT IS A DATABASE?
// A database is just a place where we permanently store information (users,
// bookings, etc.) so it is still there after the server restarts. MongoDB is
// the database this project uses. "Mongoose" is a helper library that lets us
// talk to MongoDB using normal JavaScript instead of raw database commands.
//
// WHY IS THIS FILE A BIT TRICKY?
// In development, Next.js "hot reloads" — it re-runs your code every time you
// save a file. If we opened a brand-new database connection on every reload,
// we would quickly pile up hundreds of dead connections and crash the database.
//
// THE FIX (used below): we open ONE connection and remember it on the global
// object. `global` is a box that survives hot reloads, so the next reload finds
// the existing connection and reuses it instead of making a new one. This
// pattern is called "connection caching".
// ===========================================================================

import mongoose, { Connection } from "mongoose";

// ---------------------------------------------------------------------------
// Tell TypeScript that we are allowed to store our cached connection on the
// global object under the name `mongooseConn`. Without this declaration,
// TypeScript would complain that `global.mongooseConn` does not exist.
//
// The shape we store is:
//   - conn:    the live connection once it is ready (or null if not yet)
//   - promise: the "in progress" connection attempt (or null if none started)
// A Promise is JavaScript's way of saying "this value isn't ready yet, but it
// will be soon" — like a receipt you trade in later for the real thing.
// ---------------------------------------------------------------------------
declare global {
  var mongooseConn:
    | { conn: Connection | null; promise: Promise<Connection> | null }
    | undefined;
}

// Read the database address from the environment variables (the secret values
// kept in the .env.local file, never written directly in code). We accept two
// possible names, MONGODB_URL or MONGODB_URI, and use whichever one is set.
// `??` means "use the left side, but if it is missing, fall back to the right".
const mongodbUrl = process.env.MONGODB_URL ?? process.env.MONGODB_URI;

// If neither variable is set, there is no way to connect, so we stop the app
// immediately with a clear error instead of failing mysteriously later.
if (!mongodbUrl) {
  throw new Error("MONGODB_URL or MONGODB_URI must be set in environment variables");
}

// At this point TypeScript still thinks `mongodbUrl` *might* be undefined
// (because the check above is a separate statement). Assigning it to a value
// that is explicitly typed as `string` confirms to TypeScript: "it's definitely
// a string now."
const connectionString: string = mongodbUrl;

// Grab whatever is already cached on the global object (set on a previous
// hot reload). On the very first run this will be undefined.
let cached = global.mongooseConn;

// If nothing was cached yet, create the empty cache box and store it globally
// so future reloads can find it.
if (!cached) {
  cached = global.mongooseConn = { conn: null, promise: null };
}

// ---------------------------------------------------------------------------
// connectDB(): the function the rest of the app calls whenever it needs the
// database. It always returns the SAME connection, creating it only once.
//
// `async` means this function does work that takes time (talking to a server
// over the network), so it returns a Promise. Callers use `await connectDB()`
// to wait for the connection before running database queries.
// ---------------------------------------------------------------------------
async function connectDB(): Promise<Connection> {
  // 1. Best case: we already have a live connection. Return it instantly.
  //    (The `!` tells TypeScript "trust me, cached is not null here" — we made
  //    sure of that in the `if (!cached)` block above.)
  if (cached!.conn) {
    return cached!.conn;
  }

  // 2. No live connection yet. Have we already STARTED connecting?
  //    If not, start the connection now and store the in-progress promise.
  //    Storing the promise (not just the result) means that if two requests
  //    arrive at the same time, they both wait on the SAME attempt instead of
  //    each opening their own connection.
  if (!cached!.promise) {
    cached!.promise = mongoose
      .connect(connectionString)
      .then((instance) => instance.connection);
  }

  // 3. Wait for the connection attempt to finish.
  try {
    const conn = await cached!.promise; // pause here until connected
    cached!.conn = conn;                // remember the live connection
    return conn;
  } catch (error) {
    // If connecting failed, throw away the broken promise so the NEXT call can
    // try again from scratch (instead of forever awaiting a failed attempt).
    cached!.promise = null;
    throw error;
  }
}

// `export default` makes connectDB the main thing other files get when they
// write: import connectDB from "@/app/lib/db";
export default connectDB;
