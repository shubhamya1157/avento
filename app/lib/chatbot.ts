// ===========================================================================
// chatbot.ts — The brain behind the "Help" chat widget
// ===========================================================================
//
// The help chatbot is HYBRID — it answers in two ways, and always works:
//
//   1. BUILT-IN RULES (always on): a small list of common questions and ready
//      answers ("how do I book?", "do you take payments?"). If the visitor's
//      message matches one, we reply instantly — no internet, no API key, free.
//
//   2. CLAUDE (optional): if an `ANTHROPIC_API_KEY` is set, anything the rules
//      DON'T cover is sent to Claude (Anthropic's AI) for a free-form answer,
//      using a system prompt that teaches it about Avento. Without the key, we
//      fall back to a polite "please contact us" message.
//
// This file holds the rules, the Claude call, and the small helpers the
// /api/chat route uses to decide which path to take. (Same graceful-degradation
// idea as razorpay.ts and cloudinary.ts: the feature works with or without keys.)
// ===========================================================================

// The official Anthropic SDK — the ready-made library for talking to Claude.
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// The shape of one chat message. `role` is who said it ("user" = the visitor,
// "assistant" = the bot); `content` is the text. The widget sends the whole
// back-and-forth so Claude has the context of the conversation.
// ---------------------------------------------------------------------------
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// 1. BUILT-IN RULES
//
// Each entry has some `keywords` and an `answer`. If the visitor's message
// contains ANY of the keywords, we return that answer. Order matters a little:
// the first match wins, so more specific topics come first.
// ---------------------------------------------------------------------------
const BUILTIN_ANSWERS: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["book", "rent", "reserve", "reservation"],
    answer:
      "To book a ride: open any vehicle and tap “Book This Ride”, pick your pick-up and return dates, and confirm. You’ll need to be logged in. You can see all your bookings on the “My Bookings” page.",
  },
  {
    keywords: ["pay", "payment", "card", "razorpay", "money", "price", "cost"],
    answer:
      "Pricing is per day and the total is shown live as you pick your dates. When online payments are enabled, you’ll pay securely via Razorpay at checkout; otherwise the booking is confirmed in demo mode with no charge.",
  },
  {
    keywords: ["cancel", "refund"],
    answer:
      "You can cancel a confirmed booking yourself from the “My Bookings” page — just tap “Cancel Ride” on the booking you no longer need.",
  },
  {
    keywords: ["partner", "list my", "list a", "rent out", "owner", "earn"],
    answer:
      "Want to earn from your own vehicle? Head to the “Partner” page to list it — add photos and details, and once an admin approves it, it appears in the fleet for renters to book.",
  },
  {
    keywords: ["review", "rating", "rate", "stars"],
    answer:
      "After you’ve booked a vehicle you can rate it 1–5 stars and leave a comment from the “My Bookings” page. Reviews help other renters choose.",
  },
  {
    keywords: ["login", "log in", "sign in", "sign up", "register", "account", "password"],
    answer:
      "Tap “Login” in the top navigation to sign in or create an account. You can use your email (with a one-time code) or “Continue with Google”.",
  },
  {
    keywords: ["admin", "approve", "dashboard"],
    answer:
      "Admins review partner-submitted vehicles at /admin (dashboard) and /admin/vehicles (approval queue). Admin access is granted by email — ask the site owner to be added.",
  },
  {
    keywords: ["contact", "support", "help", "email", "phone"],
    answer:
      "Need a human? Use the “Contact” page to send us a message and we’ll get back to you by email.",
  },
  {
    keywords: ["hi", "hello", "hey", "yo "],
    answer:
      "Hi! I’m the Avento assistant. Ask me about booking a ride, payments, listing your own vehicle, or anything else about the site.",
  },
];

// ---------------------------------------------------------------------------
// matchBuiltInAnswer: try to answer from the rules above. Returns the answer
// text if a keyword matches, or null if nothing matched (so the caller knows to
// try Claude instead).
// ---------------------------------------------------------------------------
export function matchBuiltInAnswer(message: string): string | null {
  // Lower-case once so matching is case-insensitive ("Book" == "book").
  const text = message.toLowerCase();
  for (const entry of BUILTIN_ANSWERS) {
    if (entry.keywords.some((kw) => text.includes(kw))) {
      return entry.answer;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2. CLAUDE (optional)
// ---------------------------------------------------------------------------

// Is the Claude path available? True only if an API key is configured AND it
// looks like a real Anthropic key (they always start with "sk-ant-"). This
// guards against a placeholder / wrong-service key being set, which would
// otherwise sail past this check and then fail every request with a 401.
export function isClaudeConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return Boolean(key && key.startsWith("sk-ant-"));
}

// The system prompt: background we give Claude so its answers fit THIS site.
// (A "system prompt" is a set of standing instructions the AI follows for the
// whole conversation.) Keep it factual and on-topic.
const AVENTO_SYSTEM_PROMPT = `You are the friendly in-app help assistant for "Avento", a premium vehicle-rental web app.

What users can do on Avento:
- Browse a fleet of cars, bikes and SUVs and book one for a range of dates (price is per day).
- Booking requires a logged-in account (email one-time-code or Google sign-in). Bookings and cancellations are managed on the "My Bookings" page.
- Payments: when enabled, checkout uses Razorpay; otherwise bookings confirm in a no-charge demo mode.
- After booking, users can leave a 1–5 star review with a comment.
- "Partners" can list their own vehicle on the "Partner" page; an admin approves it before it appears for renters.
- Admins approve partner vehicles at /admin and /admin/vehicles.

Style: concise, warm and helpful. Answer in 1–3 short sentences. Only discuss Avento and renting vehicles; if asked something unrelated, gently steer back to how you can help with the app. If you don't know a specific detail, suggest using the Contact page.`;

// Build the client once and reuse it across requests (lazy, so importing this
// file never throws when the key is absent).
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    // The SDK reads ANTHROPIC_API_KEY from the environment automatically.
    client = new Anthropic();
  }
  return client;
}

// ---------------------------------------------------------------------------
// askClaude: send the conversation to Claude and return its reply text.
//
// We use claude-haiku-4-5 — Anthropic's fastest, most cost-effective model,
// which is plenty for short help answers. `max_tokens` caps the reply length.
// ---------------------------------------------------------------------------
export async function askClaude(messages: ChatMessage[]): Promise<string> {
  const response = await getClient().messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: AVENTO_SYSTEM_PROMPT,
    // The SDK's message shape matches our ChatMessage shape exactly.
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  // The reply is a list of content "blocks"; we want the text ones joined up.
  // (We narrow by `block.type === "text"` so TypeScript knows `.text` exists.)
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}
