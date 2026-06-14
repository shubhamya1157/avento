'use client';

import Link from "next/link";
import { Car, Truck, Bike } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/heroImage.png')" }}
      />

      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/90" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <span className="mb-6 text-xs uppercase tracking-[0.8em] text-gray-400">
          AVENTO
        </span>

        <h1 className="max-w-5xl text-5xl font-black leading-none text-white sm:text-6xl md:text-7xl lg:text-8xl">
          Every Ride
          <br />
          Creates A Story
        </h1>

        <div className="mt-8 h-px w-24 bg-white/20" />

        <p className="mt-8 max-w-xl text-lg leading-relaxed text-gray-300 md:text-xl">
          Every road tells a story.
          <br />
          Find the ride that takes you there.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 backdrop-blur-md">
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <Bike size={28} />
            <span className="text-xs">Bikes</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <Car size={28} />
            <span className="text-xs">Cars</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <Truck size={28} />
            <span className="text-xs">SUVs</span>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/vehicles"
            className="rounded-full bg-white px-8 py-4 font-semibold text-black transition-all duration-300 hover:scale-105"
          >
            Book Now
          </Link>
          <Link
            href="/vehicles"
            className="rounded-full border border-white/20 bg-white/5 px-8 py-4 font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white/10"
          >
            Explore Rides
          </Link>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 h-40 w-full bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}
