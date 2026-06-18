// ===========================================================================
// page.tsx — The HOME page (the "/" route)
// ===========================================================================
//
// In Next.js's App Router, a file named page.tsx defines a page, and its
// location is its web address. This one sits at the top of the app/ folder, so
// it is the home page at "/".
//
// It simply stacks the three building blocks of the home screen in order:
//   Nav (top bar)  →  PublicHome (hero + vehicle slider)  →  Footer (bottom).
// Keeping the page this thin — just assembling pieces — makes it easy to read.
// ===========================================================================

// "import" borrows code from other files. Each of these is a "component" — a
// reusable piece of the screen, written elsewhere, that we drop in below.
import Nav from "@/app/component/Nav";
import PublicHome from "@/app/component/PublicHome";
import Footer from "@/app/component/Footer";

// A page is just a component whose returned UI is what the visitor sees.
// `export default` marks this as the main thing this file hands out, so Next.js
// knows to render it for the "/" address.
export default function Home() {
  // Everything inside this return is JSX — HTML-like markup that describes what
  // to put on screen. Tags like <Nav /> place those components, top to bottom.
  return (
    // A full-height, full-width black canvas to hold everything.
    <div className="min-h-screen w-full bg-black">
      {/* Top navigation bar */}
      <Nav />
      {/* The main home content: hero banner + the vehicle slider */}
      <PublicHome />
      {/* The bottom-of-page footer */}
      <Footer />
    </div>
  );
}
