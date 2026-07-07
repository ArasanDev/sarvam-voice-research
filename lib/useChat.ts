"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

export interface ChatMessageUI {
  id: string;
  role: "user" | "assistant";
  text: string;
  languageCode?: string;
  ts: number;
  turn: number;
}

export interface TraceEntry {
  id: string;
  type: "tool_call" | "tool_result";
  tool: string;
  args: unknown;
  result?: unknown;
  durationMs?: number;
  status: "pending" | "done";
  turn: number;
  ts: number;
}

interface State {
  conversationId: string | null;
  turn: number;
  messages: ChatMessageUI[];
  trace: TraceEntry[];
  languageCode: string;
  error: string | null;
}

type Action =
  | { type: "user_message"; text: string; languageCode: string }
  | { type: "conversation"; conversationId: string }
  | { type: "tool_call"; id: string; tool: string; args: unknown; ts: number }
  | { type: "tool_result"; id: string; result: unknown; duration_ms: number }
  | { type: "message"; text: string; language_code: string; ts: number }
  | { type: "thinking"; text: string }
  | { type: "error"; message: string }
  | { type: "done" }
  | { type: "reset_error" };

const initialState: State = {
  conversationId: null,
  turn: 0,
  messages: [],
  trace: [],
  languageCode: "en-IN",
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "user_message": {
      const turn = state.turn + 1;
      return {
        ...state,
        turn,
        languageCode: action.languageCode,
        error: null,
        messages: [
          ...state.messages,
          {
            id: `u-${turn}-${Date.now()}`,
            role: "user",
            text: action.text,
            languageCode: action.languageCode,
            ts: Date.now(),
            turn,
          },
        ],
      };
    }
    case "conversation":
      return { ...state, conversationId: action.conversationId };
    case "tool_call":
      return {
        ...state,
        trace: [
          ...state.trace,
          {
            id: action.id,
            type: "tool_call",
            tool: action.tool,
            args: action.args,
            status: "pending",
            turn: state.turn,
            ts: action.ts,
          },
        ],
      };
    case "tool_result": {
      return {
        ...state,
        trace: state.trace.map((t) =>
          t.id === action.id
            ? { ...t, type: "tool_result", result: action.result, durationMs: action.duration_ms, status: "done" }
            : t
        ),
      };
    }
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
      return { ...state, error: action.message };
    case "done":
      return state;
    case "thinking":
      return state;
    case "reset_error":
      return { ...state, error: null };
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

export async function replayText(text: string, languageCode: string) {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, languageCode }),
  });
  const data = await res.json();
  if (data.audios) playAudioChunks(data.audios);
}

async function playAudioChunks(base64Chunks: string[]) {
  for (const b64 of base64Chunks) {
    await new Promise<void>((resolve) => {
      const audio = new Audio(`data:audio/wav;base64,${b64}`);
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
  }
}

const STORAGE_KEY = "sarvam-chat-history";
const CONVERSATION_ID_KEY = "sarvam-conversation-id";
const LANGUAGE_CODE_KEY = "sarvam-language-code";

export function useChat() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [thinking, setThinking] = useState("");
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  // Load conversation history on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    const savedConversationId = localStorage.getItem(CONVERSATION_ID_KEY);
    const savedLanguageCode = localStorage.getItem(LANGUAGE_CODE_KEY);

    if (savedMessages && savedConversationId) {
      try {
        const messages = JSON.parse(savedMessages);
        if (Array.isArray(messages) && messages.length > 0) {
          // Load messages into state
          messages.forEach((msg: any) => {
            if (msg.role && msg.text) {
              dispatch({
                type: "message",
                text: msg.text,
                language_code: msg.languageCode || "en-IN",
                ts: msg.ts || Date.now(),
              });
              historyRef.current.push({ role: msg.role, content: msg.text });
            }
          });

          // Restore conversation IDs from state
          dispatch({ type: "conversation", conversationId: savedConversationId });
          setShowResumePrompt(false);
        }
      } catch (e) {
        console.error("Failed to load conversation history:", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string, languageCode = "en-IN", wantsAudio = true) => {
      if (!text.trim()) return;
      dispatch({ type: "user_message", text, languageCode });
      historyRef.current.push({ role: "user", content: text });
      setThinking("");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: state.conversationId,
          languageCode,
          history: historyRef.current.slice(0, -1),
          userText: text,
          wantsAudio,
        }),
      });

      if (!res.ok || !res.body) {
        dispatch({ type: "error", message: "Could not connect to the assistant. Please try again." });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentConversationId = state.conversationId;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const evs = parseSseChunk(part + "\n\n");
          for (const { event, data } of evs) {
            try {
              const payload = JSON.parse(data);
              switch (event) {
                case "conversation":
                  currentConversationId = payload.conversationId;
                  dispatch({ type: "conversation", conversationId: payload.conversationId });
                  localStorage.setItem(CONVERSATION_ID_KEY, payload.conversationId);
                  break;
                case "thinking":
                  setThinking(payload.text);
                  break;
                case "tool_call":
                  dispatch({ type: "tool_call", id: payload.id, tool: payload.tool, args: payload.args, ts: payload.ts });
                  break;
                case "tool_result":
                  dispatch({
                    type: "tool_result",
                    id: payload.id,
                    result: payload.result,
                    duration_ms: payload.duration_ms,
                  });
                  break;
                case "message": {
                  dispatch({ type: "message", text: payload.text, language_code: payload.language_code, ts: payload.ts });
                  historyRef.current.push({ role: "assistant", content: payload.text });
                  // Save to localStorage
                  const messageToStore = {
                    role: "assistant",
                    text: payload.text,
                    languageCode: payload.language_code,
                    ts: payload.ts,
                  };
                  const currentHistory = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
                  currentHistory.push(messageToStore);
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentHistory));
                  localStorage.setItem(LANGUAGE_CODE_KEY, payload.language_code);
                  break;
                }
                case "audio":
                  playAudioChunks(payload.audios);
                  break;
                case "error":
                  dispatch({ type: "error", message: payload.message });
                  break;
                case "done":
                  dispatch({ type: "done" });
                  break;
              }
            } catch (e) {
              console.error("Failed to parse SSE event:", e);
            }
          }
        }
      }

      // Save user message to localStorage
      const userMessageToStore = {
        role: "user",
        text,
        languageCode,
        ts: Date.now(),
      };
      const currentHistory = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      currentHistory.unshift(userMessageToStore);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentHistory));
    },
    [state.conversationId]
  );

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CONVERSATION_ID_KEY);
    localStorage.removeItem(LANGUAGE_CODE_KEY);
    historyRef.current = [];
  };

  return { state, sendMessage, thinking, clearHistory };
}
