// ===========================================================================
// models/review.ts — The "Review" blueprint (a rating + comment for a vehicle)
// ===========================================================================
//
// A review records that ONE user gave ONE vehicle a star rating (1–5) and an
// optional written comment. Like a booking, it doesn't copy the user or vehicle
// inside it — it stores a "reference" (a pointer) to each by their id.
//
// We also keep a copy of the reviewer's display name (`userName`) right on the
// review. This is called "denormalising": normally you'd look the name up from
// the user record each time, but copying it here means listing a vehicle's
// reviews doesn't need a second database lookup just to show who wrote each one.
// ===========================================================================

import mongoose, { Document } from "mongoose";

// ---------------------------------------------------------------------------
// The TypeScript shape of one review.
// ---------------------------------------------------------------------------
export interface ReviewType extends Document {
    userId: mongoose.Schema.Types.ObjectId;    // who wrote it (-> userModel)
    vehicleId: mongoose.Schema.Types.ObjectId;  // which vehicle it's about (-> vehicleModel)
    userName: string;                            // reviewer's name, copied for display
    rating: number;                              // a whole number of stars, 1 to 5
    comment?: string;                            // the written review (optional)
}

// ---------------------------------------------------------------------------
// The schema — the database rulebook for a review.
// ---------------------------------------------------------------------------
const reviewSchema = new mongoose.Schema<ReviewType>(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userModel",
            required: true,
        },
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "vehicleModel",
            required: true,
        },
        userName: {
            type: String,
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1, // can't rate lower than 1 star
            max: 5, // ...or higher than 5
        },
        comment: {
            type: String,
            // A sensible cap so a comment can't be enormous. (Optional field.)
            maxlength: 1000,
        },
    },
    // Auto-add `createdAt` (used to show "reviewed on") and `updatedAt`.
    { timestamps: true }
);

// One review per user per vehicle: this compound index marks the (userId,
// vehicleId) PAIR as unique, so the same person can't spam many reviews on the
// same vehicle. Trying to insert a second one throws a duplicate-key error,
// which the API route turns into a friendly message.
reviewSchema.index({ userId: 1, vehicleId: 1 }, { unique: true });

// Reuse-or-create the model (hot-reload safety), same pattern as the others.
const reviewModel = mongoose.models.reviewModel || mongoose.model("reviewModel", reviewSchema);

export default reviewModel;
