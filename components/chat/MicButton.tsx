"use client";

import { useRef, useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function MicButton({
  onTranscript,
  disabled,
}: {
  onTranscript: (transcript: string, languageCode: string) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    if (disabled || busy) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setBusy(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          const res = await fetch("/api/stt", { method: "POST", body: form });
          const data = await res.json();
          if (data.transcript) onTranscript(data.transcript, data.language_code || "en-IN");
        } finally {
          setBusy(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || busy}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={() => recording && stopRecording()}
          onTouchStart={(e: React.TouchEvent) => {
            e.preventDefault();
            startRecording();
          }}
          onTouchEnd={(e: React.TouchEvent) => {
            e.preventDefault();
            stopRecording();
          }}
          className={cn(
            "h-9 w-9 rounded-full text-ink-soft hover:bg-sidebar hover:text-ink",
            recording && "pulse-rec bg-brand text-white hover:bg-brand hover:text-white"
          )}
          aria-label="Hold to speak"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Hold to speak</TooltipContent>
    </Tooltip>
  );
}
