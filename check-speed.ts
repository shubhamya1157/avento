// ===========================================================================
// check-speed.ts — A tiny script to measure the vehicles API response time
// ===========================================================================
//
// Also a developer tool, not part of the website. It calls the running app's
// "/api/vehicles" endpoint five times and prints how many milliseconds each
// request took — a quick way to sanity-check that the API is fast.
//
// HOW TO RUN IT:
//   1. Start the app in another terminal:  npm run dev
//   2. Then run this script:               npx tsx check-speed.ts
// (It talks to http://localhost:3000, so the dev server must be running.)
// ===========================================================================

import http from "http";

// ---------------------------------------------------------------------------
// Make ONE request to the vehicles API and resolve with how long it took, in
// milliseconds. We wrap the callback-style http.get in a Promise so the caller
// can simply `await` it. On error we resolve with -1 to signal a failure.
// ---------------------------------------------------------------------------
function fetchVehicles(): Promise<number> {
  return new Promise((resolve) => {
    const start = Date.now(); // timestamp before the request
    http
      .get("http://localhost:3000/api/vehicles", (res) => {
        let data = "";
        // The response arrives in chunks; collect them all...
        res.on("data", (chunk) => (data += chunk));
        // ...then, once finished, report the elapsed time (now minus start).
        res.on("end", () => {
          resolve(Date.now() - start);
        });
      })
      .on("error", () => {
        resolve(-1); // request failed (e.g. server not running)
      });
  });
}

// Run five timed requests, one after another, and print each result.
async function run() {
  console.log("Checking api response times...");
  for (let i = 0; i < 5; i++) {
    const ms = await fetchVehicles();
    console.log(`Request ${i + 1}: ${ms} ms`);
  }
}

run();
