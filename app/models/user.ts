import mongoose, { Document } from "mongoose";

interface UserType extends Document {
    name: string;
    email: string;
    password?: string;
    phoneNumber?: number;
    role: "user" | "partner" | "admin";
    emailVerified: boolean;
}

const userSchema = new mongoose.Schema<UserType>(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
        },
        role: {
            type: String,
            default: "user",
            enum: ["user", "partner", "admin"],
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const userModel = mongoose.models.userModel || mongoose.model("userModel", userSchema);

export default userModel;

