// ===========================================================================
// api/bookings/[id]/messages/route.ts — Chat history (GET) + send (POST)
// ===========================================================================
//
// URL pattern: "/api/bookings/SOME_ID/messages". The "[id]" folder is a dynamic
// route: [id] is the booking's id. Both methods are PROTECTED and only allow the
// two parties to the booking (booker / owner) or an admin — see requireBookingParty.
//
//   GET  -> the conversation so far (oldest first), to show when the chat opens
//   POST -> save a new message, then broadcast it live to everyone in the room
//
// Persistence + permission live HERE (the trustworthy server). The Socket.io
// layer is only used to DELIVER messages instantly; it never decides who may
// send or read. That keeps the security simple and in one place.
// ===========================================================================

import { requireUser } from "@/app/lib/guards";
import { requireBookingParty } from "@/app/lib/booking-access";
import { emitToBooking } from "@/app/lib/realtime";
import messageModel from "@/app/models/message";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

const MAX_TEXT = 2000; // matches the cap in the Message model

// ---------------------------------------------------------------------------
// GET — return the booking's messages, oldest first.
// ---------------------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireUser();
    if (error) return error;

    const { id } = await context.params;

    // Must be a party to this booking (also confirms the booking exists).
    const access = await requireBookingParty(id, session);
    if (access.error) return access.error;

    const messages = await messageModel.find({ bookingId: id }).sort({ createdAt: 1 });
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Fetch messages error:", error);
    return apiError(getErrorMessage(error, "Failed to load messages"), 500);
  }
}

// ---------------------------------------------------------------------------
// POST — send a message. Saves it, then broadcasts it to the booking's room.
// Body: { text: string }
// ---------------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireUser();
    if (error) return error;

    const { id } = await context.params;

    const access = await requireBookingParty(id, session);
    if (access.error) return access.error;

    const { text } = await req.json();

    // Validate the text: must be a non-empty string within the length cap.
    const clean = typeof text === "string" ? text.trim() : "";
    if (!clean) return apiError("Message cannot be empty", 400);
    if (clean.length > MAX_TEXT) return apiError("Message is too long", 400);

    // Save it, stamping the sender from the trusted session (never the client).
    const message = await messageModel.create({
      bookingId: id,
      senderId: session.user.id,
      senderName: session.user.name ?? "User",
      text: clean,
    });

    // Push it live to everyone currently viewing this booking's chat.
    emitToBooking(id, "message", message);

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return apiError(getErrorMessage(error, "Failed to send message"), 500);
  }
}
