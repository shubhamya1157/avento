// ===========================================================================
// VideoCall.tsx — Live one-to-one video call for a booking (also used for KYC)
// ===========================================================================
//
// A full-screen video call between the two people on a booking (customer and the
// vehicle's owner, or an admin). It doubles as "video KYC": an admin/owner can
// see the customer live to verify their identity before handing over a vehicle.
//
// HOW A BROWSER-TO-BROWSER VIDEO CALL WORKS (WebRTC, in plain words):
//   The actual audio/video travels DIRECTLY between the two browsers, not through
//   our server. But to set that up, the two browsers must first swap some small
//   "how do I reach you?" notes (called the OFFER, the ANSWER, and ICE
//   CANDIDATES). They can't talk yet — that's the whole problem — so they pass
//   those notes through our Socket.io server, which just relays them. This
//   note-passing is called "signaling". Once the notes are exchanged, the media
//   flows peer-to-peer and the server steps out of the way.
//
//   Server relay events (defined in server.js):
//     emit "call:join"  -> join the room; the person ALREADY there gets
//                          "call:peer-joined" and becomes the CALLER (sends offer)
//     emit "signal"     -> relayed to the other person as "signal" (we wrap the
//                          offer / answer / ICE candidate inside it)
//     emit "call:leave" -> the other person gets "call:peer-left"
//
// WHO CALLS WHOM (avoids both sides offering at once): whoever was in the room
// FIRST receives "call:peer-joined" when the second arrives, and makes the offer.
// The second person simply waits for that offer and answers it.
//
// NOTE: cameras/mics only work over HTTPS or on localhost (a browser security
// rule). Local dev on http://localhost:3000 is fine; deploy behind HTTPS.
// ===========================================================================

'use client';

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, ShieldCheck } from "lucide-react";
import { getSocket, bookingRoom } from "@/app/lib/socket-client";

interface VideoCallProps {
  bookingId: string;
  title: string;       // e.g. "Tesla Model S" — shown in the header
  onClose: () => void;
}

// Public STUN server: helps each browser discover its own public address so the
// two can find a path to each other. (Free, run by Google.) For tricky networks
// you'd also add a TURN server, but STUN alone covers most cases.
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// The shapes of the little notes we relay through the server. A "kind" tag tells
// the other side how to handle each one.
type SignalData =
  | { kind: "offer"; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; sdp: RTCSessionDescriptionInit }
  | { kind: "candidate"; candidate: RTCIceCandidateInit };

type CallStatus = "connecting" | "waiting" | "connected" | "ended" | "error";

