// ===========================================================================
// ChatWidget.tsx — The floating "Help" chat assistant shown on every page
// ===========================================================================
//
// A circular launcher sits in the bottom-right corner of every page. Click it
// and a polished chat panel slides up where the visitor can ask questions; their
// messages go to /api/chat, which answers from built-in rules or (if enabled)
// Claude. See app/lib/chatbot.ts and app/api/chat/route.ts for the backend.
//
// It's mounted once, in Providers.tsx, so it appears across the whole app.
//
// The styling mirrors the home page's premium black/white look (white accents,
// soft white borders on near-black glass — NOT coloured gradients) so the widget
// feels part of the same site. UI touches that make it feel "smart":
//   - A car-badge avatar (public/chat-avatar.svg) on the launcher + header.
//   - A live "Online" status dot with a soft pulse.
//   - Bubbles animate in, the bot's reply has its avatar beside it.
//   - A three-dot "typing…" animation instead of a plain spinner.
//   - Tap-to-send quick-reply chips so a visitor can start with one click.
//   - Each message shows the time it was sent.
// ===========================================================================

'use client';

import { useEffect, useRef, useState } from "react";
// usePathname tells us which URL we're on right now, so we can hide the widget
// inside the admin panel (admins manage the platform — they don't need the
// customer help bot floating over their dashboard).
import { usePathname } from "next/navigation";
import { X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// One message in the on-screen conversation. (Mirrors the ChatMessage shape the
// API uses, kept local so this client file imports no server code.) `at` is the
// timestamp string we show under the bubble — purely cosmetic.
interface Message {
  role: "user" | "assistant";
  content: string;
  at: string;
}

// Small helper: the current time formatted like "3:42 PM" for the bubble stamp.
const now = () =>
  new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// The greeting the bot opens with before the visitor says anything.
const WELCOME: Message = {
  role: "assistant",
  content:
    "Hi! I’m the Avento assistant 👋 Ask me about booking a ride, payments, listing your own vehicle, reviews — anything about the site.",
  at: "",
};

// One-tap conversation starters shown until the visitor sends their first line.
const QUICK_REPLIES = [
  "How do I book a ride?",
  "How do payments work?",
  "List my vehicle",
  "Track my trip",
  "What documents do I need?",
  "Cancellation & refunds",
  "Do you deliver the car?",
  "Is insurance included?",
  "How do reviews work?",
  "Contact support",
];

export default function ChatWidget() {
  // Hide the help bubble everywhere under "/admin". The widget is mounted once in
  // Providers.tsx (so it shows on every page), so this per-path guard is how we
  // keep it OFF the admin panel while leaving it on for the public site.
  const pathname = usePathname();
  const onAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  const [open, setOpen] = useState(false); // is the panel open?
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false); // waiting on the server?

  // A ref to the bottom of the message list so we can auto-scroll to it.
  const endRef = useRef<HTMLDivElement | null>(null);

  // Whenever the messages change (or the panel opens), scroll to the newest one.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  // Show the quick-reply chips only at the very start (just the welcome line,
  // nothing sent yet, and we're not mid-request).
  const showQuickReplies = messages.length === 1 && !loading;

  // ------------------------------------------------------------------------
  // Send a message: add it to the list, POST the whole conversation to
  // /api/chat, then append the assistant's reply. `preset` lets a quick-reply
  // chip send its text directly without going through the input box.
  // ------------------------------------------------------------------------
  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || loading) return; // nothing to send, or already busy

    // Show the visitor's message immediately and clear the input box.
    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content: text, at: now() },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the full conversation (minus the very first canned welcome, which
        // is just UI fluff) so the assistant has context. The server only needs
        // role + content, so we strip our cosmetic `at` field here.
        body: JSON.stringify({
          messages: nextMessages.slice(1).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "The assistant is unavailable");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, at: now() },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error
              ? `Sorry — ${err.message}. Please try again or use the Contact page.`
              : "Something went wrong. Please try again.",
          at: now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Form submit just delegates to send() with whatever is in the input box.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send();
  };

  // On admin pages, render nothing at all (this sits AFTER the hooks above, since
  // React requires hooks to run on every render — we just skip the UI).
  if (onAdmin) return null;

  return (
    <>
      {/* The floating open/close launcher. The car badge IS the button (no white
          plate behind it) — just the avatar disc, with an X when open. */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help chat" : "Open help chat"}
        className="group fixed bottom-6 right-6 z-[10001] flex h-16 w-16 items-center justify-center rounded-full shadow-2xl ring-1 ring-white/15 transition hover:scale-105 active:scale-95"
      >
        {open ? (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 text-white">
            <X size={24} />
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/chat-avatar.svg"
            alt="Avento assistant"
            className="h-16 w-16 rounded-full"
          />
        )}
      </button>

      {/* The chat panel, animated in/out. Near-black glass with soft white
          borders — same language as the hero's glass bar and the cards. */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-24 right-6 z-[10001] flex h-[34rem] w-[min(23rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl"
          >
            {/* Header — avatar, name, and live status on a subtle white wash. */}
            <div className="relative flex items-center gap-3 overflow-hidden border-b border-white/10 bg-white/5 px-5 py-4">
              {/* faint decorative glow behind the avatar */}
              <div className="pointer-events-none absolute -left-6 -top-10 h-28 w-28 rounded-full bg-white/5 blur-2xl" />
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/chat-avatar.svg"
                  alt="Avento assistant"
                  className="h-11 w-11 rounded-full ring-1 ring-white/15"
                />
              </div>
              <div className="relative">
                <h3 className="text-sm font-bold text-white">Avento Assistant</h3>
                <p className="text-[11px] text-zinc-400">Replies in seconds</p>
              </div>
            </div>

            {/* Message list */}
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-end gap-2 ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* The bot's avatar sits to the left of its messages. */}
                  {m.role === "assistant" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/chat-avatar.svg"
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-full ring-1 ring-white/10"
                    />
                  )}

                  <div className="flex max-w-[78%] flex-col gap-1">
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        m.role === "user"
                          ? "rounded-br-sm bg-white font-medium text-black"
                          : "rounded-bl-sm border border-white/10 bg-white/5 text-zinc-200"
                      }`}
                    >
                      {m.content}
                    </div>
                    {/* Timestamp under the bubble (hidden for the canned welcome
                        line, which has no real time). */}
                    {m.at && (
                      <span
                        className={`px-1 text-[10px] text-zinc-600 ${
                          m.role === "user" ? "text-right" : "text-left"
                        }`}
                      >
                        {m.at}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Quick-reply chips — one-tap conversation starters. */}
              {showQuickReplies && (
                <div className="flex flex-wrap gap-2 pl-9">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Animated three-dot "typing…" indicator while waiting. */}
              {loading && (
                <div className="flex items-end gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/chat-avatar.svg"
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-full ring-1 ring-white/10"
                  />
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="h-1.5 w-1.5 rounded-full bg-zinc-400"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                        transition={{
                          duration: 0.9,
                          repeat: Infinity,
                          delay: d * 0.15,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Invisible anchor we scroll to. */}
              <div ref={endRef} />
            </div>

            {/* Input row */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-white/10 bg-white/[0.02] p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything…"
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-white/30"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
