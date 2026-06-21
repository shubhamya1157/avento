// ===========================================================================
// ChatWidget.tsx — The floating "Help" chat bubble shown on every page
// ===========================================================================
//
// A little circular button sits in the bottom-right corner of every page. Click
// it and a chat panel slides up where the visitor can ask questions; their
// messages go to /api/chat, which answers from built-in rules or (if enabled)
// Claude. See app/lib/chatbot.ts and app/api/chat/route.ts for the backend.
//
// It's mounted once, in Providers.tsx, so it appears across the whole app.
// ===========================================================================

'use client';

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// One message in the on-screen conversation. (Mirrors the ChatMessage shape the
// API uses, kept local so this client file imports no server code.)
interface Message {
  role: "user" | "assistant";
  content: string;
}

// The greeting the bot opens with before the visitor says anything.
const WELCOME: Message = {
  role: "assistant",
  content:
    "Hi! I’m the Avento assistant 👋 Ask me about booking a ride, payments, listing your own vehicle, reviews — anything about the site.",
};

export default function ChatWidget() {
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

  // ------------------------------------------------------------------------
  // Send the typed message: add it to the list, POST the whole conversation to
  // /api/chat, then append the assistant's reply.
  // ------------------------------------------------------------------------
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    const text = input.trim();
    if (!text || loading) return; // nothing to send, or already busy

    // Show the visitor's message immediately and clear the input box.
    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the full conversation (minus the very first canned welcome, which
        // is just UI fluff) so the assistant has context.
        body: JSON.stringify({ messages: nextMessages.slice(1) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "The assistant is unavailable");

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error
              ? `Sorry — ${err.message}. Please try again or use the Contact page.`
              : "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* The floating open/close button. */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help chat" : "Open help chat"}
        className="fixed bottom-6 right-6 z-[10001] flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-2xl transition hover:scale-105 active:scale-95"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* The chat panel, animated in/out. */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-24 right-6 z-[10001] flex h-[30rem] w-[min(22rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
                <MessageCircle size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Avento Assistant</h3>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                  Here to help
                </p>
              </div>
            </div>

            {/* Message list */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-white font-medium text-black"
                        : "border border-white/10 bg-white/5 text-zinc-200"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {/* "Typing…" indicator while waiting for the reply. */}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-zinc-400">
                    <Loader2 size={13} className="animate-spin" /> Thinking…
                  </div>
                </div>
              )}

              {/* Invisible anchor we scroll to. */}
              <div ref={endRef} />
            </div>

            {/* Input row */}
            <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-white/10 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question…"
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
