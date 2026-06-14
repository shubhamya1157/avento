'use client';

import { useState, useEffect } from "react";
import Nav from "@/app/component/Nav";
import Footer from "@/app/component/Footer";
import BookingModal from "@/app/component/BookingModal";
import type { Vehicle } from "@/app/lib/types";
import { STATIC_VEHICLES } from "@/app/lib/seed-vehicles";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Zap, Users, Loader2 } from "lucide-react";

const FILTERS = ["all", "car", "bike", "suv"] as const;

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(STATIC_VEHICLES);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>(STATIC_VEHICLES);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await fetch("/api/vehicles");
        if (res.ok) {
          const data = await res.json();
          setVehicles(data);
          setFilteredVehicles(data);
        }
      } catch (err) {
        console.error("Failed to load vehicles", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

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

          <div className="mt-12 flex flex-wrap justify-center gap-3 md:justify-start">
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
                {filter === "all" ? "All Rides" : `${filter}s`}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex min-h-[400px] w-full items-center justify-center">
              <Loader2 size={36} className="animate-spin text-zinc-500" />
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-dashed border-white/10 py-24 text-center">
              <p className="text-sm text-zinc-500">No vehicles found in this category.</p>
            </div>
          ) : (
            <motion.div layout className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout" initial={false}>
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
                    <div className="relative h-56 overflow-hidden bg-zinc-800">
                      <img
                        src={vehicle.image}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        style={{ objectPosition: vehicle.imagePosition ?? "center" }}
                        className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
                      />
                      {!vehicle.availability && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <span className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-red-400">
                            Booked Out
                          </span>
                        </div>
                      )}
                      <div className="absolute right-4 top-4 rounded-full border border-white/5 bg-black/60 px-3 py-1 text-xs font-bold text-white">
                        ${vehicle.pricePerDay}{" "}
                        <span className="text-[10px] font-normal text-zinc-400">/ day</span>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col space-y-4 p-6">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {vehicle.type}
                        </span>
                        <h3 className="mt-0.5 text-lg font-bold text-white transition group-hover:text-zinc-200">
                          {vehicle.brand}{" "}
                          <span className="font-normal text-zinc-400">{vehicle.model}</span>
                        </h3>
                      </div>

                      <p className="line-clamp-2 text-xs leading-relaxed text-zinc-400">
                        {vehicle.description}
                      </p>

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
                          <Users size={12} className="shrink-0" />
                          {vehicle.seats} {vehicle.seats === 1 ? "seat" : "seats"}
                        </span>
                      </div>

                      <div className="pt-2">
                        <button
                          disabled={!vehicle.availability}
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            setBookingOpen(true);
                          }}
                          className="w-full cursor-pointer rounded-2xl bg-white py-3.5 text-xs font-bold text-black transition-all hover:scale-[1.01] hover:bg-zinc-100 active:scale-[0.99] disabled:opacity-30 disabled:hover:scale-100"
                        >
                          {vehicle.availability ? "Book Now" : "Unavailable"}
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

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        vehicle={selectedVehicle}
      />

      <Footer />
    </>
  );
}
