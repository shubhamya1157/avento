// ===========================================================================
// razorpay-client.ts — Browser-side Razorpay checkout helpers (shared)
// ===========================================================================
//
// Both the rental popup (BookingModal) and the ride wizard (/ride) open the same
// Razorpay checkout. To avoid two copies drifting apart, the shared bits live
// here:
//   - the `Window.Razorpay` type declaration (so TypeScript knows the global the
//     checkout script adds), and
//   - `loadRazorpayScript()`, which injects Razorpay's checkout.js once.
//
// This is a tiny browser-only module — no React, no server code.
// ===========================================================================

// Razorpay's checkout adds a `Razorpay` constructor onto the browser's global
// `window` once its script loads. TypeScript doesn't know about it, so we
// declare it here (typed loosely, as it's a third-party script). Declared ONCE
// for the whole app so the rental + ride flows share the same type.
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

// Is real payment switched on? Next.js inlines `process.env.NEXT_PUBLIC_*` into
// the browser build, so this is a plain string. If set, we run the Razorpay
// checkout; if blank (the default), the app falls back to a "demo" booking.
export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
export const razorpayEnabled = Boolean(RAZORPAY_KEY_ID);

// ---------------------------------------------------------------------------
// loadRazorpayScript: make sure Razorpay's checkout.js is loaded before we try
// to open the popup. Adds the <script> tag the first time and reuses it after.
// Resolves true once it's ready, false if it couldn't load (offline/blocked).
// ---------------------------------------------------------------------------
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    // Already loaded on a previous booking? Then we're good immediately.
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false); // network blocked / offline
    document.body.appendChild(script);
  });
}
