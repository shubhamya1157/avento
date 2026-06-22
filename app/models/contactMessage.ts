// ===========================================================================
// models/contactMessage.ts — The "ContactMessage" blueprint (a contact-form note)
// ===========================================================================
//
// One document per message a visitor sends from the /contact page. We keep every
// field the form collects so the team can read and reply later. `phone` is
// optional (the form doesn't require it); everything else is required. mongoose
// stamps `createdAt` so messages can be shown newest-first.
// ===========================================================================

import mongoose, { Document } from "mongoose";

// The TypeScript shape of one contact message.
export interface ContactMessageType extends Document {
    name: string;     // who sent it
    email: string;    // how to reply to them
    phone?: string;   // optional phone number
    subject: string;  // what it's about
    message: string;  // the message body
}

const contactMessageSchema = new mongoose.Schema<ContactMessageType>(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
        phone: { type: String, trim: true, maxlength: 40 },
        subject: { type: String, required: true, trim: true, maxlength: 200 },
        // A generous cap so a real message fits but nobody can post a novel.
        message: { type: String, required: true, trim: true, maxlength: 5000 },
    },
    // Auto-add `createdAt` (used to sort newest-first) and `updatedAt`.
    { timestamps: true }
);

// Reuse-or-create the model (hot-reload safety), same pattern as the others.
const contactMessageModel =
    mongoose.models.contactMessageModel ||
    mongoose.model("contactMessageModel", contactMessageSchema);

export default contactMessageModel;
