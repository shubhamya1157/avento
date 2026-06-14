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

'use client';

import HeroSection from "./HeroSection";
import VehicleSlider from "./VehicleSlider";

export default function PublicHome() {
  return (
    <>
      <HeroSection />
      <VehicleSlider />
    </>
  );
}
