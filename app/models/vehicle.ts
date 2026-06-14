// ===========================================================================
// models/vehicle.ts — The "Vehicle" blueprint (a car / bike / SUV for rent)
// ===========================================================================
//
// This describes one rentable vehicle in the database. (Heads-up: most of the
// time the app shows vehicles from a fixed list in lib/seed-vehicles.ts for
// speed. This database model is mainly used when a booking needs a real
// vehicle record to point at — see app/api/bookings/route.ts.)
// ===========================================================================

import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// TypeScript shape of a vehicle. The fields like
//   type: "car" | "bike" | "suv"
// are called "union types" — they mean the value must be EXACTLY one of those
// listed words, nothing else. This prevents typos like "Car" or "scooter".
// ---------------------------------------------------------------------------
export interface VehicleType {
    brand: string;        // e.g. "Tesla"
    model: string;        // e.g. "Model S Plaid"
    type: "car" | "bike" | "suv";
    image: string;        // path to the photo, e.g. "/vehicle-tesla.jpg"
    pricePerDay: number;  // rental cost for one day, in dollars
    description: string;
    transmission: "Automatic" | "Manual";
    fuel: "Electric" | "Petrol" | "Diesel" | "Hybrid";
    seats: number;
    availability: boolean; // true = can be booked, false = already taken
}

// ---------------------------------------------------------------------------
// The database rules for a vehicle. Almost everything is `required` because a
// vehicle card on the website would look broken without these details.
// ---------------------------------------------------------------------------
const vehicleSchema = new mongoose.Schema<VehicleType>(
    {
        brand: {
            type: String,
            required: true,
        },
        model: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: ["car", "bike", "suv"], // only these categories allowed
        },
        image: {
            type: String,
            required: true,
        },
        pricePerDay: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        transmission: {
            type: String,
            required: true,
            enum: ["Automatic", "Manual"],
        },
        fuel: {
            type: String,
            required: true,
            enum: ["Electric", "Petrol", "Diesel", "Hybrid"],
        },
        seats: {
            type: Number,
            required: true,
        },
        availability: {
            type: Boolean,
            default: true, // a newly added vehicle is available by default
        },
    },
    // Auto-add `createdAt` / `updatedAt` timestamps to every vehicle record.
    { timestamps: true }
);

// Reuse the model if it already exists (hot-reload safety), otherwise create it.
const vehicleModel = mongoose.models.vehicleModel || mongoose.model("vehicleModel", vehicleSchema);

export default vehicleModel;
