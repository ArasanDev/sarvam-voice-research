import { NextRequest } from "next/server";
import {
  getOrCreateConversation,
  loadConversationHistory,
  saveMessage,
} from "@/lib/conversations";
import { runOrchestratorTurn } from "@/lib/orchestrator";
import { encodeSseEvent, type AppEvent } from "@/lib/events";
import type { ChatMessage } from "@/lib/sarvam";

export const runtime = "nodejs";

interface ChatRequestBody {
  conversationId: string | null;
  languageCode: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userText: string;
  wantsAudio?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;

    if (!body.userText || typeof body.userText !== "string") {
      return new Response(JSON.stringify({ error: "userText is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (body.userText.trim().length === 0) {
      return new Response(JSON.stringify({ error: "userText cannot be empty" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validLanguages = [
      "en-IN", "ta-IN", "hi-IN", "kn-IN", "te-IN", "ml-IN", "mr-IN", "bn-IN", "gu-IN",
    ];
    const languageCode = validLanguages.includes(body.languageCode) ? body.languageCode : "en-IN";

    const conversationId = getOrCreateConversation(body.conversationId, languageCode);

    saveMessage(conversationId, "user", body.userText.trim());

    const persistedHistory = loadConversationHistory(conversationId);
    const history: ChatMessage[] = (
      persistedHistory.length > 0 ? persistedHistory : body.history || []
    )
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.content }));

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        const emit = (event: AppEvent) => {
          controller.enqueue(encoder.encode(encodeSseEvent(event)));
        };

        controller.enqueue(
          encoder.encode(
            `event: conversation\ndata: ${JSON.stringify({ conversationId })}\n\n`
          )
        );

        let assistantReply = "";

        try {
          await runOrchestratorTurn({
            conversationId,
            languageCode,
            history,
            userText: body.userText,
            wantsAudio: !!body.wantsAudio,
            emit: (event) => {
              if (event.type === "message") assistantReply = event.text;
              emit(event);
            },
          });

          if (assistantReply) {
            saveMessage(conversationId, "assistant", assistantReply);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unexpected error";
          emit({ type: "error", message: msg, ts: Date.now() });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    if (err instanceof SyntaxError) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Unexpected error in /api/chat:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
