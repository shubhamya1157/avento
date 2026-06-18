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

// "import" lines pull in code that lives in other files/packages so we can use
// it here. Think of it as borrowing a tool from another toolbox.
import type { Metadata } from "next";
import Providers from "@/app/component/Providers";
import "./globals.css"; // load the global stylesheet (Tailwind) for the whole app

// `metadata` is read by Next.js to fill in the page's <head> — the browser tab
// title and the description search engines show. It's set here once for the app.
export const metadata: Metadata = {
  title: "Avento:Ready to move!",
  description: "Build by shubham yadav",
};

// A "component" is a reusable piece of UI written as a function that returns
// what to show on screen. "Props" are the inputs you hand a component, like
// arguments to a function. Here the only prop is `children`.
//
// `children` is whatever page is currently being shown. `React.ReactNode` is
// just the type meaning "anything React can display" (text, tags, components).
// `Readonly<{...}>` says we promise not to modify the props we were given.
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
