import mongoose, { Document } from "mongoose";

export interface BookingType extends Document {
    userId: mongoose.Schema.Types.ObjectId;
    vehicleId: mongoose.Schema.Types.ObjectId;
    startDate: Date;
    endDate: Date;
    totalAmount: number;
    status: "pending" | "confirmed" | "cancelled";
}

const bookingSchema = new mongoose.Schema<BookingType>(
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
            default: "confirmed",
        },
    },
    { timestamps: true }
);

const bookingModel = mongoose.models.bookingModel || mongoose.model("bookingModel", bookingSchema);

export default bookingModel;
