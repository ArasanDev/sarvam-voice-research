const API_BASE = "https://api.sarvam.ai";

function apiKey(): string {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error("SARVAM_API_KEY is not set");
  return key;
}

function headers(extra?: Record<string, string>) {
  return {
    "api-subscription-key": apiKey(),
    ...extra,
  };
}

export type SupportedLanguage = "en-IN" | "ta-IN" | "unknown";

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatCompletionResult {
  content: string | null;
  tool_calls?: ToolCall[];
}

export async function chatComplete(
  messages: ChatMessage[],
  opts: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    tools?: ToolSpec[];
  } = {}
): Promise<ChatCompletionResult> {
  const res = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      model: opts.model || process.env.SARVAM_CHAT_MODEL || "sarvam-30b",
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.max_tokens ?? 900,
      ...(opts.tools ? { tools: opts.tools, tool_choice: "auto" } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`sarvam chat completions failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const message = data.choices[0].message;
  return { content: message.content ?? null, tool_calls: message.tool_calls };
}

export interface SttResult {
  transcript: string;
  language_code: string;
}

export async function sttTranscribe(audio: Blob, filename = "audio.webm"): Promise<SttResult> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", "saaras:v3");
  form.append("mode", "transcribe");
  form.append("language_code", "unknown");
  const res = await fetch(`${API_BASE}/speech-to-text`, {
    method: "POST",
    headers: headers(),
    body: form,
  });
  if (!res.ok) {
    throw new Error(`sarvam stt failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return {
    transcript: data.transcript as string,
    language_code: (data.language_code as string) || "en-IN",
  };
}

export async function detectLanguage(text: string): Promise<string> {
  const res = await fetch(`${API_BASE}/text-lid`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ input: text }),
  });
  if (!res.ok) {
    throw new Error(`sarvam text-lid failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return (data.language_code as string) || "en-IN";
}

export async function translate(
  text: string,
  sourceLanguageCode: string,
  targetLanguageCode: string
): Promise<string> {
  if (sourceLanguageCode === targetLanguageCode) return text;
  const res = await fetch(`${API_BASE}/translate`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      input: text,
      source_language_code: sourceLanguageCode,
      target_language_code: targetLanguageCode,
      model: "mayura:v1",
      mode: "formal",
    }),
  });
  if (!res.ok) {
    throw new Error(`sarvam translate failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.translated_text as string;
}

const TTS_CHUNK_LIMIT = 480;

export function chunkForTts(text: string): string[] {
  if (text.length <= TTS_CHUNK_LIMIT) return [text];
  const sentences = text.split(/(?<=[.!?।])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + " " + s).trim().length > TTS_CHUNK_LIMIT) {
      if (current) chunks.push(current.trim());
      current = s;
    } else {
      current = (current + " " + s).trim();
    }
  }
  if (current) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, TTS_CHUNK_LIMIT)];
}

export interface TtsResult {
  audios: string[]; // base64 wav, one per input chunk
}

export async function ttsSpeak(
  text: string,
  targetLanguageCode: string,
  speaker = process.env.SARVAM_TTS_SPEAKER || "priya"
): Promise<TtsResult> {
  const inputs = chunkForTts(text);
  const res = await fetch(`${API_BASE}/text-to-speech`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      inputs,
      target_language_code: targetLanguageCode,
      speaker,
      model: "bulbul:v3",
      speech_sample_rate: 22050,
    }),
  });
  if (!res.ok) {
    throw new Error(`sarvam tts failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return { audios: data.audios as string[] };
}

export async function createPronunciationDictionary(
  entries: Record<string, string>,
  languageCode = "ta-IN"
): Promise<string> {
  const res = await fetch(`${API_BASE}/text-to-speech/pronunciation-dictionary`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ entries, language_code: languageCode }),
  });
  if (!res.ok) {
    throw new Error(`sarvam pronunciation dict failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.dictionary_id as string;
}
