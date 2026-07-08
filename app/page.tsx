"use client";

import { useRef, useState, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { TracePanel } from "@/components/TracePanel";
import { VoiceButton } from "@/components/VoiceButton";
import { cn } from "@/lib/utils";
import { useChat } from "@/lib/useChat";

export default function Home() {
  const { state, sendMessage, thinking } = useChat();
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasMessages = state.messages.length > 0;
  const hasTraceActivity = thinking || state.trace.length > 0;
  const displayError = error || state.error;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, thinking, state.trace]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
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
          setError("No audio detected. Hold the button and speak clearly.");
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        try {
          const res = await fetch("/api/stt", {
            method: "POST",
            body: audioBlob,
            headers: { "Content-Type": "audio/webm" },
          });

          if (!res.ok) {
            setError("Voice processing failed. Please try again.");
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          const result = await res.json();

          if (result.transcript?.trim()) {
            setInput(result.transcript);
          } else {
            setError("Could not understand audio. Please try again.");
          }
        } catch {
          setError("Voice processing failed. Please try again.");
        } finally {
          stream.getTracks().forEach((t) => t.stop());
        }
      };

      mediaRecorder.start();
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError") {
        setError("Microphone access denied. Allow it in your browser settings.");
      } else if (name === "NotFoundError") {
        setError("No microphone found. Check your device.");
      } else {
        setError("Could not access microphone. Please try again.");
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const handleSend = () => {
    if (!input.trim()) {
      setError("Type a message or hold the mic button to speak.");
      return;
    }
    setError(null);
    sendMessage(input, "en-IN", true);
    setInput("");
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
    setError(null);
  };

  return (
    <div className="flex h-dvh w-full flex-col bg-paper-texture">
      <Header />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Chat column */}
        <main className="flex min-h-0 flex-1 flex-col">
          {!hasMessages && !thinking ? (
            <EmptyState onSuggestionClick={handleSuggestion} />
          ) : (
            <div className="scroll-area flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              <div className="mx-auto flex max-w-2xl flex-col gap-4">
                {state.messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}

                {thinking && !state.messages.some((m) => m.role === "assistant" && m.turn === state.turn) && (
                  <div className="fade-in flex justify-start">
                    <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Mobile trace toggle */}
          {hasTraceActivity && (
            <button
              type="button"
              onClick={() => setShowTrace((v) => !v)}
              className="flex items-center justify-center gap-2 border-t border-border bg-sidebar px-4 py-2 text-xs font-medium text-ink-soft lg:hidden"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>
              {showTrace ? "Hide agent trace" : "Show agent trace"}
            </button>
          )}

          {/* Mobile trace drawer */}
          {showTrace && (
            <div className="max-h-48 overflow-hidden border-t border-border lg:hidden">
              <TracePanel trace={state.trace} thinking={thinking} className="max-h-48" />
            </div>
          )}

          {/* Input bar */}
          <div className="shrink-0 border-t border-border bg-card/90 p-4 backdrop-blur-sm sm:px-6">
            <div className="mx-auto max-w-2xl">
              {displayError && (
                <div
                  role="alert"
                  className="fade-in mb-3 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger"
                >
                  {displayError}
                </div>
              )}

              <div className="flex items-end gap-3">
                <VoiceButton
                  isRecording={isRecording}
                  onStart={startRecording}
                  onStop={stopRecording}
                />

                <div className="relative min-w-0 flex-1">
                  <textarea
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    placeholder={isRecording ? "Listening…" : "Ask anything — or hold the mic"}
                    disabled={isRecording}
                    className={cn(
                      "w-full resize-none rounded-2xl border border-border bg-paper px-4 py-3 text-[15px] text-ink placeholder:text-ink-soft/60",
                      "outline-none transition-colors focus:border-brand/50 focus:ring-2 focus:ring-brand/15",
                      "disabled:opacity-60",
                      "max-h-32"
                    )}
                    style={{ minHeight: "48px" }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || isRecording}
                  className={cn(
                    "shrink-0 rounded-2xl px-5 py-3 text-sm font-semibold transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                    input.trim() && !isRecording
                      ? "bg-brand text-white hover:bg-brand-hover active:scale-[0.98]"
                      : "cursor-not-allowed bg-sidebar text-ink-soft"
                  )}
                >
                  Send
                </button>
              </div>

              <p className="mt-2 hidden text-center text-[11px] text-ink-soft sm:block">
                Press Enter to send · Shift+Enter for new line · Hold mic to speak
              </p>
            </div>
          </div>
        </main>

        {/* Desktop trace sidebar */}
        <TracePanel
          trace={state.trace}
          thinking={thinking}
          className="hidden lg:flex"
        />
      </div>
    </div>
  );
}
