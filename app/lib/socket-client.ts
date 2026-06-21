// ===========================================================================
// socket-client.ts — One shared Socket.io connection for the whole browser tab
// ===========================================================================
//
// The live chat (and later the video call) talk to our Socket.io server through
// a single connection. Opening a NEW connection for every component would be
// wasteful, so we create it once here and hand the same one back every time.
// (This is the "singleton" pattern — one shared instance.)
//
// WHERE DO WE CONNECT? If NEXT_PUBLIC_SOCKET_URL is set we use it; otherwise we
// connect to the same origin the page was served from — which is correct for
// local development (node server.js serves the app AND the socket on :3000).
// ===========================================================================

'use client';

import { io, type Socket } from "socket.io-client";

// Remembered across calls so we reuse the one connection.
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL;
    // io(undefined) connects to the same origin as the page.
    socket = url ? io(url) : io();
  }
  return socket;
}

// The room name for one booking's conversation/call. MUST match the server's
// shape (see app/lib/realtime.ts) so both sides land in the same room.
export function bookingRoom(bookingId: string): string {
  return `booking:${bookingId}`;
}
