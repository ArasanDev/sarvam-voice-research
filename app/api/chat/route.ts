import { NextRequest } from "next/server";
import { getOrCreateConversation, runOrchestratorTurn } from "@/lib/orchestrator";
import { encodeSseEvent, type AppEvent } from "@/lib/events";
import type { ChatMessage } from "@/lib/sarvam";

export const runtime = "nodejs";

interface ChatRequestBody {
  conversationId: string | null;
  languageCode: string; // "en-IN" | "ta-IN"
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userText: string;
  wantsAudio?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;

    // Validate required fields
    if (!body.userText || typeof body.userText !== "string") {
      return new Response(JSON.stringify({ error: "userText is required and must be a string" }), {
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

    if (!body.history || !Array.isArray(body.history)) {
      return new Response(JSON.stringify({ error: "history must be an array" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate language code
    const validLanguages = ["en-IN", "ta-IN", "hi-IN", "kn-IN", "te-IN", "ml-IN", "mr-IN", "bn-IN", "gu-IN"];
    const languageCode = validLanguages.includes(body.languageCode) ? body.languageCode : "en-IN";

    const conversationId = getOrCreateConversation(body.conversationId, languageCode);

  const history: ChatMessage[] = body.history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: AppEvent) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event)));
      };

      // Let the client know which conversation this turn belongs to.
      controller.enqueue(
        encoder.encode(
          `event: conversation\ndata: ${JSON.stringify({ conversationId })}\n\n`
        )
      );

      try {
        await runOrchestratorTurn({
          conversationId,
          languageCode,
          history,
          userText: body.userText,
          wantsAudio: !!body.wantsAudio,
          emit,
        });
      } catch (err: any) {
        emit({ type: "error", message: err?.message || "Unexpected error", ts: Date.now() });
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
  } catch (err: any) {
    if (err instanceof SyntaxError) {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
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
