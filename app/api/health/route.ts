import { NextResponse } from "next/server";

export async function GET() {
  const checks = {
    sarvam_api_key: process.env.SARVAM_API_KEY ? "✓ Set" : "❌ Missing",
    sarvam_chat_model: process.env.SARVAM_CHAT_MODEL || "sarvam-30b",
    sarvam_tts_speaker: process.env.SARVAM_TTS_SPEAKER || "priya",
    node_env: process.env.NODE_ENV,
  };

  return NextResponse.json(checks);
}
