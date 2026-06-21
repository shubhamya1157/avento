// ===========================================================================
// models/vehicle.ts — The "Vehicle" blueprint (a car / bike / SUV for rent)
// ===========================================================================
//
// This describes one rentable vehicle in the database. (Heads-up: most of the
// time the app shows vehicles from a fixed list in lib/seed-vehicles.ts for
// speed. This database model is mainly used when a booking needs a real
// vehicle record to point at — see app/api/bookings/route.ts.)
// ===========================================================================

// `import` pulls in code from another package. `mongoose` is the library that
// connects our app to the MongoDB database and lets us define schemas/models.
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// TypeScript shape of a vehicle. (An "interface" is just a checklist of which
// fields exist and what kind of value each holds.) The fields like
//   type: "car" | "bike" | "suv"
// are called "union types" — they mean the value must be EXACTLY one of those
// listed words, nothing else. This prevents typos like "Car" or "scooter".
// ---------------------------------------------------------------------------
export interface VehicleType {
    brand: string;        // e.g. "Tesla"
    model: string;        // e.g. "Model S Plaid"
    type: "car" | "bike" | "suv";
    image: string;        // path to the cover photo, e.g. "/vehicle-tesla.jpg"
    pricePerDay: number;  // rental cost for one day, in dollars
    description: string;
    transmission: "Automatic" | "Manual";
    fuel: "Electric" | "Petrol" | "Diesel" | "Hybrid";
    seats: number;
    availability: boolean; // true = can be booked, false = already taken

    // --- Partner / approval fields (added for the "become a partner" feature) ---
    // These are OPTIONAL so the original house fleet keeps working untouched.
    // A partner-submitted vehicle waits as "pending" until an admin approves it.
    source?: "fleet" | "partner";              // who supplied it: the house fleet or a partner
    status?: "approved" | "pending" | "rejected"; // approval state (only "approved" is bookable)
    ownerId?: mongoose.Schema.Types.ObjectId; // which user (partner) owns/submitted it
    ownerName?: string;                        // the owner's contact name
    ownerPhone?: string;                       // the owner's contact phone
    licensePlate?: string;                     // the vehicle's number plate / registration
    location?: string;                         // where the vehicle is based (city / area)
    adminNote?: string;                        // a note from the admin (e.g. reason for rejection)
    images?: string[];                         // extra gallery photos beyond the cover `image`
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

        // --- Partner / approval fields (see the interface above) ---
        source: {
            type: String,
            enum: ["fleet", "partner"],
            default: "fleet", // anything created the old way is part of the house fleet
        },
        status: {
            type: String,
            enum: ["approved", "pending", "rejected"],
            default: "approved", // house-fleet vehicles are live immediately
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userModel", // points at the partner who submitted this vehicle
        },
        ownerName: { type: String },
        ownerPhone: { type: String },
        licensePlate: { type: String },
        location: { type: String },
        adminNote: { type: String },
        images: { type: [String], default: [] }, // a list of extra photo URLs
    },
    // Auto-add `createdAt` / `updatedAt` timestamps to every vehicle record.
    { timestamps: true }
);

// Reuse the model if it already exists (hot-reload safety), otherwise create it.
const vehicleModel = mongoose.models.vehicleModel || mongoose.model("vehicleModel", vehicleSchema);

export default vehicleModel;
