"use client";

import { useRef, useEffect, useState } from "react";
import { useBazaarChat } from "@/lib/useBazaarChat";

export default function Home() {
  const { state, sendMessage, thinking } = useBazaarChat();
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [displayedTranscript, setDisplayedTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (state.messages.length > 0) {
      setIsActive(true);
    }
  }, [state.messages]);

  useEffect(() => {
    let index = 0;
    if (displayedTranscript.length < transcript.length) {
      const timer = setTimeout(() => {
        setDisplayedTranscript(transcript.slice(0, index + 1));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [transcript, displayedTranscript]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        try {
          const response = await fetch("/api/stt", {
            method: "POST",
            body: audioBlob,
            headers: { "Content-Type": "audio/webm" },
          });
          const result = await response.json();
          if (result.transcript) {
            setTranscript(result.transcript);
            setDisplayedTranscript("");
          }
        } catch (err) {
          console.error("STT failed:", err);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSend = () => {
    const text = displayedTranscript || transcript;
    if (!text.trim()) return;
    sendMessage(text);
    setTranscript("");
    setDisplayedTranscript("");
  };

  const handleInputChange = (text: string) => {
    setTranscript(text);
    setDisplayedTranscript(text);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <style>{`
        @keyframes slideLeft {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-40%);
          }
        }

        .chat-container {
          transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .chat-container.active {
          animation: slideLeft 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .tool-panel {
          opacity: 0;
          transform: translateX(100%);
          transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .tool-panel.active {
          opacity: 1;
          transform: translateX(0);
        }
      `}</style>

      <div className="flex w-full gap-8" style={{ maxWidth: "1200px" }}>
        <div className={`chat-container flex-shrink-0 transition-all ${isActive ? "active w-1/2" : "w-96"}`}>
          <div className="flex h-screen flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm rounded-lg border border-green-500/30 bg-slate-900/50 p-8 backdrop-blur-xl">
              <h1 className="mb-8 text-center font-mono text-sm tracking-widest text-green-400">
                SARVAM VOICE RESEARCH
              </h1>

              <div className="mb-6 space-y-4">
                <div className="min-h-24 rounded border border-green-500/20 bg-slate-950/50 p-4 font-mono text-sm text-green-300">
                  {displayedTranscript || transcript || "Listening..."}
                </div>

                <div className="flex gap-3">
                  <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className="flex flex-1 items-center justify-center rounded bg-green-500/10 py-3 font-mono text-sm text-green-400 hover:bg-green-500/20 active:bg-green-500/30"
                  >
                    🎤 RECORD
                  </button>
                  <button
                    onClick={handleSend}
                    className="flex flex-1 items-center justify-center rounded bg-green-500 py-3 font-mono text-sm font-bold text-slate-950 hover:bg-green-400 active:scale-95"
                  >
                    SEND
                  </button>
                </div>

                <textarea
                  value={transcript}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Or type here..."
                  className="w-full rounded border border-green-500/20 bg-slate-950/50 p-3 font-mono text-sm text-green-300 placeholder-green-500/30 outline-none focus:border-green-500/50"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {isActive && (
          <div className="tool-panel active flex flex-1 flex-col gap-4 overflow-hidden py-6">
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 pr-4">
                {thinking && (
                  <div className="rounded border border-blue-500/30 bg-blue-500/10 p-3">
                    <div className="mb-2 font-mono text-xs uppercase tracking-wider text-blue-400">
                      Thinking
                    </div>
                    <div className="font-mono text-sm text-blue-200">{thinking}</div>
                  </div>
                )}

                {state.trace.map((event, idx) => {
                  if (event.type === "tool_call") {
                    return (
                      <div key={idx} className="rounded border border-yellow-500/30 bg-yellow-500/10 p-3">
                        <div className="mb-2 font-mono text-xs uppercase tracking-wider text-yellow-400">
                          🔧 {event.tool}
                        </div>
                        <div className="font-mono text-xs text-yellow-200">
                          {JSON.stringify(event.args, null, 2)}
                        </div>
                      </div>
                    );
                  }
                  if (event.type === "tool_result") {
                    return (
                      <div key={idx} className="rounded border border-green-500/30 bg-green-500/10 p-3">
                        <div className="mb-2 font-mono text-xs uppercase tracking-wider text-green-400">
                          ✓ Result
                        </div>
                        <div className="font-mono text-xs text-green-200">
                          {JSON.stringify(event.result, null, 2)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            <div className="flex-shrink-0 rounded border border-green-500/30 bg-slate-900/50 p-4">
              <div className="font-mono text-xs uppercase tracking-wider text-green-400 mb-3">Response</div>
              {state.messages.length > 0 && (
                <div className="font-mono text-sm text-green-300">
                  {state.messages[state.messages.length - 1].content}
                </div>
              )}
              {state.error && <div className="font-mono text-sm text-red-400">Error: {state.error}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
