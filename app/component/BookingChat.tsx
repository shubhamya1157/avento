// ===========================================================================
// BookingChat.tsx — The live chat panel for one booking
// ===========================================================================
//
// A slide-up modal where the two people involved in a booking (the customer and
// the vehicle's owner — or an admin) can message each other in real time. It is
// reused from several places: the customer's "My Bookings" page, the partner's
// bookings page, and the admin bookings table — all by passing a bookingId.
//
// HOW IT WORKS:
//   1. On open, it loads the past messages over HTTP (GET .../messages).
//   2. It joins this booking's Socket.io "room" and listens for new messages, so
//      anything the other person sends appears instantly.
//   3. Sending shows the message IMMEDIATELY (optimistic) with a little clock,
//      then POSTs it. On success the temporary copy is swapped for the saved one
//      (de-duplicated by id against the live broadcast); on failure it's flagged
//      so the sender knows it didn't go through.
// ===========================================================================

'use client';

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { X, Send, Loader2, MessageSquare, Clock, AlertCircle, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import { getSocket, bookingRoom } from "@/app/lib/socket-client";

// One chat message as the API returns it, plus two client-only flags used while
// a message we just sent is still in flight.
interface ChatMsg {
  _id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  pending?: boolean; // optimistic copy, not yet confirmed by the server
  failed?: boolean;  // the send failed — show a warning + let them retry
}

interface BookingChatProps {
  bookingId: string;
  title: string;        // e.g. "Tesla Model S" — shown in the header
  onClose: () => void;
}

// "2:45 PM" — the clock time a message was sent.
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// A stable per-day key ("2026-6-21") used to decide where a date divider goes.
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// "Today" / "Yesterday" / "Mon, Jun 16" — the label on a date divider.
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return "Today";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function BookingChat({ bookingId, title, onClose }: BookingChatProps) {
  const { data: session } = useSession();
  const myId = session?.user?.id;
  const myName = session?.user?.name ?? "You";

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);   // loading the history
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false); // socket online?
  const [atBottom, setAtBottom] = useState(true);    // is the list scrolled to the end?
  const [unseen, setUnseen] = useState(0);           // new messages while scrolled up

  const endRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const tempCounter = useRef(0); // gives each optimistic message a unique key

  // Add a message, ignoring it if we already have it (dedupe by id). Used by both
  // the live socket handler and our own optimistic send.
  const addMessage = (msg: ChatMsg) =>
    setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));

  // Jump the message list to the newest message.
  const scrollToEnd = (behavior: ScrollBehavior = "smooth") =>
    endRef.current?.scrollIntoView({ behavior });

  // ---- Load history once, then wire up the live socket. ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}/messages`);
        if (!res.ok) throw new Error("Failed to load the conversation");
        const data = await res.json();
        if (!cancelled) setMessages(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load chat");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Join this booking's room and listen for messages others send. We also track
    // whether the socket is actually connected, to show an honest status dot.
    const socket = getSocket();
    const room = bookingRoom(bookingId);
    const join = () => socket.emit("join", room);

    setConnected(socket.connected);
    if (socket.connected) join();

    const onConnect = () => { setConnected(true); join(); }; // re-join after a reconnect
    const onDisconnect = () => setConnected(false);
    const onMessage = (msg: ChatMsg) => addMessage(msg);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message", onMessage);

    // Cleanup when the panel closes: stop listening and leave the room.
    return () => {
      cancelled = true;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message", onMessage);
      socket.emit("leave", room);
    };
  }, [bookingId]);

  // ---- Auto-scroll, but only if the reader is already at the bottom. If they've
  //      scrolled up to read history, we don't yank them down — we count the new
  //      messages and offer a "jump to latest" pill instead. ----
  useEffect(() => {
    if (loading) return;
    const last = messages[messages.length - 1];
    const mine = last && String(last.senderId) === String(myId);
    if (atBottom || mine) {
      scrollToEnd(messages.length > 30 ? "auto" : "smooth");
      setUnseen(0);
    } else {
      setUnseen((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading]);

  // Track whether the list is scrolled to (near) the bottom.
  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(near);
    if (near) setUnseen(0);
  };

  // ---- Send a message (optimistically). ----
  const postMessage = async (text: string, tempId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send");
      // Swap our temporary copy for the saved one, and drop any duplicate that
      // the live broadcast may have already inserted.
      setMessages((prev) => {
        const replaced = prev.map((m) => (m._id === tempId ? (data as ChatMsg) : m));
        return replaced.filter((m, i) => replaced.findIndex((x) => x._id === m._id) === i);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setMessages((prev) => prev.map((m) => (m._id === tempId ? { ...m, pending: false, failed: true } : m)));
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setError(null);
    setInput("");
    setAtBottom(true); // sending always jumps us to the latest

    // Show it instantly with a temporary id and a "pending" clock.
    const tempId = `temp-${tempCounter.current++}`;
    addMessage({
      _id: tempId,
      senderId: String(myId ?? ""),
      senderName: myName,
      text,
      createdAt: new Date().toISOString(),
      pending: true,
    });

    postMessage(text, tempId);
  };

  // Retry a failed message: flip it back to pending and POST again.
  const retry = (m: ChatMsg) => {
    setMessages((prev) => prev.map((x) => (x._id === m._id ? { ...x, pending: true, failed: false } : x)));
    setError(null);
    postMessage(m.text, m._id);
  };

  return (
    // A dark backdrop covering the page; clicking it closes the panel.
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      {/* Stop clicks inside the panel from closing it. */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-zinc-950 shadow-2xl sm:h-[34rem] sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-white/20 to-white/5 text-white">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500">
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
                {connected ? "Connected" : "Connecting…"}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close chat" className="rounded-lg p-1 text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div ref={listRef} onScroll={handleScroll} className="relative flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 size={22} className="animate-spin text-zinc-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="mt-12 flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-zinc-500">
                <MessageSquare size={20} />
              </div>
              <p className="text-xs text-zinc-500">No messages yet. Say hello 👋</p>
            </div>
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const mine = String(m.senderId) === String(myId);
              const showDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
              // Group consecutive messages from the same sender on the same day.
              const startGroup = showDay || !prev || String(prev.senderId) !== String(m.senderId);
              const endGroup = !next || dayKey(next.createdAt) !== dayKey(m.createdAt) || String(next.senderId) !== String(m.senderId);

              return (
                <div key={m._id}>
                  {showDay && (
                    <div className="my-3 flex items-center justify-center">
                      <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                        {dayLabel(m.createdAt)}
                      </span>
                    </div>
                  )}

                  <div className={`flex flex-col ${mine ? "items-end" : "items-start"} ${endGroup ? "mb-2.5" : "mb-0.5"}`}>
                    {/* Show the other person's name once, above their group. */}
                    {!mine && startGroup && (
                      <span className="mb-0.5 px-1 text-[10px] font-medium text-zinc-500">{m.senderName}</span>
                    )}

                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 text-xs leading-relaxed ${
                        mine
                          ? `bg-white font-medium text-black ${m.failed ? "opacity-60" : ""} rounded-2xl ${endGroup ? "rounded-br-md" : ""}`
                          : `border border-white/10 bg-white/5 text-zinc-200 rounded-2xl ${endGroup ? "rounded-bl-md" : ""}`
                      }`}
                    >
                      {m.text}
                    </div>

                    {/* Footer line per group end: time, plus pending / failed hints. */}
                    {endGroup && (
                      <div className={`mt-0.5 flex items-center gap-1 px-1 text-[9px] ${mine ? "text-zinc-500" : "text-zinc-600"}`}>
                        {m.failed ? (
                          <button onClick={() => retry(m)} className="flex items-center gap-1 text-red-400 hover:underline">
                            <AlertCircle size={10} /> Failed — tap to retry
                          </button>
                        ) : m.pending ? (
                          <span className="flex items-center gap-1"><Clock size={10} /> Sending…</span>
                        ) : (
                          <span>{formatTime(m.createdAt)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* "Jump to latest" pill when new messages arrive while scrolled up. */}
        {unseen > 0 && (
          <button
            onClick={() => { scrollToEnd(); setUnseen(0); }}
            className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-black shadow-lg"
          >
            <ArrowDown size={12} /> {unseen} new
          </button>
        )}

        {error && <p className="px-4 pb-1 text-xs text-red-400">{error}</p>}

        {/* Input row */}
        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-white/10 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-white/30"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:scale-105 active:scale-95 disabled:opacity-40"
          >
            <Send size={15} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
