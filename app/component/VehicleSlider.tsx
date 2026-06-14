'use client';

import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Zap, Users, Car } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Vehicle } from "@/app/lib/types";
import { STATIC_VEHICLES } from "@/app/lib/seed-vehicles";
import BookingModal from "./BookingModal";

export default function VehicleSlider() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(STATIC_VEHICLES);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await fetch("/api/vehicles");
        if (res.ok) {
          const data = await res.json();
          setVehicles(data);
        }
      } catch (err) {
        console.error("Failed to load slider vehicles", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  const handleNext = () => {
    if (vehicles.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % vehicles.length);
    }
  };

  const handlePrev = () => {
    if (vehicles.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + vehicles.length) % vehicles.length);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-white" />
      </div>
    );
  }

  if (vehicles.length === 0) return null;

  const activeVehicle = vehicles[currentIndex];

  return (
    <section className="relative bg-black px-6 py-24 text-white md:px-12 lg:px-24">
      <div className="mx-auto max-w-7xl">
        <span className="text-xs uppercase tracking-[0.5em] text-zinc-500">Curated Fleet</span>
        <h2 className="mt-2 text-3xl font-black tracking-wide sm:text-4xl md:text-5xl">
          THE COLLECTION
        </h2>
        <div className="mt-4 h-px w-20 bg-white/20" />
      </div>

      <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
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
                    {activeVehicle.seats} {activeVehicle.seats === 1 ? "Seat" : "Seats"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-6 pt-2">
                <div>
                  <span className="block text-xs uppercase tracking-wider text-zinc-500">Daily Rate</span>
                  <span className="text-2xl font-black text-white">${activeVehicle.pricePerDay}</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedVehicle(activeVehicle);
                    setBookingOpen(true);
                  }}
                  className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-black transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Book This Ride
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

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
            <span className="self-center pl-2 text-xs font-semibold tracking-wider text-zinc-500">
              {String(currentIndex + 1).padStart(2, "0")} / {String(vehicles.length).padStart(2, "0")}
            </span>
          </div>
        </div>

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
              style={{ objectPosition: activeVehicle.imagePosition ?? "center" }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/10" />
        </div>
      </div>

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        vehicle={selectedVehicle}
      />
    </section>
  );
}
