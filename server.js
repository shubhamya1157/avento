// ===========================================================================
// server.js — Custom Next.js server that ALSO runs Socket.io (live features)
// ===========================================================================
//
// Normally Next.js runs itself with `next dev` / `next start`. But our live chat
// and video-call features need a WebSocket server (Socket.io) running alongside
// Next, in the SAME process, so they can share memory. So we "eject" to a custom
// server: this file boots Next AND Socket.io together.
//
// (See node_modules/next/dist/docs/01-app/02-guides/custom-server.md.)
//
// IMPORTANT: this file does NOT go through Next's compiler — it's plain Node.js.
// That's why it uses require(...) (CommonJS), not import. Our package.json has no
// "type": "module", so CommonJS is the right choice here.
//
// HOW THE PIECES TALK:
//   - Socket.io lives on the `io` object we create below.
//   - We stash `io` on globalThis._io so our normal Next API routes (which run in
//     this same process) can reach it and broadcast messages — see
//     app/lib/realtime.ts. This avoids a second server just to send events.
// ===========================================================================

const { createServer } = require("http"); // Node's built-in web server
const next = require("next");             // the Next.js framework
const { Server } = require("socket.io");  // the WebSocket (realtime) server

// Which port to listen on, and whether we're in development (hot-reload) mode.
const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";

// Build the Next app. `getRequestHandler()` gives us a function that knows how to
// answer every normal page/API request — we hand each incoming request to it.
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // 1. A plain HTTP server whose every request is handled by Next.
  const httpServer = createServer((req, res) => handle(req, res));

  // 2. Attach Socket.io to that same HTTP server. CORS is permissive here for
  //    simplicity; in production you'd lock `origin` to your real domain.
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // 3. Share the io instance with our Next API routes (same process).
  globalThis._io = io;

  // 4. Wire up what happens when a browser connects.
  io.on("connection", (socket) => {
    // A client asks to "join" a room (e.g. one booking's chat, or a KYC call).
    // Rooms keep messages private to the people in them. We only accept string
    // room names to avoid misuse.
    socket.on("join", (room) => {
      if (typeof room === "string" && room) socket.join(room);
    });

    // Leaving a room (e.g. closing the chat panel).
    socket.on("leave", (room) => {
      if (typeof room === "string" && room) socket.leave(room);
    });

    // --- WebRTC video-call signaling (used in the video KYC / video call) ---
    // These messages just RELAY the browser-to-browser call setup data between
    // the two people in a room. The server never looks inside them; it only
    // passes them to the OTHER person in the same room (socket.to(room)).
    socket.on("signal", ({ room, data }) => {
      if (typeof room === "string" && room) socket.to(room).emit("signal", data);
    });

    // Let the other side know we joined / left a call, so it can start/stop.
    socket.on("call:join", (room) => {
      if (typeof room === "string" && room) {
        socket.join(room);
        socket.to(room).emit("call:peer-joined");
      }
    });
    socket.on("call:leave", (room) => {
      if (typeof room === "string" && room) {
        socket.to(room).emit("call:peer-left");
        socket.leave(room);
      }
    });

    // --- Live trip tracking ---
    // The driver's browser sends its GPS position; we relay it to everyone else
    // in the booking's room (the passenger watching the map). We pass the coords
    // straight through — they're just two numbers — and only sanity-check them.
    socket.on("trip:location", ({ room, coords }) => {
      const ok =
        typeof room === "string" && room &&
        coords && typeof coords.lat === "number" && typeof coords.lng === "number";
      if (ok) socket.to(room).emit("trip:location", coords);
    });

    // The driver stopped sharing (toggled off, or left the page). Tell the
    // passenger right away so they don't wait on a stale "Live" indicator.
    socket.on("trip:stop", (room) => {
      if (typeof room === "string" && room) socket.to(room).emit("trip:stop");
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Avento ready on http://localhost:${port} (${dev ? "dev" : "production"})`);
  });
});
