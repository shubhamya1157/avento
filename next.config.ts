// ===========================================================================
// next.config.ts — The main settings file for the Next.js framework
// ===========================================================================
//
// Next.js is the framework this whole website is built on (it handles pages,
// routing, the dev server, and the production build). This "config" file (a
// settings file) is where we adjust how Next.js behaves for THIS project.
//
// We only change one setting here: which network addresses are allowed to open
// the development server. Everything else uses Next.js's sensible defaults.
// ===========================================================================

// Pull in the TYPE that describes the shape of a valid Next.js config, so the
// editor can warn us if we mistype an option name. ("import type" brings in
// type information only — nothing that runs.)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to be opened from the local network IP (e.g. a phone),
  // not just localhost. Without this, Next.js blocks the client JS over the
  // network URL and React never hydrates — buttons go dead and JS-driven
  // animations never start.
  //
  // We list the current machine IP AND a "10.171.138.*" wildcard so this keeps
  // working even when the LAN IP changes (which happens routinely with Wi-Fi /
  // DHCP). If your network uses a different range, run `npm run dev`, look at the
  // "Network:" URL it prints, and add that IP (or its `x.x.x.*` range) here.
  //
  // TIP: opening http://localhost:3000 on THIS computer never needs this list —
  // it only matters when visiting from another device over the network.
  allowedDevOrigins: ["10.171.138.136", "10.171.138.*"],
};

export default nextConfig;
