"use client";

import { useRef, useState } from "react";
import { useChat } from "@/lib/useChat";

export default function Home() {
  const { state, sendMessage, thinking } = useChat();
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
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

        if (audioBlob.size < 100) {
          setError("No audio detected.");
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        try {
          const res = await fetch("/api/stt", {
            method: "POST",
            body: audioBlob,
            headers: { "Content-Type": "audio/webm" },
          });

          const result = await res.json();
          if (result.transcript?.trim()) {
            setInput(result.transcript);
          } else {
            setError("Could not understand audio.");
          }
        } catch (err) {
          setError("Voice processing failed.");
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
    } catch (err: any) {
      setError(err.name === "NotAllowedError" ? "Microphone access denied." : "Microphone error.");
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

  const isActive = state.messages.length > 0;

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
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
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
