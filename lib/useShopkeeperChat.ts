"use client";

import { useCallback, useReducer, useRef } from "react";
import type { ChatMessageUI, TraceEntry } from "./useBazaarChat";

interface State {
  turn: number;
  messages: ChatMessageUI[];
  trace: TraceEntry[];
  thinking: boolean;
  error: string | null;
}

type Action =
  | { type: "user_message"; text: string; languageCode: string }
  | { type: "tool_call"; id: string; tool: string; args: unknown; ts: number }
  | { type: "tool_result"; id: string; result: unknown; duration_ms: number }
  | { type: "message"; text: string; language_code: string; ts: number }
  | { type: "error"; message: string }
  | { type: "done" };

const initialState: State = { turn: 0, messages: [], trace: [], thinking: false, error: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "user_message": {
      const turn = state.turn + 1;
      return {
        ...state,
        turn,
        thinking: true,
        error: null,
        messages: [
          ...state.messages,
          {
            id: `u-${turn}-${Date.now()}`,
            role: "customer",
            text: action.text,
            languageCode: action.languageCode,
            ts: Date.now(),
            turn,
          },
        ],
      };
    }
    case "tool_call":
      return {
        ...state,
        trace: [
          ...state.trace,
          { id: action.id, tool: action.tool, args: action.args, status: "pending", turn: state.turn, ts: action.ts },
        ],
      };
    case "tool_result":
      return {
        ...state,
        trace: state.trace.map((t) =>
          t.id === action.id ? { ...t, result: action.result, durationMs: action.duration_ms, status: "done" } : t
        ),
      };
    case "message":
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: `a-${state.turn}-${Date.now()}`,
            role: "assistant",
            text: action.text,
            languageCode: action.language_code,
            ts: action.ts,
            turn: state.turn,
          },
        ],
      };
    case "error":
      return { ...state, error: action.message, thinking: false };
    case "done":
      return { ...state, thinking: false };
    default:
      return state;
  }
}

function parseSseChunk(chunk: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = chunk.split("\n\n").filter(Boolean);
  for (const block of blocks) {
    const lines = block.split("\n");
    let event = "message";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data = line.slice(5).trim();
    }
    if (data) events.push({ event, data });
  }
  return events;
}

export function useShopkeeperChat() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const sendMessage = useCallback(async (text: string, languageCode: string, wantsAudio: boolean) => {
    if (!text.trim()) return;
    dispatch({ type: "user_message", text, languageCode });
    historyRef.current.push({ role: "user", content: text });

    const res = await fetch("/api/shopkeeper/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        languageCode,
        history: historyRef.current.slice(0, -1),
        userText: text,
        wantsAudio,
      }),
    });

    if (!res.ok || !res.body) {
      dispatch({ type: "error", message: "Could not reach Bazaar. Please try again." });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        for (const { event, data } of parseSseChunk(part + "\n\n")) {
          const payload = JSON.parse(data);
          switch (event) {
            case "tool_call":
              dispatch({ type: "tool_call", id: payload.id, tool: payload.tool, args: payload.args, ts: payload.ts });
              break;
            case "tool_result":
              dispatch({ type: "tool_result", id: payload.id, result: payload.result, duration_ms: payload.duration_ms });
              break;
            case "message":
              dispatch({ type: "message", text: payload.text, language_code: payload.language_code, ts: payload.ts });
              historyRef.current.push({ role: "assistant", content: payload.text });
              break;
            case "error":
              dispatch({ type: "error", message: payload.message });
              break;
            case "done":
              dispatch({ type: "done" });
              break;
          }
        }
      }
    }
  }, []);

  return { state, sendMessage };
}
