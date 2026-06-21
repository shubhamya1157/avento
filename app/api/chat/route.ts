// ===========================================================================
// api/chat/route.ts — The help chatbot's backend
// ===========================================================================
//
// URL: "/api/chat". The chat widget POSTs the conversation here and we reply
// with the assistant's next message. This route is PUBLIC (no login needed) so
// visitors can get help before signing up.
//
// HOW IT DECIDES WHAT TO SAY (the "hybrid" approach, see app/lib/chatbot.ts):
//   1. First, try the built-in rules on the latest user message — instant + free.
//   2. If no rule matches AND Claude is configured, ask Claude for a free-form
//      answer using the whole conversation for context.
//   3. If no rule matches and Claude ISN'T configured, return a friendly
//      fallback pointing the visitor to the Contact page.
//
// The reply always includes a `source` ("rules" | "ai" | "fallback") so the
// frontend (or a curious developer) can see which path answered.
// ===========================================================================

import {
  matchBuiltInAnswer,
  isClaudeConfigured,
  askClaude,
  type ChatMessage,
} from "@/app/lib/chatbot";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

// A sensible cap so one message can't be enormous (abuse / cost guard).
const MAX_MESSAGE_LENGTH = 2000;
// Only keep the most recent slice of the conversation as context for Claude.
const MAX_HISTORY = 12;

// ---------------------------------------------------------------------------
// POST /api/chat
// Body: { messages: ChatMessage[] }  — the whole conversation so far, oldest
//        first, ending with the visitor's latest "user" message.
// Reply: { reply: string, source: "rules" | "ai" | "fallback" }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // The body must be a non-empty list of messages.
    if (!Array.isArray(messages) || messages.length === 0) {
      return apiError("No messages provided", 400);
    }

    // The last message should be the visitor's new question.
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user" || typeof last.content !== "string") {
      return apiError("The last message must be from the user", 400);
    }
    if (last.content.length > MAX_MESSAGE_LENGTH) {
      return apiError("Message is too long", 400);
    }

    // --- Step 1: try the built-in rules on the latest message. ---
    const ruleAnswer = matchBuiltInAnswer(last.content);
    if (ruleAnswer) {
      return NextResponse.json({ reply: ruleAnswer, source: "rules" });
    }

    // --- Step 2: rules didn't match — use Claude if it's configured. ---
    if (isClaudeConfigured()) {
      // Clean the history into the simple shape Claude expects, keeping only the
      // last few turns so the request stays small and cheap.
      const history: ChatMessage[] = messages
        .filter(
          (m: unknown): m is ChatMessage =>
            !!m &&
            typeof m === "object" &&
            (("role" in m && (m.role === "user" || m.role === "assistant"))) &&
            "content" in m &&
            typeof (m as ChatMessage).content === "string"
        )
        .slice(-MAX_HISTORY);

      // If the Claude call fails (bad/expired key, rate limit, network blip),
      // don't fail the whole request — degrade to the friendly fallback below.
      // The help widget should always answer something useful.
      try {
        const reply = await askClaude(history);
        return NextResponse.json({ reply, source: "ai" });
      } catch (aiError) {
        console.error("Claude call failed, using fallback:", aiError);
      }
    }

    // --- Step 3: no rule, and Claude is off or just failed — graceful fallback. ---
    return NextResponse.json({
      reply:
        "I’m not sure about that one yet. For anything I can’t answer, please use the Contact page and we’ll help you out!",
      source: "fallback",
    });
  } catch (error) {
    console.error("Chat error:", error);
    return apiError(getErrorMessage(error, "The assistant is unavailable right now"), 500);
  }
}
