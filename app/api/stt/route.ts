import { NextRequest, NextResponse } from "next/server";
import { sttTranscribe } from "@/lib/sarvam";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "missing audio" }, { status: 400 });
  }
  try {
    const result = await sttTranscribe(file, "recording.webm");
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "stt failed" }, { status: 502 });
  }
}
