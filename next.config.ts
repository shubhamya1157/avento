import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to be opened from the local network IP (e.g. a phone),
  // not just localhost. Without this, Next.js blocks the client JS over the
  // network URL and React never hydrates, leaving buttons unresponsive.
  allowedDevOrigins: ["10.171.138.140"],
};

export default nextConfig;
