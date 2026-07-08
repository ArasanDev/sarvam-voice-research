import { randomUUID } from "node:crypto";
import { chatComplete, ttsSpeak, type ChatMessage, type ToolSpec } from "./sarvam";
import { discoverCapabilities, executeMcpTool, getToolSpecs } from "./mcp/registry";
import type { AppEvent, AgentPhase } from "./events";

const MAX_TOOL_ITERATIONS = 6;

function conduitPrompt(languageCode: string, toolNames: string[]): string {
  const languageName =
    languageCode === "ta-IN" ? "Tamil" : languageCode === "hi-IN" ? "Hindi" : "English";

  return `You are Conduit — a voice-native AI agent powered by MCP (Model Context Protocol) servers.
Your capabilities come from live MCP tools: ${toolNames.join(", ") || "none yet"}.

You help users research, translate, analyze, and understand content across Indian languages.
Before each tool call, briefly explain what you're doing in one short sentence — the user hears this aloud.
Reply in ${languageName} (${languageCode}). Keep final replies to 2-4 spoken sentences.
Never invent facts — ground answers in tool results.
Plain conversational text only — no markdown, bullets, or headings (replies are spoken aloud).`;
}

interface AgentLoopParams {
  systemPrompt: string;
  toolSpecs: ToolSpec[];
  executeToolFn: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  languageCode: string;
  history: ChatMessage[];
  userText: string;
  wantsAudio?: boolean;
  emit: (event: AppEvent) => void;
}

function emitPhase(emit: (event: AppEvent) => void, phase: AgentPhase, label?: string) {
  emit({ type: "agent_state", phase, label, ts: Date.now() });
}

async function runAgentLoop(params: AgentLoopParams): Promise<void> {
  const { languageCode, emit } = params;

  const messages: ChatMessage[] = [
    { role: "system", content: params.systemPrompt },
    ...params.history,
    { role: "user", content: params.userText },
  ];

  try {
    emitPhase(emit, "thinking", "Processing your request");

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const result = await chatComplete(messages, { tools: params.toolSpecs });

      if (result.tool_calls && result.tool_calls.length > 0) {
        messages.push({ role: "assistant", content: result.content, tool_calls: result.tool_calls });

        if (result.content) {
          emit({ type: "thinking", text: result.content, ts: Date.now() });
        }

        emitPhase(emit, "acting", "Using MCP tools");

        for (const call of result.tool_calls) {
          const args = safeParseArgs(call.function.arguments) as Record<string, unknown>;
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

      const replyText =
        stripMarkdown((result.content || "").trim()) ||
        "I'm not sure how to help with that. Could you rephrase?";

      emit({ type: "message", text: replyText, language_code: languageCode, ts: Date.now() });

      if (params.wantsAudio) {
        emitPhase(emit, "speaking", "Speaking response");
        try {
          const tts = await ttsSpeak(replyText, languageCode);
          emit({ type: "audio", audios: tts.audios, ts: Date.now() });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "unknown";
          emit({ type: "error", message: `Voice reply failed: ${msg}`, ts: Date.now() });
        }
      }

      emitPhase(emit, "idle");
      emit({ type: "done", ts: Date.now() });
      return;
    }

    emit({
      type: "error",
      message: "The assistant took too many steps to respond. Please try again.",
      ts: Date.now(),
    });
    emitPhase(emit, "idle");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Something went wrong.";
    emit({ type: "error", message: msg, ts: Date.now() });
    emitPhase(emit, "idle");
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
  const { specs, source } = await getToolSpecs();
  const { tools } = await discoverCapabilities();

  params.emit({
    type: "capabilities",
    tools: tools.map((t) => ({ name: t.name, description: t.description, server: t.server })),
    source,
    ts: Date.now(),
  });

  const toolNames = specs.map((s) => s.function.name);

  return runAgentLoop({
    systemPrompt: conduitPrompt(params.languageCode, toolNames),
    toolSpecs: specs,
    executeToolFn: (name, args) => executeMcpTool(name, args),
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

export { getOrCreateConversation } from "./conversations";
