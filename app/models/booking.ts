// ===========================================================================
// models/booking.ts — The "Booking" blueprint (a reservation)
// ===========================================================================
//
// A booking records the fact that ONE user reserved ONE vehicle for a range of
// dates. Notice that a booking does not copy the whole user or vehicle inside
// it — instead it stores a "reference" (a pointer) to them by their id. This is
// a core database idea called a "relationship": keep each thing in one place,
// and link to it from elsewhere.
// ===========================================================================

// `mongoose` is the library that lets our code read from and write to the
// MongoDB database. `Document` is mongoose's type for "one saved record"; by
// writing `extends Document` below, a booking inherits mongoose's built-in
// fields (such as the auto-generated `_id`) on top of our own fields.
import mongoose, { Document } from "mongoose";

// ---------------------------------------------------------------------------
// The TypeScript shape of one booking (an "interface" is a checklist of the
// fields a booking must have and the kind of value each one holds).
// ---------------------------------------------------------------------------
export interface BookingType extends Document {
    // ObjectId is MongoDB's special id type. `ref` (set in the schema below)
    // says WHICH collection this id points into, so we can later "populate"
    // (look up and fill in) the full user or vehicle when we need it.
    userId: mongoose.Schema.Types.ObjectId;
    vehicleId: mongoose.Schema.Types.ObjectId;
    startDate: Date;     // first day of the rental
    endDate: Date;       // last day of the rental
    totalAmount: number; // price for the whole period (days × pricePerDay)
    // The `|` here is a "union type": status must be EXACTLY one of these
    // three words. pending = awaiting action, confirmed = locked in,
    // cancelled = called off.
    status: "pending" | "confirmed" | "cancelled";
}

// ---------------------------------------------------------------------------
// The schema — the database rulebook for a booking. `required: true` means the
// field MUST be filled in, and `enum` lists the only allowed values.
// ---------------------------------------------------------------------------
const bookingSchema = new mongoose.Schema<BookingType>(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userModel",   // this id points to a document in userModel
            required: true,
        },
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "vehicleModel", // this id points to a document in vehicleModel
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            required: true,
            enum: ["pending", "confirmed", "cancelled"],
            default: "confirmed", // in this app a new booking is confirmed at once
        },
    },
    // Auto-add `createdAt` (used to show "Booked On") and `updatedAt`.
    { timestamps: true }
);

// Reuse-or-create the model (hot-reload safety), same pattern as the others.
const bookingModel = mongoose.models.bookingModel || mongoose.model("bookingModel", bookingSchema);

export default bookingModel;
