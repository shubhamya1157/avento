// ===========================================================================
// models/booking.ts — The "Booking" blueprint (a reservation OR a ride)
// ===========================================================================
//
// A booking records the fact that ONE user reserved ONE vehicle. There are now
// TWO kinds of booking, told apart by the `kind` field:
//   - "rental" — the classic flow: reserve a vehicle for a range of DATES
//                (startDate → endDate), priced by days × pricePerDay.
//   - "ride"   — point-to-point ride-hailing: a PICKUP and DROP location,
//                priced by distance (see app/lib/fare.ts). Rides have no dates.
//
// Both kinds live in this ONE collection so they can share everything that hangs
// off a booking id: live trip tracking, chat, reviews, and the access guard.
//
// Notice that a booking does not copy the whole user or vehicle inside it —
// instead it stores a "reference" (a pointer) to them by their id. This is a
// core database idea called a "relationship": keep each thing in one place, and
// link to it from elsewhere.
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

    // Which kind of booking this is. Old records saved before this feature have
    // no `kind`, so the schema defaults them to "rental" (safe — none of the
    // ride-only logic runs unless kind === "ride").
    kind: "rental" | "ride";

    // --- Rental-only fields (present when kind === "rental") ---
    // Optional now, because a "ride" has no date range. createBooking() still
    // requires them, so rentals keep their dates exactly as before.
    startDate?: Date;    // first day of the rental
    endDate?: Date;      // last day of the rental

    // --- Ride-only fields (present when kind === "ride") ---
    // Where the rider is picked up / dropped off: a human address plus the
    // map coordinates we geocoded it to. distanceKm is the straight-line trip
    // distance; fare is the price we worked out from it (see app/lib/fare.ts).
    pickup?: { address: string; lat: number; lng: number };
    drop?: { address: string; lat: number; lng: number };
    distanceKm?: number;
    fare?: number;

    totalAmount: number; // amount charged (rental: days × pricePerDay; ride: fare)
    // The `|` here is a "union type": status must be EXACTLY one of these
    // words. The lifecycle now has a "request first, pay after accept" loop:
    //   requested = customer asked, awaiting the owner's decision (no money yet)
    //   accepted  = owner said yes; the customer may now pay to lock it in
    //   rejected  = owner said no (see decisionNote for why); customer can re-ask
    //   confirmed = paid & locked in
    //   cancelled = called off
    //   ongoing   = ride/trip in progress
    //   completed = trip finished
    //   pending   = legacy/awaiting (kept for old records & non-request paths)
    status:
        | "requested"
        | "accepted"
        | "rejected"
        | "pending"
        | "confirmed"
        | "cancelled"
        | "ongoing"
        | "completed";

    // --- Renter details (rental KYC, collected before a request is sent) ---
    // A professional rental needs to know WHO is driving and that they hold a
    // licence, so the booking form collects these and stores them here for the
    // owner/admin to review before they accept. (Rides don't use this.)
    renter?: {
        fullName: string;
        phone: string;
        licenseNumber: string;  // driving licence number
        address: string;        // renter's address
    };

    // --- Request / accept-reject lifecycle (added for the request loop) ---
    // Who made the accept/reject call (the vehicle's partner-owner, or an admin),
    // when they made it, and an optional note (mainly a reason on rejection).
    decisionBy?: mongoose.Schema.Types.ObjectId;
    decisionAt?: Date;
    decisionNote?: string;

    // --- Ride dispatch (added for live-GPS dispatch) ---
    // The driver assigned to actually run a ride, and when they were dispatched.
    // For a partner-owned vehicle the driver is usually the owner; an admin can
    // also dispatch. Live GPS for the trip is keyed off the booking id elsewhere.
    driverId?: mongoose.Schema.Types.ObjectId;
    dispatchedAt?: Date;

    // --- Payment fields (added for the Razorpay feature) ---
    // `paid` is true once money has actually been taken. In "demo mode" (no
    // Razorpay keys configured) a booking is created with paid:false.
    // The two ids are Razorpay's references, kept for our records / receipts.
    paid?: boolean;
    paymentId?: string; // Razorpay payment id (e.g. "pay_XXXX")
    orderId?: string;   // Razorpay order id (e.g. "order_XXXX")
    rideOtp?: string;   // 4-digit OTP generated for ride pickup verification
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

        // "rental" (date range) or "ride" (pickup → drop). Defaults to "rental"
        // so any booking made before this feature is treated as a rental.
        kind: {
            type: String,
            enum: ["rental", "ride"],
            default: "rental",
        },

        // Rental dates — no longer `required`, because rides don't have dates.
        // createBooking() enforces them for rentals, so nothing changes there.
        startDate: { type: Date },
        endDate: { type: Date },

        // Ride pickup / drop points. `_id: false` keeps these as plain embedded
        // objects (we don't need a separate id for each coordinate pair).
        pickup: {
            type: { address: String, lat: Number, lng: Number },
            _id: false,
        },
        drop: {
            type: { address: String, lat: Number, lng: Number },
            _id: false,
        },
        distanceKm: { type: Number }, // straight-line trip distance (rides)
        fare: { type: Number },       // computed ride price (rides)

        totalAmount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            required: true,
            enum: [
                "requested",
                "accepted",
                "rejected",
                "pending",
                "confirmed",
                "cancelled",
                "ongoing",
                "completed",
            ],
            // Default stays "confirmed" so any code path that doesn't set a
            // status explicitly keeps the old instant-confirm behaviour. The
            // request loop passes status:"requested" in on purpose.
            default: "confirmed",
        },

        // --- Renter details (rental KYC; see the interface above). `_id: false`
        //     keeps this a plain embedded object, like pickup/drop. ---
        renter: {
            type: {
                fullName: String,
                phone: String,
                licenseNumber: String,
                address: String,
            },
            _id: false,
        },

        // --- Request / accept-reject lifecycle (see the interface above) ---
        decisionBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userModel",
        },
        decisionAt: { type: Date },
        decisionNote: { type: String },

        // --- Ride dispatch (see the interface above) ---
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userModel",
        },
        dispatchedAt: { type: Date },

        // --- Payment fields (see the interface above) ---
        paid: {
            type: Boolean,
            default: false, // becomes true only after a verified Razorpay payment
        },
        paymentId: { type: String },
        orderId: { type: String },
        rideOtp: { type: String },
    },
    // Auto-add `createdAt` (used to show "Booked On") and `updatedAt`.
    { timestamps: true }
);

// Reuse-or-create the model (hot-reload safety), same pattern as the others.
const bookingModel = mongoose.models.bookingModel || mongoose.model("bookingModel", bookingSchema);

export default bookingModel;
