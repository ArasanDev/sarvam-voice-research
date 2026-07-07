import { NextRequest, NextResponse } from "next/server";
import { ttsSpeak } from "@/lib/sarvam";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const text = String(body.text || "");
  const languageCode = body.languageCode === "ta-IN" ? "ta-IN" : "en-IN";
  if (!text.trim()) {
    return NextResponse.json({ error: "missing text" }, { status: 400 });
  }
  try {
    const result = await ttsSpeak(text, languageCode);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "tts failed" }, { status: 502 });
  }
}
