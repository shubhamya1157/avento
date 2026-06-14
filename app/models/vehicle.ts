import mongoose from "mongoose";

export interface VehicleType {
    brand: string;
    model: string;
    type: "car" | "bike" | "suv";
    image: string;
    pricePerDay: number;
    description: string;
    transmission: "Automatic" | "Manual";
    fuel: "Electric" | "Petrol" | "Diesel" | "Hybrid";
    seats: number;
    availability: boolean;
}

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
            enum: ["car", "bike", "suv"],
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
            default: true,
        },
    },
    { timestamps: true }
);

const vehicleModel = mongoose.models.vehicleModel || mongoose.model("vehicleModel", vehicleSchema);

export default vehicleModel;