// Turn a number of seconds into "m:ss" for the call timer.
function fmtDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoCall({ bookingId, title, onClose }: VideoCallProps) {
  // The two <video> elements we paint streams into.
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Long-lived call objects kept in refs (they must survive re-renders without
  // re-creating them): the peer connection and our own camera/mic stream.
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CallStatus>("connecting");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [seconds, setSeconds] = useState(0); // call duration, once connected

  // ---- A simple call timer that runs only while connected. ----
  useEffect(() => {
    if (status !== "connected") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  // ---- Set up the whole call once, when the panel opens. ----
  useEffect(() => {
    const socket = getSocket();
    const room = bookingRoom(bookingId);
    let closed = false; // guards against acting after cleanup

    // Helper: send one signaling note to the other person via the server.
    const sendSignal = (data: SignalData) => socket.emit("signal", { room, data });

    // Build a fresh peer connection and teach it what to do on key events.
    const createPeer = (stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Put OUR camera/mic tracks onto the connection so the other side sees us.
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // When WebRTC discovers a possible network path, relay it to the peer.
      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal({ kind: "candidate", candidate: e.candidate.toJSON() });
      };

      // When the other person's audio/video arrives, show it in the big video.
      pc.ontrack = (e) => {
        if (closed) return;
        const [remote] = e.streams;
        if (remoteVideoRef.current && remote) {
          remoteVideoRef.current.srcObject = remote;
        }
        setStatus("connected");
      };

      // Reflect connection changes in the UI.
      pc.onconnectionstatechange = () => {
        if (closed) return;
        if (pc.connectionState === "connected") setStatus("connected");
        if (pc.connectionState === "failed") {
          setStatus("error");
          setErrorMsg("Connection lost. Please try again.");
        }
      };

      return pc;
    };

    // The main async setup: get the camera, build the peer, wire signaling, join.
    (async () => {
      try {
        // 1. Ask the browser for camera + microphone access.
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (closed) {
          stream.getTracks().forEach((t) => t.stop()); // user closed mid-prompt
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // 2. Build the peer connection with our tracks attached.
        const pc = createPeer(stream);
        pcRef.current = pc;

        // 3. Handle notes coming from the other person.
        socket.on("signal", async (data: SignalData) => {
          if (closed || !pcRef.current) return;
          const peer = pcRef.current;
          try {
            if (data.kind === "offer") {
              // We're the CALLEE: accept the offer and reply with an answer.
              await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              sendSignal({ kind: "answer", sdp: answer });
            } else if (data.kind === "answer") {
              // We're the CALLER: the callee accepted — finish the handshake.
              await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } else if (data.kind === "candidate") {
              // A network path from the other side — add it (ignore late stragglers).
              await peer.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
            }
          } catch (err) {
            console.error("Signal handling error:", err);
          }
        });

        // 4. If we were here first, the newcomer triggers this: we make the offer.
        socket.on("call:peer-joined", async () => {
          if (closed || !pcRef.current) return;
          try {
            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);
            sendSignal({ kind: "offer", sdp: offer });
          } catch (err) {
            console.error("Offer error:", err);
          }
        });

        // 5. The other person hung up.
        socket.on("call:peer-left", () => {
          if (closed) return;
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
          setSeconds(0);
          setStatus("waiting");
        });

        // 6. Everything is ready — announce we've joined the call room. If someone
        //    is already waiting, THEY will now send us an offer (step 4 on their
        //    side). If we're first, we simply wait for the other to arrive.
        setStatus("waiting");
        socket.emit("call:join", room);
      } catch (err) {
        console.error("getUserMedia error:", err);
        setStatus("error");
        setErrorMsg(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera / microphone permission was denied."
            : "Could not access your camera or microphone."
        );
      }
    })();

    // ---- Cleanup when the panel closes: tear the whole call down. ----
    return () => {
      closed = true;
      socket.emit("call:leave", room);
      socket.off("signal");
      socket.off("call:peer-joined");
      socket.off("call:peer-left");
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop()); // turn the light off
      localStreamRef.current = null;
    };
  }, [bookingId]);

  // ---- Controls: flipping a track's `enabled` flag mutes/blanks it instantly. ----
  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    }
  };

  // A short bit of text for the header pill describing the current state.
  const statusLabel =
    status === "connected" ? fmtDuration(seconds)
    : status === "waiting" ? "Ringing…"
    : status === "error" ? "Failed"
    : "Connecting…";

  return (
    // Full-screen call stage with a subtle gradient (premium feel).
    <div className="fixed inset-0 z-[10000] flex flex-col bg-gradient-to-b from-zinc-950 via-black to-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-white/20 to-white/5 text-white">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Video KYC · secure</p>
          </div>
        </div>

        {/* Live status / call-duration pill. */}
        <span
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums ${
            status === "connected"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : status === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-white/10 bg-white/5 text-zinc-300"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              status === "connected" ? "bg-emerald-400" : status === "error" ? "bg-red-400" : "animate-pulse bg-amber-400"
            }`}
          />
          {statusLabel}
        </span>
      </div>

      {/* Video stage: the other person fills the screen; our own camera sits in a
          small picture-in-picture tile in the corner. */}
      <div className="relative mx-4 flex-1 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
        {/* Remote (the other person). */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="h-full w-full bg-zinc-900 object-cover"
        />

        {/* Status overlay shown until the other person's video is flowing. */}
        {status !== "connected" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900/85 text-center">
            {status === "error" ? (
              <>
                <VideoOff size={28} className="text-red-400" />
                <p className="max-w-xs text-sm text-red-300">{errorMsg}</p>
              </>
            ) : (
              <>
                <div className="relative flex h-14 w-14 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-white/10" />
                  <Loader2 size={26} className="animate-spin text-zinc-400" />
                </div>
                <p className="text-sm text-zinc-400">
                  {status === "connecting" ? "Starting your camera…" : "Waiting for the other person to join…"}
                </p>
              </>
            )}
          </div>
        )}

        {/* Local picture-in-picture (muted + mirrored, like every video app). */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bottom-4 right-4 overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl"
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-32 w-24 -scale-x-100 object-cover sm:h-44 sm:w-32"
          />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-zinc-500">
              <VideoOff size={18} />
            </div>
          )}
        </motion.div>
      </div>

      {/* Control bar: mute mic, turn camera off, and hang up — each labelled. */}
      <div className="flex items-end justify-center gap-6 px-5 py-6">
        <Control label={micOn ? "Mute" : "Unmute"} onClick={toggleMic} active={micOn}>
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </Control>

        <Control label="End" onClick={onClose} variant="danger">
          <PhoneOff size={20} />
        </Control>

        <Control label={camOn ? "Camera" : "Camera off"} onClick={toggleCam} active={camOn}>
          {camOn ? <Video size={18} /> : <VideoOff size={18} />}
        </Control>
      </div>
    </div>
  );
}

// ---- One labelled round control button. ----
function Control({
  children,
  label,
  onClick,
  active = true,
  variant = "default",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  variant?: "default" | "danger";
}) {
  const isDanger = variant === "danger";
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        aria-label={label}
        className={`flex items-center justify-center rounded-full transition active:scale-95 ${
          isDanger
            ? "h-16 w-16 bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/25"
            : active
            ? "h-14 w-14 bg-white/10 text-white hover:bg-white/20"
            : "h-14 w-14 bg-red-500/20 text-red-400 hover:bg-red-500/30"
        }`}
      >
        {children}
      </button>
      <span className="text-[10px] font-medium text-zinc-500">{label}</span>
    </div>
  );
}
