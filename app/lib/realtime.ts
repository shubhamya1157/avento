// ===========================================================================
// realtime.ts — Sending live events from our API routes to connected browsers
// ===========================================================================
//
// Our custom server (server.js) creates the Socket.io server and stashes it on
// globalThis._io. Because our Next API routes run in that SAME Node process, they
// can reach that same `io` object and push live updates to browsers — for
// example, broadcasting a new chat message to everyone viewing that booking.
//
// This file is the thin, type-safe bridge to that shared `io`. It's written
// defensively: if for some reason the socket server isn't running (e.g. someone
// ran `next dev` instead of `node server.js`), the helpers simply do nothing
// instead of crashing the request.
// ===========================================================================

// The Socket.io server type — only the one method we use, to keep this loose.
type MinimalIO = {
  to: (room: string) => { emit: (event: string, payload: unknown) => void };
};

// Read the shared io instance off the global object (set in server.js). Returns
// null if it isn't there (so callers can no-op safely).
function getIO(): MinimalIO | null {
  return (globalThis as unknown as { _io?: MinimalIO })._io ?? null;
}

// The room name for one booking's conversation/call. Used by both the server and
// (via the same string shape) the browser client when it joins a room.
export function bookingRoom(bookingId: string): string {
  return `booking:${bookingId}`;
}

// Broadcast an event to everyone currently in a booking's room. Safe to call
// even when the socket server isn't running — it will try to relay the event via
// HTTP POST to an external Socket.io server if configured.
export function emitToBooking(bookingId: string, event: string, payload: unknown): void {
  const io = getIO();
  const room = bookingRoom(bookingId);
  if (io) {
    io.to(room).emit(event, payload);
  } else {
    const url = process.env.SOCKET_SERVER_URL;
    const secret = process.env.SOCKET_SHARED_SECRET;
    if (url && secret) {
      fetch(`${url}/api/socket-broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, event, payload, secret }),
      }).catch((err) => {
        console.error("Failed to relay real-time event externally:", err);
      });
    }
  }
}
