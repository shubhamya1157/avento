// ===========================================================================
// layout.tsx — The shell that wraps EVERY page in the app
// ===========================================================================
//
// In Next.js's App Router, layout.tsx is special: whatever you put here wraps
// around every page. It renders the <html> and <body> tags (the outermost
// structure of any web page) exactly once, and each page's content drops into
// the {children} slot.
//
// This is also where we put app-wide things: the page <title>, and the
// <Providers> wrapper that shares the login session everywhere (see
// Providers.tsx). Because it sets <html>/<body>, this file is NOT a 'use
// client' component — it runs on the server.
// ===========================================================================

import type { Metadata } from "next";
import Providers from "@/app/component/Providers";
import "./globals.css"; // load the global stylesheet (Tailwind) for the whole app

// `metadata` is read by Next.js to fill in the page's <head> — the browser tab
// title and the description search engines show. It's set here once for the app.
export const metadata: Metadata = {
  title: "Avento | Ready to move!",
  description: "Build by shubham yadav",
};

// The root layout component. `children` is whatever page is currently being
// shown. `Readonly<{...}>` just says we won't modify the props.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* The body's classes set the dark theme (black background, white text)
          and make it a vertical flex column that's at least full height. */}
      <body className="min-h-full flex flex-col bg-black text-white antialiased">
        {/* Wrap everything in Providers so any page can read the login session. */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
