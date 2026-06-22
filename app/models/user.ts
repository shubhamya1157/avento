// ===========================================================================
// models/user.ts — The "User" blueprint (what a user record looks like)
// ===========================================================================
//
// WHAT IS A MODEL?
// A model is a blueprint that describes the shape of one kind of data in the
// database. This file describes a USER. Every time someone signs up, we save
// one new "document" (a single record) shaped like the blueprint below.
//
// MongoDB stores data as flexible documents (similar to JavaScript objects).
// Mongoose adds a "schema" on top to enforce rules — e.g. "a user MUST have an
// email" — so bad data can't sneak in.
// ===========================================================================

// "import" brings in code that lives in another package so we can use it here.
// `mongoose` is the helper library that talks to the MongoDB database for us.
// `Document` is a TypeScript helper type from mongoose that represents "one
// saved record" — we borrow its built-in fields (like `_id`) just below.
import mongoose, { Document } from "mongoose";

// ---------------------------------------------------------------------------
// The TypeScript description of a user. This is for OUR code's safety only:
// it lets the editor warn us if we, say, spell a field wrong. `extends
// Document` means a user also has the built-in fields Mongoose gives every
// record (like the auto-generated `_id`).
//
// The `?` after a field name means "optional — it might not be there":
//   - password is optional because users who sign in with Google never set one
//   - phoneNumber is optional because we don't force people to give a phone
// ---------------------------------------------------------------------------
interface UserType extends Document {
    name: string;          // the person's display name
    email: string;         // their email address (also used to log in)
    password?: string;     // scrambled password — absent for Google sign-ins
    phoneNumber?: number;  // optional contact number
    role: "user" | "partner" | "admin"; // exactly one of these three words
    emailVerified: boolean;             // true once they confirm via OTP email

    // --- Partner application lifecycle (the one-time "become a partner" journey) ---
    // A normal user APPLIES by submitting their first vehicle. The application
    // moves through these stages; only a passed video KYC turns them into a
    // "partner" (role above). It's tracked here, on the PERSON, because KYC is a
    // one-time check — once approved, extra vehicles need only per-vehicle review.
    //   none           — never applied (the default for everyone)
    //   pending_review — submitted, waiting for an admin to check the details
    //   kyc_pending    — details approved, waiting for / doing the video KYC call
    //   approved       — passed KYC; role is now "partner"
    //   rejected       — turned down (at either stage); may apply again
    partnerStatus: "none" | "pending_review" | "kyc_pending" | "approved" | "rejected";
    kycNote?: string;                              // admin's note (e.g. why rejected)
    applicationVehicleId?: mongoose.Schema.Types.ObjectId; // the vehicle this application is for
}

// ---------------------------------------------------------------------------
// The actual schema — the database-level rules for a user. Each field lists
// its type and any constraints. A "schema" is the rulebook the database checks
// every record against before it agrees to save it. `new mongoose.Schema(...)`
// builds one of these rulebooks.
// ---------------------------------------------------------------------------
const userSchema = new mongoose.Schema<UserType>(
    {
        name: {
            type: String,
            required: true, // cannot save a user without a name
        },
        email: {
            type: String,
            required: true,
            unique: true,   // no two users can share the same email
        },
        password: {
            type: String,
            // Not required: Google sign-in users have no password. When a
            // password IS set, it is stored as a scrambled "hash", never as
            // the real text (see the register/verify-otp routes).
        },
        role: {
            type: String,
            default: "user",                       // new users start as "user"
            enum: ["user", "partner", "admin"],    // only these values allowed
        },
        emailVerified: {
            type: Boolean,
            default: false, // false until the OTP email is confirmed
        },

        // --- Partner application lifecycle (see the interface above) ---
        partnerStatus: {
            type: String,
            enum: ["none", "pending_review", "kyc_pending", "approved", "rejected"],
            default: "none", // everyone starts having never applied
        },
        kycNote: { type: String },
        applicationVehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "vehicleModel", // the vehicle submitted with this application
        },
    },
    // `timestamps: true` tells Mongoose to automatically add and maintain two
    // extra fields on every user: `createdAt` and `updatedAt`. Free history!
    { timestamps: true }
);

// ---------------------------------------------------------------------------
// Turn the schema into a usable model.
//
// `mongoose.models.userModel || mongoose.model(...)` means:
//   "If a model named 'userModel' was already created earlier, reuse it;
//    otherwise create it now."
// This guard exists because Next.js hot-reloading can run this file twice, and
// Mongoose throws an error if you try to define the same model name twice.
// ---------------------------------------------------------------------------
const userModel = mongoose.models.userModel || mongoose.model("userModel", userSchema);

export default userModel;
