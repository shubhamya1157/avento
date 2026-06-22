// ===========================================================================
// vehicles/page.tsx — The "/vehicles" page: the full fleet grid with filters
// ===========================================================================
//
// Folder name "vehicles" -> this page lives at the web address "/vehicles".
//
// This page lists every vehicle as a grid of cards, with filter buttons (All /
// Cars / Bikes / SUVs) along the top. ("Filter" here = show only the kinds you
// pick, hiding the rest.) Clicking a card's "Book Now" opens the booking popup.
//
// HOW FILTERING WORKS HERE: we keep TWO lists in state (two remembered values)
// — the full `vehicles` list, and the `filteredVehicles` list that's actually
// shown. Pressing a filter button rebuilds the filtered list from the full one.
// (We never lose the full list, so switching back to "All" instantly restores
// everything — like keeping the whole deck of cards but only laying some out.)
// ===========================================================================

// Runs in the browser: it has state and responds to button clicks.
'use client';

// React hooks: useState (remembered values) and useEffect (run code at moments).
import { useState, useEffect } from "react";
import Nav from "@/app/component/Nav";
import Footer from "@/app/component/Footer";
// BookingModal = the pop-up window where the user picks dates and confirms.
import BookingModal from "@/app/component/BookingModal";
// The TYPE describing one vehicle's shape (checked by TypeScript, gone at runtime).
import type { Vehicle } from "@/app/lib/types";
// A built-in starter list of vehicles, so the page has something to show
// instantly before the live data arrives from the server.
import { STATIC_VEHICLES } from "@/app/lib/seed-vehicles";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Zap, Users, Star } from "lucide-react";

// The filter options, as a fixed list. `as const` freezes this array so its
// values are treated as the exact strings "all" | "car" | "bike" | "suv", not
// just any text — this helps TypeScript catch typos.
const FILTERS = ["all", "car", "bike", "suv"] as const;

