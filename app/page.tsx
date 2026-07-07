"use client";

import { useRef, useState, useEffect } from "react";
import { useChat } from "@/lib/useChat";

export default function Home() {
  const { state, sendMessage, thinking } = useChat();
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  const startRecording = async () => {
    setError(null);
    try {
      console.log("🎤 Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log("✓ Microphone access granted");

      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setIsRecording(true);

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        console.log(`🎤 Recording stopped. Audio size: ${audioBlob.size} bytes`);

        if (audioBlob.size < 100) {
          console.warn("⚠️ Audio too small");
          setError("No audio detected. Please try again.");
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        try {
          console.log("📤 Sending audio to STT...");
          const res = await fetch("/api/stt", {
            method: "POST",
            body: audioBlob,
            headers: { "Content-Type": "audio/webm" },
          });

          console.log(`STT response status: ${res.status}`);

          if (!res.ok) {
            const errText = await res.text();
            console.error(`STT error: ${res.status}`, errText);
            setError(`Voice processing error (${res.status}). Please try again.`);
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          const result = await res.json();
          console.log("✓ STT result:", result);

          if (result.transcript?.trim()) {
            console.log("✓ Transcript:", result.transcript);
            setInput(result.transcript);
          } else {
            console.warn("⚠️ Empty transcript");
            setError("Could not understand audio. Please try again.");
          }
        } catch (err) {
          console.error("❌ Voice processing error:", err);
          setError("Voice processing failed. Please try again.");
        } finally {
          stream.getTracks().forEach((t) => t.stop());
        }
      };

      console.log("🎙️ Starting recording...");
      mediaRecorder.start();
    } catch (err: any) {
      console.error("❌ Microphone error:", err);
      if (err.name === "NotAllowedError") {
        setError("Microphone access denied. Please allow in browser settings.");
      } else if (err.name === "NotFoundError") {
        setError("No microphone found. Please check your device.");
      } else {
        setError(`Microphone error: ${err.message}`);
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const handleSend = () => {
    if (!input.trim()) {
      setError("Type a message or record audio.");
      return;
    }
    setError(null);
    sendMessage(input, "en-IN", true);
    setInput("");
  };

  return (
    <div className="flex h-screen w-full flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-green-500/20 px-6 py-4">
        <h1 className="font-mono text-sm tracking-widest text-green-400">
          SARVAM VOICE RESEARCH ASSISTANT
        </h1>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          <div className="space-y-4">
            {state.messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded p-3 font-mono text-sm ${
                  msg.role === "user"
                    ? "border border-blue-500/30 bg-blue-500/10 text-blue-300 ml-auto max-w-[70%]"
                    : "border border-green-500/30 bg-green-500/10 text-green-300 mr-auto max-w-[70%]"
                }`}
              >
                {msg.text}
              </div>
            ))}

            {thinking && (
              <div className="rounded border border-yellow-500/30 bg-yellow-500/10 p-3 font-mono text-sm text-yellow-300">
                💭 {thinking}
              </div>
            )}

            {state.trace.map((event) => (
              <div
                key={event.id}
                className="rounded border border-purple-500/30 bg-purple-500/10 p-2 font-mono text-xs text-purple-300"
              >
                {event.type === "tool_call" && `🔧 ${event.tool}`}
                {event.type === "tool_result" && `✓ ${event.tool} result`}
              </div>
            ))}

            {state.error && (
              <div className="rounded border border-red-500/30 bg-red-500/10 p-3 font-mono text-sm text-red-300">
                ⚠️ {state.error}
              </div>
            )}

            {error && (
              <div className="rounded border border-red-500/30 bg-red-500/10 p-3 font-mono text-sm text-red-300">
                ⚠️ {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-green-500/20 p-6">
        <div className="flex gap-3">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isRecording}
            className={`rounded px-4 py-2 font-mono text-sm font-bold ${
              isRecording
                ? "bg-red-500/30 text-red-300"
                : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
            }`}
          >
            {isRecording ? "🔴 RECORDING" : "🎤 RECORD"}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type or record..."
            className="flex-1 rounded border border-green-500/20 bg-slate-900/50 p-2 font-mono text-sm text-green-300 placeholder-green-500/30 outline-none focus:border-green-500/50"
          />
          <button
            onClick={handleSend}
            className="rounded bg-green-500 px-4 py-2 font-mono text-sm font-bold text-slate-950 hover:bg-green-400"
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
}
