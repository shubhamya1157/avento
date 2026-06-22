// ===========================================================================
// models/subscriber.ts — The "Subscriber" blueprint (a newsletter sign-up)
// ===========================================================================
//
// One document per email address that signed up to the Avento newsletter from
// the footer's "Subscribe" bar. We store just the email (lower-cased so the same
// address can't sneak in twice with different capitalisation) and let mongoose
// stamp `createdAt` so we know when they joined.
// ===========================================================================

import mongoose, { Document } from "mongoose";

// The TypeScript shape of one subscriber.
export interface SubscriberType extends Document {
    email: string; // the subscriber's email address (stored lower-cased)
}

const subscriberSchema = new mongoose.Schema<SubscriberType>(
    {
        email: {
            type: String,
            required: true,
            unique: true,    // one row per address — a repeat sign-up is a no-op
            lowercase: true, // normalise so "A@x.com" and "a@x.com" are the same
            trim: true,
        },
    },
    // Auto-add `createdAt` (when they joined) and `updatedAt`.
    { timestamps: true }
);

// Reuse-or-create the model (hot-reload safety), same pattern as the others.
const subscriberModel =
    mongoose.models.subscriberModel || mongoose.model("subscriberModel", subscriberSchema);

export default subscriberModel;
