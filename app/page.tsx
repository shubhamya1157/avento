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

import Nav from "@/app/component/Nav";
import PublicHome from "@/app/component/PublicHome";
import Footer from "@/app/component/Footer";

export default function Home() {
  return (
    // A full-height, full-width black canvas to hold everything.
    <div className="min-h-screen w-full bg-black">
      <Nav />
      <PublicHome />
      <Footer />
    </div>
  );
}
