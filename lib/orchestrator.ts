import { randomUUID } from "node:crypto";
import { chatComplete, translate, ttsSpeak, type ChatMessage, type ToolSpec } from "./sarvam";
import { TOOL_SPECS, executeTool } from "./tools";
import type { AppEvent } from "./events";

const MAX_TOOL_ITERATIONS = 6;

function researchAssistantPrompt(languageCode: string): string {
  const languageName = languageCode === "ta-IN" ? "Tamil" : "English";
  return `You are a multilingual research assistant powered by Sarvam AI. Your role is to help users find information, analyze text, and understand content across languages.

You have access to powerful Sarvam tools for multilingual processing:
- Translate between languages
- Detect language of text
- Analyze text for sentiment and entities
- Transliterate between scripts (Tamil ↔ English, etc.)
- Extract text from images (OCR)
- Synthesize speech in any Indian language

Before using each tool, briefly narrate what you're thinking and why you need that tool. For example: "I'm detecting the language first to understand the input better" or "I'll translate this to English to provide a comprehensive answer."

Reply in ${languageName} (${languageCode}). Keep replies short (2-4 sentences) — they may be spoken aloud.
Never invent information — always use tool results to support your answers.
Reply in plain conversational sentences only — no markdown, no asterisks, no bullet points, no headings, since replies may be read aloud verbatim.`;
}

interface AgentLoopParams {
  systemPrompt: string;
  toolSpecs: ToolSpec[];
  executeToolFn: (name: string, args: any) => Promise<unknown>;
  languageCode: string;
  history: ChatMessage[];
  userText: string;
  wantsAudio?: boolean;
  emit: (event: AppEvent) => void;
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

        if (result.content) {
          emit({ type: "thinking", text: result.content, ts: Date.now() });
        }

        for (const call of result.tool_calls) {
          const args = safeParseArgs(call.function.arguments);
          const eventId = call.id || randomUUID();
          emit({ type: "tool_call", id: eventId, tool: call.function.name, args, ts: Date.now() });

          const start = Date.now();
          const toolResult = await params.executeToolFn(call.function.name, args);
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

      const replyText = stripMarkdown((result.content || "").trim()) || "I'm not sure how to help with that. Could you rephrase?";
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
  conversationId: string;
  languageCode: string;
  history: ChatMessage[];
  userText: string;
  wantsAudio?: boolean;
  emit: (event: AppEvent) => void;
}

export async function runOrchestratorTurn(params: OrchestratorParams): Promise<void> {
  const { conversationId } = params;
  return runAgentLoop({
    systemPrompt: researchAssistantPrompt(params.languageCode),
    toolSpecs: TOOL_SPECS,
    executeToolFn: (name, args) => executeTool(name, args, { conversationId }),
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

export function getOrCreateConversation(conversationId: string | null, languageCode: string): string {
  // Simplified: just generate a new ID each time or use provided one
  if (conversationId) return conversationId;
  return randomUUID();
}

export { translate };
