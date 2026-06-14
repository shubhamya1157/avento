// ===========================================================================
// seed-vehicles.ts — The fixed "starter" list of vehicles
// ===========================================================================
//
// "Seed data" means starting data we hard-code into the app instead of typing
// it into a database by hand. This file holds the whole fleet as a plain
// JavaScript array. The app shows these directly, which is instant — there's
// no database round-trip just to list the cars (see app/api/vehicles/route.ts,
// which serves this list as-is).
//
// This file exports two things:
//   1. SEED_VEHICLES  — the raw list (without ids), defined just below.
//   2. STATIC_VEHICLES — the same list with an id and timestamps added, which
//      is the shape the rest of the app actually uses.
// ===========================================================================

import type { Vehicle, VehicleType, Transmission, FuelType } from "./types";

// The shape of one entry in our raw seed list. It's like the full `Vehicle`
// type but WITHOUT the `_id` — because we generate the id ourselves further
// down rather than typing one out for every car.
type SeedVehicle = {
  brand: string;
  model: string;
  type: VehicleType;
  image: string;
  pricePerDay: number;
  description: string;
  transmission: Transmission;
  fuel: FuelType;
  seats: number;
  availability: boolean;
  imagePosition?: string;
};

// The fleet itself: an array (a numbered list) of vehicle objects. Add, remove,
// or edit a car here and it instantly changes across the whole site. Each `{ }`
// block is one vehicle following the SeedVehicle shape above.
export const SEED_VEHICLES: SeedVehicle[] = [
  {
    brand: "Tesla",
    model: "Model S Plaid",
    type: "car",
    image: "/vehicle-tesla.jpg",
    pricePerDay: 150,
    description:
      "Sleek all-electric premium sedan with exceptional range, 1020 horsepower, and autopilot capabilities.",
    transmission: "Automatic",
    fuel: "Electric",
    seats: 5,
    availability: true,
  },
  {
    brand: "Ducati",
    model: "Panigale V4",
    type: "bike",
    image: "/vehicle-ducati.jpg",
    pricePerDay: 120,
    description:
      "Superbike performance with state-of-the-art electronics, racing soul, and stunning Italian design.",
    transmission: "Manual",
    fuel: "Petrol",
    seats: 1,
    availability: true,
  },
  {
    brand: "BMW",
    model: "M8 Competition",
    type: "car",
    image: "/vehicle-bmw.jpg",
    pricePerDay: 250,
    description:
      "V8 luxury performance coupe with outstanding handling, M xDrive precision, and executive elegance.",
    transmission: "Automatic",
    fuel: "Petrol",
    seats: 4,
    availability: true,
  },
  {
    brand: "Range Rover",
    model: "Sport",
    type: "suv",
    image: "/vehicle-range-rover.jpg",
    pricePerDay: 200,
    description:
      "Luxury SUV combining refined interior comfort, advanced off-road capabilities, and high cruising status.",
    transmission: "Automatic",
    fuel: "Diesel",
    seats: 5,
    availability: true,
  },
  {
    brand: "Harley Davidson",
    model: "Fat Boy 114",
    type: "bike",
    image: "/vehicle-harley.jpg",
    pricePerDay: 110,
    description:
      "Iconic cruiser motorcycle with massive presence, steamroller stance, and standard-setting torque.",
    transmission: "Manual",
    fuel: "Petrol",
    seats: 2,
    availability: true,
  },
  {
    brand: "Porsche",
    model: "Taycan Cross Turismo",
    type: "car",
    image: "/vehicle-porsche-taycan.jpg",
    pricePerDay: 280,
    description:
      "All-electric sports wagon offering Porsche driving dynamics, higher ground clearance, and versatile cargo room.",
    transmission: "Automatic",
    fuel: "Electric",
    seats: 4,
    availability: true,
  },
  {
    brand: "Jeep",
    model: "Wrangler Rubicon",
    type: "suv",
    image: "/vehicle-jeep.jpg",
    pricePerDay: 140,
    description:
      "The ultimate open-air 4x4 machine engineered for extreme off-road adventures and rugged landscapes.",
    transmission: "Manual",
    fuel: "Petrol",
    seats: 4,
    availability: true,
  },
  {
    brand: "Lamborghini",
    model: "Aventador S",
    type: "car",
    image: "/vehicle-lamborghini.jpg",
    pricePerDay: 450,
    description:
      "A naturally-aspirated V12 supercar with aggressive aerodynamics, scissor doors, and breathtaking presence on every road.",
    transmission: "Automatic",
    fuel: "Petrol",
    seats: 2,
    availability: true,
  },
  {
    brand: "Ferrari",
    model: "F8 Tributo",
    type: "car",
    image: "/vehicle-ferrari.jpg",
    pricePerDay: 480,
    description:
      "A twin-turbo V8 masterpiece delivering razor-sharp handling, race-bred performance, and timeless Italian design.",
    transmission: "Automatic",
    fuel: "Petrol",
    seats: 2,
    availability: true,
  },
  {
    brand: "McLaren",
    model: "720S",
    type: "car",
    image: "/vehicle-mclaren-720s.jpg",
    pricePerDay: 460,
    description:
      "A carbon-fibre track weapon with dihedral doors, blistering acceleration, and supreme aerodynamic engineering.",
    transmission: "Automatic",
    fuel: "Petrol",
    seats: 2,
    availability: true,
  },
  {
    brand: "Rolls-Royce",
    model: "Wraith",
    type: "car",
    image: "/vehicle-rolls-royce.jpg",
    pricePerDay: 520,
    description:
      "The pinnacle of grand touring luxury — handcrafted interiors, a whisper-quiet V12, and effortless prestige.",
    transmission: "Automatic",
    fuel: "Petrol",
    seats: 4,
    availability: true,
    // Tall portrait photo — crop lower so the full car sits centered, not at the bottom.
    imagePosition: "center 70%",
  },
  {
    brand: "Porsche",
    model: "Panamera Turbo",
    type: "car",
    image: "/vehicle-porsche-panamera.jpg",
    pricePerDay: 320,
    description:
      "A four-door sports sedan blending genuine supercar speed with daily comfort and unmistakable Porsche poise.",
    transmission: "Automatic",
    fuel: "Petrol",
    seats: 4,
    availability: true,
  },
  {
    brand: "Ford",
    model: "Mustang Mach 1",
    type: "car",
    image: "/vehicle-mustang.jpg",
    pricePerDay: 130,
    description:
      "An iconic American muscle car with a thunderous V8 soundtrack, retro styling, and raw, tire-shredding character.",
    transmission: "Manual",
    fuel: "Petrol",
    seats: 4,
    availability: true,
  },
];

