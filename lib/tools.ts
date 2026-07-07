import type { ToolSpec } from "./sarvam";
import {
  translate,
  detectLanguage,
  ttsSpeak,
  sttTranscribe,
} from "./sarvam";

export const TOOL_SPECS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "translate_text",
      description:
        "Translate text between languages. Supports all Indian languages: English (en-IN), Tamil (ta-IN), Hindi (hi-IN), Kannada (kn-IN), Telugu (te-IN), Malayalam (ml-IN), Marathi (mr-IN), Bengali (bn-IN), and Gujarati (gu-IN).",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to translate" },
          source_language: {
            type: "string",
            description:
              "Source language code (e.g. en-IN, ta-IN, hi-IN). Use 'unknown' to auto-detect.",
          },
          target_language: {
            type: "string",
            description:
              "Target language code (e.g. ta-IN, en-IN, hi-IN). Use formal register for professional output.",
          },
        },
        required: ["text", "target_language"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detect_language",
      description:
        "Detect the language of a given text. Returns the language code (en-IN, ta-IN, hi-IN, etc.).",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to detect language of" },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_text",
      description:
        "Analyze text for sentiment, key entities (names, places, organizations), and generate a summary. Returns sentiment (positive/negative/neutral), extracted entities, and key points.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to analyze" },
          language_code: {
            type: "string",
            description: "Language of the text (e.g. en-IN, ta-IN, hi-IN)",
          },
        },
        required: ["text", "language_code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transliterate_text",
      description:
        "Convert text between different scripts. E.g., Tamil script ↔ English romanized, Hindi Devanagari ↔ romanized.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Text to transliterate" },
          source_script: {
            type: "string",
            description:
              "Source script (e.g. ta-IN for Tamil, hi-IN for Hindi, or romanized)",
          },
          target_script: {
            type: "string",
            description: "Target script to convert to (e.g. romanized, ta-IN, hi-IN)",
          },
        },
        required: ["text", "source_script", "target_script"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "extract_text_from_image",
      description:
        "Extract text from an image (OCR). Supports images with text in any script: English, Tamil, Hindi, Kannada, Telugu, Malayalam, and more. Returns extracted text and detected language.",
      parameters: {
        type: "object",
        properties: {
          image_base64: {
            type: "string",
            description: "Image as base64-encoded string (PNG, JPG, WEBP supported)",
          },
          language_hint: {
            type: "string",
            description:
              "Optional hint for expected language (e.g. ta-IN, hi-IN) to improve accuracy",
          },
        },
        required: ["image_base64"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "synthesize_speech",
      description:
        "Convert text to speech in any Indian language. Supports Tamil, Hindi, English, Kannada, Telugu, Malayalam, Marathi, Bengali, Gujarati with multiple speakers and accents.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Text to speak (will be auto-chunked for length)",
          },
          language_code: {
            type: "string",
            description:
              "Target language (ta-IN for Tamil, hi-IN for Hindi, en-IN for English, etc.)",
          },
          speaker: {
            type: "string",
            description:
              "Speaker name (e.g. 'vijay' for Tamil male, 'priya' for female). Defaults to 'vijay'.",
          },
        },
        required: ["text", "language_code"],
      },
    },
  },
];

interface ToolContext {
  conversationId: string;
}

export async function executeTool(
  name: string,
  args: any,
  ctx: ToolContext
): Promise<unknown> {
  try {
    switch (name) {
      case "translate_text": {
        const text = String(args.text || "");
        const source = args.source_language || "unknown";
        const target = String(args.target_language || "en-IN");
        if (!text) return { error: "text cannot be empty" };
        const translated = await translate(text, source, target);
        return { original_text: text, translated_text: translated, target_language: target };
      }

      case "detect_language": {
        const text = String(args.text || "");
        if (!text) return { error: "text cannot be empty" };
        const langCode = await detectLanguage(text);
        return { text, detected_language_code: langCode };
      }

      case "analyze_text": {
        const text = String(args.text || "");
        const langCode = String(args.language_code || "en-IN");
        if (!text) return { error: "text cannot be empty" };
        // Placeholder: Sarvam text-analytics API would return sentiment, entities, summary
        // For now, return a structured response that the agent can narrate
        return {
          text_preview: text.slice(0, 100) + (text.length > 100 ? "..." : ""),
          language: langCode,
          note: "Text analysis tool is ready; implement Sarvam text-analytics API call",
        };
      }

      case "transliterate_text": {
        const text = String(args.text || "");
        const sourceScript = String(args.source_script || "ta-IN");
        const targetScript = String(args.target_script || "romanized");
        if (!text) return { error: "text cannot be empty" };
        // Placeholder: Sarvam transliterate API
        return {
          original_text: text,
          source_script: sourceScript,
          target_script: targetScript,
          note: "Transliteration tool is ready; implement Sarvam transliterate API call",
        };
      }

      case "extract_text_from_image": {
        const base64 = String(args.image_base64 || "");
        const langHint = args.language_hint || "unknown";
        if (!base64) return { error: "image_base64 cannot be empty" };
        // Placeholder: Sarvam vision-extract API
        return {
          image_preview: base64.slice(0, 50) + "...",
          language_hint: langHint,
          note: "OCR tool is ready; implement Sarvam vision-extract API call",
        };
      }

      case "synthesize_speech": {
        const text = String(args.text || "");
        const langCode = String(args.language_code || "en-IN");
        const speaker = args.speaker || "vijay";
        if (!text) return { error: "text cannot be empty" };
        const tts = await ttsSpeak(text, langCode, speaker);
        return {
          text_spoken: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
          language_code: langCode,
          speaker,
          audio_chunks: tts.audios.length,
          status: "success",
        };
      }

      default:
        return { error: `unknown tool: ${name}` };
    }
  } catch (err: any) {
    return { error: err?.message || "tool execution failed" };
  }
}
