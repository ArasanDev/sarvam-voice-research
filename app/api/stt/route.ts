import { NextRequest, NextResponse } from "next/server";
import { sttTranscribe } from "@/lib/sarvam";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const buffer = await req.arrayBuffer();
    const blob = new Blob([buffer], { type: "audio/webm" });

    if (!buffer || buffer.byteLength === 0) {
      return NextResponse.json({ error: "No audio data received" }, { status: 400 });
    }

    const result = await sttTranscribe(blob, "recording.webm");
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("STT Error:", err);
    return NextResponse.json(
      { error: err?.message || "Speech-to-text processing failed" },
      { status: 502 }
    );
  }
}