export default function VehiclesPage() {
  // The complete list (starts with the built-in static list for an instant
  // render) and the subset currently displayed after filtering. Both begin as
  // the same STATIC_VEHICLES list. "Vehicle[]" = a list of Vehicle items.
  const [vehicles, setVehicles] = useState<Vehicle[]>(STATIC_VEHICLES);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>(STATIC_VEHICLES);

  // Which filter button is active (starts at "all"), and the booking-popup state.
  const [activeFilter, setActiveFilter] = useState<string>("all");
  // The vehicle the user clicked "Book Now" on. null = none selected yet.
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  // Whether the booking pop-up is open (true) or closed (false).
  const [bookingOpen, setBookingOpen] = useState(false);

  // On first load, refresh both lists from the API (our server's /api/vehicles
  // address). If it fails, we keep the static list that's already showing, so
  // the page is never blank. The [] at the end means "run this only once, right
  // after the page first appears" (an empty watch list = no repeats).
  useEffect(() => {
    // A small async helper so we can use await; we call it just below.
    const fetchVehicles = async () => {
      try {
        // Ask the server for the live vehicle list and wait for the reply.
        const res = await fetch("/api/vehicles");
        if (res.ok) {                  // only if the request succeeded
          const data = await res.json(); // turn the JSON reply into real data
          setVehicles(data);             // replace the full list
          setFilteredVehicles(data);     // and what's currently shown
        }
      } catch (err) {
        // If anything failed, just log it for developers; the static list stays.
        console.error("Failed to load vehicles", err);
      }
    };
    fetchVehicles(); // actually run the helper defined above
  }, []);

  // Runs when a filter button is pressed.
  //   - Input: filter, the chosen category ("all", "car", "bike", or "suv").
  //   - Output: none; it updates state to highlight the button and reshow cards.
  // .filter(...) is the partner of .map(): instead of transforming items, it
  // KEEPS only the ones that pass a test. Here the test is v.type === filter
  // ("this vehicle's type matches the chosen one"), so vehicles.filter(...)
  // returns just the matching vehicles. For "all" we skip filtering and use the
  // whole list. (The ternary below picks between those two.)
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setFilteredVehicles(filter === "all" ? vehicles : vehicles.filter((v) => v.type === filter));
  };

  return (
    <>
      <Nav />

      <main className="min-h-screen bg-black px-6 pb-20 pt-32 text-white md:px-12 lg:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="space-y-4 text-center md:text-left">
            <span className="text-xs uppercase tracking-[0.5em] text-zinc-500">Luxurious Fleet</span>
            <h1 className="text-4xl font-black tracking-wide sm:text-5xl">EXPLORE OUR RIDES</h1>
            <p className="max-w-lg text-sm leading-relaxed text-zinc-400">
              Rent from our premium selection of cars, super-bikes, vans, and offroad SUVs.
            </p>
          </div>

          {/* The filter buttons. We loop over FILTERS to draw one button each.
              The active button gets a white style; the rest get an outline.
              The label shows "All Rides", or pluralises the type (e.g. "cars"). */}
          <div className="mt-12 flex flex-wrap justify-center gap-3 md:justify-start">
            {/* For each filter word we return ONE <button>.
                `key` gives each looped button a unique label for React; here the
                filter word itself ("all", "car", ...) is already unique. onClick
                runs handleFilterChange with this button's filter. The className
                mixes fixed classes with a ternary: the chosen (active) button gets
                the solid white style, all others get the faint outline style —
                that's how the active filter looks lit up. */}
            {FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => handleFilterChange(filter)}
                className={`rounded-full px-6 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                  activeFilter === filter
                    ? "bg-white text-black shadow-lg shadow-white/10"
                    : "border border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {/* Label: the "all" button reads "All Rides"; the others just add
                    an "s" to the word (car -> "cars", suv -> "suvs"). */}
                {filter === "all" ? "All Rides" : `${filter}s`}
              </button>
            ))}
          </div>

          {/* If a filter matches no vehicles, show a friendly empty message;
              otherwise render the grid of vehicle cards. */}
          {filteredVehicles.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-dashed border-white/10 py-24 text-center">
              <p className="text-sm text-zinc-500">No vehicles found in this category.</p>
            </div>
          ) : (
            // The responsive grid: 1 column on phones, 2 on tablets, 3 on
            // desktops (grid-cols-1 / sm:grid-cols-2 / lg:grid-cols-3).
            <motion.div layout className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {/* Draw one card per vehicle. The `layout` prop animates cards
                    smoothly rearranging when the filter changes. `vehicle` is the
                    current item; key={vehicle._id} uses each vehicle's unique id
                    so React can track the cards as filters change. */}
                {filteredVehicles.map((vehicle) => (
                  <motion.div
                    layout
                    key={vehicle._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/30 backdrop-blur-md"
                  >
                    {/* Card top: the photo, with a price badge and (if the
                        vehicle is taken) a "Booked Out" overlay. */}
                    <div className="relative h-56 overflow-hidden bg-zinc-800">
                      {/* The vehicle photo. The alt text builds a description
                          like "BMW M4" from the brand and model. "?? 'center'"
                          is the "if missing, use this default" operator: use the
                          vehicle's imagePosition, or "center" when it has none. */}
                      <img
                        src={vehicle.image}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        style={{ objectPosition: vehicle.imagePosition ?? "center" }}
                        className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
                      />
                      {/* "!vehicle.availability &&" = only draw this overlay when
                          the vehicle is NOT available, dimming the photo and
                          stamping a "Booked Out" label across it. */}
                      {!vehicle.availability && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <span className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-red-400">
                            Booked Out
                          </span>
                        </div>
                      )}
                      {/* Price badge in the corner, e.g. "$120 / day". The
                          {" "} is just a deliberate space so the price and the
                          "/ day" text don't run together. */}
                      <div className="absolute right-4 top-4 rounded-full border border-white/5 bg-black/60 px-3 py-1 text-xs font-bold text-white">
                        ₹{vehicle.pricePerDay}{" "}
                        <span className="text-[10px] font-normal text-zinc-400">/ day</span>
                      </div>
                    </div>

                    {/* Card body: name, short description, specs, and button */}
                    <div className="flex flex-1 flex-col space-y-4 p-6">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {vehicle.type}
                        </span>
                        <h3 className="mt-0.5 text-lg font-bold text-white transition group-hover:text-zinc-200">
                          {vehicle.brand}{" "}
                          <span className="font-normal text-zinc-400">{vehicle.model}</span>
                        </h3>

                        {/* Star rating, read from the summary the API attaches to
                            each vehicle. If there are reviews we show the average
                            (a filled star + e.g. "4.5") and the count in brackets;
                            with none yet we show a muted "No reviews yet" so the
                            row never looks broken or empty. */}
                        {vehicle.rating && vehicle.rating.count > 0 ? (
                          <span className="mt-1.5 flex items-center gap-1 text-xs text-zinc-300">
                            <Star size={13} className="fill-amber-400 text-amber-400" />
                            <span className="font-semibold">{vehicle.rating.average}</span>
                            <span className="text-zinc-500">
                              ({vehicle.rating.count}{" "}
                              {vehicle.rating.count === 1 ? "review" : "reviews"})
                            </span>
                          </span>
                        ) : (
                          <span className="mt-1.5 flex items-center gap-1 text-xs text-zinc-600">
                            <Star size={13} className="text-zinc-600" />
                            No reviews yet
                          </span>
                        )}
                      </div>

                      {/* line-clamp-2 cuts the description to 2 lines max */}
                      <p className="line-clamp-2 text-xs leading-relaxed text-zinc-400">
                        {vehicle.description}
                      </p>

                      {/* The three quick specs: transmission, fuel, seats */}
                      <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4 text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Car size={12} className="shrink-0" />
                          {vehicle.transmission}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap size={12} className="shrink-0" />
                          {vehicle.fuel}
                        </span>
                        <span className="flex items-center gap-1">
                          {/* Show the seat count, singular "seat" for 1, else
                              plural "seats" (a small ternary). */}
                          <Users size={12} className="shrink-0" />
                          {vehicle.seats} {vehicle.seats === 1 ? "seat" : "seats"}
                        </span>
                      </div>

                      {/* Book button: disabled (greyed out) when unavailable.
                          Clicking it remembers this vehicle and opens the popup. */}
                      <div className="pt-2">
                        <button
                          disabled={!vehicle.availability}
                          onClick={() => {
                            // Two steps: remember WHICH vehicle was picked, then
                            // open the booking pop-up (which reads that vehicle).
                            setSelectedVehicle(vehicle);
                            setBookingOpen(true);
                          }}
                          className="w-full cursor-pointer rounded-2xl bg-white py-3.5 text-xs font-bold text-black transition-all hover:scale-[1.01] hover:bg-zinc-100 active:scale-[0.99] disabled:opacity-30 disabled:hover:scale-100"
                        >
                          {/* Label reads "Take on Rent" if available, else "Unavailable". */}
                          {vehicle.availability ? "Take on Rent" : "Unavailable"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      {/* The booking popup, opened by the card buttons above. We pass it three
          props: open (is it visible?), onClose (how it tells us to hide it), and
          vehicle (which car to book — the one the user just clicked). */}
      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        vehicle={selectedVehicle}
      />

      <Footer />
    </>
  );
}
