// ===========================================================================
// VehicleSlider.tsx — The "THE COLLECTION" carousel on the home page
// ===========================================================================
//
// This shows one vehicle at a time with Prev/Next arrows to flip through the
// fleet, plus a "Book This Ride" button that opens the booking popup.
//
// KEY REACT IDEAS USED HERE:
//   - useState: remembers a value that can change over time. When it changes,
//     React automatically re-draws the part of the screen that uses it.
//   - useEffect: runs some code AFTER the component first appears on screen —
//     here, to fetch the latest vehicle list from the server.
// ===========================================================================

// 'use client' = this runs in the visitor's browser, which it must, because the
// slider is interactive (arrows, a button, and live data fetching).
'use client';

// "import" borrows tools built elsewhere.
import { useState, useEffect } from "react";                  // React's memory + after-render hooks
import { ArrowLeft, ArrowRight, Zap, Users, Car } from "lucide-react"; // icon shapes
import { motion, AnimatePresence } from "framer-motion"; // animation library
// "import type" brings in only a TYPE — a description of the shape of a vehicle
// (its brand, price, seats, etc.). Types are TypeScript's safety checks and
// vanish when the app actually runs; they don't add any real code.
import type { Vehicle } from "@/app/lib/types";
import { STATIC_VEHICLES } from "@/app/lib/seed-vehicles"; // a built-in starter list of cars
import BookingModal from "./BookingModal";                // our own booking popup

