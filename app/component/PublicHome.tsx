// ===========================================================================
// PublicHome.tsx — The content of the home page
// ===========================================================================
//
// This component just stacks the two big sections of the landing page in order:
// the full-screen hero banner, then the vehicle slider below it. Splitting a
// page into small, named pieces like this makes each part easy to find and edit.
//
// The empty-looking tags <> ... </> are a "React Fragment": a way to return
// several elements side by side WITHOUT wrapping them in an extra <div>. It
// keeps the final HTML clean.
// ===========================================================================

// 'use client' = this runs in the visitor's browser. (See Providers.tsx for the
// full reason behind this line.)
'use client';

// "import" borrows the two sections we built in other files, so we can place
// them here. The "./" means "look in this same folder".
import HeroSection from "./HeroSection";
import VehicleSlider from "./VehicleSlider";

// A "component" is a reusable piece of screen written as a function that returns
// markup. This one is the whole public home page. Notice it doesn't draw any
// boxes or text itself — it just arranges two bigger pieces in order. That's a
// common, tidy pattern: small components snapped together like LEGO bricks.
export default function PublicHome() {
  return (
    // <> ... </> is a Fragment: an invisible wrapper so we can return both
    // sections side by side without adding an extra <div> around them.
    <>
      <HeroSection />    {/* the big banner at the very top */}
      <VehicleSlider />  {/* the "THE COLLECTION" carousel below it */}
    </>
  );
}
