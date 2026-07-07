import { randomUUID } from "node:crypto";
import { db } from "./db";
import { chatComplete, translate, ttsSpeak, type ChatMessage, type ToolSpec } from "./sarvam";
import { TOOL_SPECS, executeTool, SHOPKEEPER_TOOL_SPECS, executeShopkeeperTool } from "./tools";
import type { BazaarEvent } from "./events";

const MAX_TOOL_ITERATIONS = 6;

function customerSystemPrompt(shopName: string, languageCode: string): string {
  const languageName = languageCode === "ta-IN" ? "Tamil" : "English";
  return `You are Bazaar, a friendly voice/text shopping assistant for "${shopName}", a small Indian general store.
Reply to the customer in ${languageName} (${languageCode}). Keep replies short (1-3 sentences) — they may be spoken aloud.
Use the provided tools to search the catalog, manage the cart, and place orders. Never invent products, prices, or order ids — always use tool results.
When a search returns no results, say so plainly. When placing an order, confirm the total and order id from the tool result.
Do not mention that you are calling tools; just act on the results naturally.
Reply in plain conversational sentences only — no markdown, no asterisks, no bullet points, no headings, since replies may be read aloud verbatim.`;
}

function shopkeeperSystemPrompt(shopName: string, languageCode: string): string {
  const languageName = languageCode === "ta-IN" ? "Tamil" : "English";
  return `You are Bazaar, a voice/text copilot for the OWNER of "${shopName}", a small Indian general store — not a customer.
Reply in ${languageName} (${languageCode}). Keep replies short (1-3 sentences) — they may be spoken aloud.
Use the provided tools to check or update stock, summarize today's sales, and surface unmet customer demand. Never invent numbers — always use tool results.
When reporting unmet demand, name the specific searched terms and counts. When updating stock, confirm the new quantity.
Reply in plain conversational sentences only — no markdown, no asterisks, no bullet points, no headings, since replies may be read aloud verbatim.`;
}

interface AgentLoopParams {
  systemPrompt: string;
  toolSpecs: ToolSpec[];
  executeToolFn: (name: string, args: any) => unknown;
  languageCode: string;
  history: ChatMessage[];
  userText: string;
  wantsAudio?: boolean;
  emit: (event: BazaarEvent) => void;
}

async function runAgentLoop(params: AgentLoopParams): Promise<void> {
  const { languageCode, emit } = params;

  const messages: ChatMessage[] = [
    { role: "system", content: params.systemPrompt },
    ...params.history,
    { role: "user", content: params.userText },
  ];

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const result = await chatComplete(messages, { tools: params.toolSpecs });

      if (result.tool_calls && result.tool_calls.length > 0) {
        messages.push({ role: "assistant", content: result.content, tool_calls: result.tool_calls });

        for (const call of result.tool_calls) {
          const args = safeParseArgs(call.function.arguments);
          const eventId = call.id || randomUUID();
          emit({ type: "tool_call", id: eventId, tool: call.function.name, args, ts: Date.now() });

          const start = Date.now();
          const toolResult = params.executeToolFn(call.function.name, args);
          const durationMs = Date.now() - start;

          emit({
            type: "tool_result",
            id: eventId,
            tool: call.function.name,
            result: toolResult,
            duration_ms: durationMs,
            ts: Date.now(),
          });

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.function.name,
            content: JSON.stringify(toolResult),
          });
        }
        continue;
      }

      const replyText = stripMarkdown((result.content || "").trim()) || "Sorry, could you repeat that?";
      emit({ type: "message", text: replyText, language_code: languageCode, ts: Date.now() });

      if (params.wantsAudio) {
        try {
          const tts = await ttsSpeak(replyText, languageCode);
          emit({ type: "audio", audios: tts.audios, ts: Date.now() });
        } catch (err: any) {
          emit({ type: "error", message: `Voice reply failed: ${err?.message || "unknown"}`, ts: Date.now() });
        }
      }

      emit({ type: "done", ts: Date.now() });
      return;
    }

    emit({
      type: "error",
      message: "The assistant took too many steps to respond. Please try again.",
      ts: Date.now(),
    });
  } catch (err: any) {
    emit({ type: "error", message: err?.message || "Something went wrong.", ts: Date.now() });
  }
}

export interface OrchestratorParams {
  shopId: string;
  conversationId: string;
  shopName: string;
  languageCode: string;
  history: ChatMessage[]; // prior turns, excluding the new user message
  userText: string;
  wantsAudio?: boolean;
  emit: (event: BazaarEvent) => void;
}

export async function runOrchestratorTurn(params: OrchestratorParams): Promise<void> {
  const { shopId, conversationId } = params;
  return runAgentLoop({
    systemPrompt: customerSystemPrompt(params.shopName, params.languageCode),
    toolSpecs: TOOL_SPECS,
    executeToolFn: (name, args) => executeTool(name, args, { shopId, conversationId }),
    languageCode: params.languageCode,
    history: params.history,
    userText: params.userText,
    wantsAudio: params.wantsAudio,
    emit: params.emit,
  });
}

export interface ShopkeeperOrchestratorParams {
  shopId: string;
  shopName: string;
  languageCode: string;
  history: ChatMessage[];
  userText: string;
  wantsAudio?: boolean;
  emit: (event: BazaarEvent) => void;
}

export async function runShopkeeperTurn(params: ShopkeeperOrchestratorParams): Promise<void> {
  const { shopId } = params;
  return runAgentLoop({
    systemPrompt: shopkeeperSystemPrompt(params.shopName, params.languageCode),
    toolSpecs: SHOPKEEPER_TOOL_SPECS,
    executeToolFn: (name, args) => executeShopkeeperTool(name, args, { shopId }),
    languageCode: params.languageCode,
    history: params.history,
    userText: params.userText,
    wantsAudio: params.wantsAudio,
    emit: params.emit,
  });
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^[-•]\s*/gm, "")
    .trim();
}

function safeParseArgs(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getOrCreateConversation(shopId: string, conversationId: string | null, languageCode: string): string {
  if (conversationId) {
    const existing = db.prepare(`SELECT id FROM conversation WHERE id = ?`).get(conversationId);
    if (existing) return conversationId;
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO conversation (id, shop_id, customer_language_code, created_at) VALUES (?, ?, ?, ?)`
  ).run(id, shopId, languageCode, Date.now());
  return id;
}

export { translate };
