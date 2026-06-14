import type { Vehicle, VehicleType, Transmission, FuelType } from "./types";

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

export const STATIC_VEHICLES: Vehicle[] = SEED_VEHICLES.map((vehicle, idx) => ({
  ...vehicle,
  // 22-char prefix + 2 hex digits = a valid 24-char ObjectId for every vehicle.
  _id: `6a2dc0275ab272308107a3${(idx + 1).toString(16).padStart(2, "0")}`,
  createdAt: "2026-06-14T03:40:58.977Z",
  updatedAt: "2026-06-14T03:40:58.977Z",
}));