// ---------------------------------------------------------------------------
// Build the final list the app uses. `.map(...)` walks through every entry in
// SEED_VEHICLES and produces a new, upgraded copy of each one. `idx` is the
// position in the list (0 for the first car, 1 for the second, ...).
//
// For each car we:
//   - `...vehicle`  copy every field from the original (the "spread" operator)
//   - add a unique `_id`, plus created/updated timestamps
//
// WHY THE STRANGE _id?
// MongoDB ids ("ObjectId") must be exactly 24 hexadecimal characters. We take a
// fixed 22-character prefix and tack on the car's number as 2 hex digits:
//   (idx + 1)            -> 1, 2, 3, ...
//   .toString(16)        -> write that number in base-16 (hex): 1, 2, ... a, b
//   .padStart(2, "0")    -> always 2 digits, e.g. "01", "0a", "0d"
// Result: every car gets a distinct, valid 24-char id like ...a301, ...a302.
// Using fixed ids (instead of random ones) means a car keeps the SAME id on
// every server restart, so bookings made earlier still point to the right car.
// ---------------------------------------------------------------------------
export const STATIC_VEHICLES: Vehicle[] = SEED_VEHICLES.map((vehicle, idx) => ({
  ...vehicle,
  // 22-char prefix + 2 hex digits = a valid 24-char ObjectId for every vehicle.
  _id: `6a2dc0275ab272308107a3${(idx + 1).toString(16).padStart(2, "0")}`,
  createdAt: "2026-06-14T03:40:58.977Z",
  updatedAt: "2026-06-14T03:40:58.977Z",
}));

