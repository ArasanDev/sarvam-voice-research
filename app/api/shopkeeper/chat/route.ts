import { NextRequest } from "next/server";
import { runShopkeeperTurn } from "@/lib/orchestrator";
import { encodeSseEvent, type BazaarEvent } from "@/lib/events";
import type { ChatMessage } from "@/lib/sarvam";

export const runtime = "nodejs";

const SHOP_ID = "shop-anand-general-store";
const SHOP_NAME = "Anand General Store";

interface ShopkeeperChatRequestBody {
  languageCode: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userText: string;
  wantsAudio?: boolean;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ShopkeeperChatRequestBody;
  const languageCode = body.languageCode === "ta-IN" ? "ta-IN" : "en-IN";

  const history: ChatMessage[] = body.history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: BazaarEvent) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event)));
      };

      try {
        await runShopkeeperTurn({
          shopId: SHOP_ID,
          shopName: SHOP_NAME,
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
}