// A "component" is a reusable piece of screen written as a function returning
// markup. This one is the whole rotating vehicle showcase.
export default function VehicleSlider() {
  // The list of vehicles. It STARTS with the built-in static list so the slider
  // shows cars instantly, with nothing to wait for. The useEffect below then
  // quietly refreshes it from the API.
  const [vehicles, setVehicles] = useState<Vehicle[]>(STATIC_VEHICLES);

  // Which vehicle is currently shown, as a position in the list (0 = first item,
  // because counting in code starts at zero, not one).
  const [currentIndex, setCurrentIndex] = useState(0);

  // The vehicle the user picked to book (null = "none chosen yet"), and whether
  // the booking popup is open.
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  // useEffect is a hook that runs code AFTER the screen has first been drawn —
  // perfect for fetching data, which shouldn't block the page from appearing.
  // The empty [] at the very end is its "dependency list": empty means
  // "run this just once, on first appearance, and never again".
  // It asks the API for the vehicle list and, if that succeeds, swaps in the
  // fresh data. If the request fails we just keep showing the static list, so
  // the user never sees a broken page.
  useEffect(() => {
    // "async" marks a function that does slow work (like talking to a server)
    // without freezing the page. Inside it, "await" means "pause here until the
    // slow step finishes, then carry on". A slow step hands back a "promise" —
    // an IOU for a result that will arrive a moment later.
    const fetchVehicles = async () => {
      // try/catch: attempt the risky steps in "try"; if anything goes wrong,
      // jump to "catch" instead of crashing the whole page.
      try {
        const res = await fetch("/api/vehicles"); // ask our server for the data; wait for the reply
        if (res.ok) {                              // res.ok is true only if the reply was a success
          const data = await res.json();           // turn the raw reply into a usable JS list; wait for it
          setVehicles(data);                       // save it into memory, which re-draws the slider
        }
      } catch (err) {
        console.error("Failed to load slider vehicles", err); // log the problem; keep the static list
      }
    };
    fetchVehicles(); // actually start the fetch we just defined above
  }, []);

  // Go to the next vehicle. We pass setCurrentIndex a small function (prev) =>
  // ... ; React hands us the previous index as `prev` so we can build the new
  // one from it safely. The "%" is "modulo" (the remainder after dividing): when
  // prev+1 reaches the list length it wraps back to 0, so the carousel loops
  // endlessly instead of running off the end.
  const handleNext = () => {
    if (vehicles.length > 0) { // .length is how many items the list has; only move if there are any
      setCurrentIndex((prev) => (prev + 1) % vehicles.length);
    }
  };

  // Go to the previous vehicle. Adding vehicles.length before the % keeps the
  // result positive when stepping back from the first item (which loops to the
  // last one) instead of going negative.
  const handlePrev = () => {
    if (vehicles.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + vehicles.length) % vehicles.length);
    }
  };

  // Safety: if there are somehow no vehicles, draw nothing (returning null tells
  // React "put nothing on screen"). This guards the next line from crashing.
  if (vehicles.length === 0) return null;

  // Pick the one vehicle to display right now by its position in the list.
  // vehicles[currentIndex] reads the item at that slot (e.g. vehicles[0]).
  const activeVehicle = vehicles[currentIndex];

  return (
    <section className="relative bg-black px-6 py-24 text-white md:px-12 lg:px-24">
      {/* Section heading */}
      <div className="mx-auto max-w-7xl">
        <span className="text-xs uppercase tracking-[0.5em] text-zinc-500">Curated Fleet</span>
        <h2 className="mt-2 text-3xl font-black tracking-wide sm:text-4xl md:text-5xl">
          THE COLLECTION
        </h2>
        <div className="mt-4 h-px w-20 bg-white/20" />
      </div>

      {/* Two-column layout: details on the left, big photo on the right */}
      <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          {/* AnimatePresence + the key={currentIndex} make the text smoothly
              fade/slide out and in each time you switch vehicles. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: -20 }} // start: invisible, shifted left
              animate={{ opacity: 1, x: 0 }}   // end: visible, in place
              exit={{ opacity: 0, x: 20 }}     // leaving: fade out to the right
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <span className="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {activeVehicle.type} • {activeVehicle.transmission}
              </span>

              <h3 className="text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">
                {activeVehicle.brand}
                <br />
                <span className="font-medium text-zinc-400">{activeVehicle.model}</span>
              </h3>

              <p className="max-w-md text-sm leading-relaxed text-zinc-400">
                {activeVehicle.description}
              </p>

              {/* Three quick spec boxes: transmission, fuel, seats */}
              <div className="my-4 grid grid-cols-3 gap-4 border-y border-white/10 py-6">
                <div className="space-y-1">
                  <span className="block text-[10px] font-medium uppercase tracking-widest text-zinc-500">Transmission</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                    <Car size={13} className="text-zinc-400" />
                    {activeVehicle.transmission}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] font-medium uppercase tracking-widest text-zinc-500">Fuel System</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                    <Zap size={13} className="text-zinc-400" />
                    {activeVehicle.fuel}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] font-medium uppercase tracking-widest text-zinc-500">Capacity</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                    <Users size={13} className="text-zinc-400" />
                    {/* The "? :" is a "ternary" — a one-line if/else. Read it
                        as: IF seats equals 1, THEN "Seat", ELSE "Seats". (=== is
                        an exact-equality check.) So 1 reads "1 Seat", 4 reads
                        "4 Seats". Show "Seat" vs "Seats" depending on the number. */}
                    {activeVehicle.seats} {activeVehicle.seats === 1 ? "Seat" : "Seats"}
                  </span>
                </div>
              </div>

              {/* Price + the button that opens the booking popup */}
              <div className="flex items-center justify-between gap-6 pt-2">
                <div>
                  <span className="block text-xs uppercase tracking-wider text-zinc-500">Daily Rate</span>
                  <span className="text-2xl font-black text-white">${activeVehicle.pricePerDay}</span>
                </div>
                <button
                  // onClick = "when clicked, run these steps". Here we save the
                  // chosen car into memory, then flip the popup open.
                  onClick={() => {
                    setSelectedVehicle(activeVehicle); // remember which car
                    setBookingOpen(true);              // open the popup
                  }}
                  className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-black transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Book This Ride
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Prev / Next arrows and the "01 / 13" position counter */}
          <div className="flex gap-4 pt-6">
            <button
              onClick={handlePrev}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-white/20 hover:bg-white/10"
              aria-label="Previous vehicle"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={handleNext}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-white/20 hover:bg-white/10"
              aria-label="Next vehicle"
            >
              <ArrowRight size={18} />
            </button>
            {/* String(...) turns a number into text so we can pad it. padStart(2,
                "0") makes sure the text is at least 2 characters, filling the
                front with "0" — so 1 becomes "01". We add 1 to currentIndex
                because positions count from 0 but humans count from 1.
                padStart(2, "0") shows numbers as 01, 02, ... for a neat look */}
            <span className="self-center pl-2 text-xs font-semibold tracking-wider text-zinc-500">
              {String(currentIndex + 1).padStart(2, "0")} / {String(vehicles.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* The large vehicle photo, which cross-fades when you switch cars */}
        <div className="relative h-[300px] overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/40 sm:h-[400px] lg:col-span-7 lg:h-[450px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={currentIndex}
              src={activeVehicle.image}
              alt={`${activeVehicle.brand} ${activeVehicle.model}`}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.5 }}
              // The "??" is the "nullish" fallback: use the left side if it has
              // a value, otherwise use the right side. So if a vehicle didn't
              // specify a position, we fall back to "center".
              // Some photos need to be nudged up/down so the car is centered;
              // imagePosition (if set) controls that, otherwise default center.
              style={{ objectPosition: activeVehicle.imagePosition ?? "center" }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>
          {/* A subtle dark gradient over the image for depth */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/10" />
        </div>
      </div>

      {/* The booking popup. The values we hand it (open, onClose, vehicle) are
          its "props" — inputs that configure a child component. It's always here
          in the markup but only visible when `bookingOpen` is true, showing the
          vehicle the user selected. onClose is the action it runs to close
          itself. */}
      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        vehicle={selectedVehicle}
      />
    </section>
  );
}
