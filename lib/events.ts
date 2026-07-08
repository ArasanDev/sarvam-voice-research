export type AgentPhase = "idle" | "listening" | "transcribing" | "thinking" | "acting" | "speaking";

export type AppEvent =
  | { type: "agent_state"; phase: AgentPhase; label?: string; ts: number }
  | { type: "capabilities"; tools: Array<{ name: string; description: string; server: string }>; source: "mcp" | "local"; ts: number }
  | { type: "thinking"; text: string; ts: number }
  | { type: "tool_call"; id: string; tool: string; args: unknown; ts: number }
  | {
      type: "tool_result";
      id: string;
      tool: string;
      result: unknown;
      duration_ms: number;
      ts: number;
    }
  | { type: "message"; text: string; language_code: string; ts: number }
  | { type: "audio"; audios: string[]; ts: number }
  | { type: "done"; ts: number }
  | { type: "error"; message: string; ts: number };

export function encodeSseEvent(event: AppEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
