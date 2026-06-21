// ===========================================================================
// models/message.ts — The "Message" blueprint (one chat message)
// ===========================================================================
//
// Each message belongs to ONE booking's chat (between the customer who booked
// and the vehicle's owner — or an admin for house-fleet vehicles). We store the
// booking it belongs to, who sent it, a copy of the sender's name (so the chat
// can show "Asha:" without a second lookup), and the text itself.
// ===========================================================================

import mongoose, { Document } from "mongoose";

// The TypeScript shape of one chat message.
export interface MessageType extends Document {
  bookingId: mongoose.Schema.Types.ObjectId; // which booking's conversation
  senderId: mongoose.Schema.Types.ObjectId;  // the user who wrote it
  senderName: string;                         // their display name (copied in)
  text: string;                               // the message body
}

const messageSchema = new mongoose.Schema<MessageType>(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "bookingModel",
      required: true,
      index: true, // we always fetch messages BY booking, so index that field
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "userModel",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,       // drop surrounding whitespace
      maxlength: 2000,  // a sane cap so one message can't be enormous
    },
  },
  // Auto-add createdAt (used to show the time) and updatedAt.
  { timestamps: true }
);

// Reuse-or-create guard (hot-reload safety), same pattern as the other models.
const messageModel = mongoose.models.messageModel || mongoose.model("messageModel", messageSchema);

export default messageModel;
