"use client";

import { useRef, useState, useEffect } from "react";
import { useChat } from "@/lib/useChat";

const VOICE_RECORDING = "bg-red-500 text-white shadow-lg shadow-red-500/50";
const VOICE_IDLE = "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50";

export default function Home() {
  const { state, sendMessage, thinking } = useChat();
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, thinking]);

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
          setError("No audio detected. Please try again.");
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
            setError("Could not understand audio. Please try again.");
          }
        } catch (err) {
          setError("Voice processing failed. Please try again.");
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
      setError("Please type a message or use voice input.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    setError(null);
    sendMessage(input, "en-IN", true);
    setInput("");
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden">
      {/* Sidebar */}
      <div
        className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-0"
        } overflow-hidden shadow-sm`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"></div>
              <h2 className="text-sm font-semibold text-gray-900">Sarvam</h2>
            </div>
          )}
        </div>

        {/* New Chat Button */}
        <button
          onClick={() => window.location.reload()}
          className="mx-3 mt-3 flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>➕</span>
          <span>New chat</span>
        </button>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {state.messages.length > 0 && (
            <>
              <p className="px-2 py-2 text-xs font-medium text-gray-500 uppercase">Today</p>
              <div className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors truncate">
                {state.messages[0].text.substring(0, 40)}...
              </div>
            </>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-200 p-3">
          <p className="text-xs text-gray-500 font-medium">Sarvam Voice Research</p>
          <p className="text-xs text-gray-400 mt-1">Powered by Sarvam AI</p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 font-bold text-xl"
          >
            {sidebarOpen ? "☰" : "☰"}
          </button>
          <h1 className="text-base font-semibold text-gray-900">Sarvam Voice Research Assistant</h1>
          <div className="w-10"></div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {state.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <div className="mb-4 text-4xl">🎤</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">How can I assist?</h2>
              <p className="text-gray-600 text-lg">Start a conversation by typing or using voice input</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {state.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl px-4 py-3 shadow-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-gray-100 text-gray-900 rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <p className="text-sm">{thinking}</p>
                    </div>
                  </div>
                </div>
              )}

              {state.trace.map((event) => (
                <div key={event.id} className="flex justify-start animate-fade-in">
                  <div className="bg-purple-50 text-purple-700 rounded-xl px-3 py-2 text-xs border border-purple-200 shadow-sm">
                    <div className="flex items-center gap-1">
                      <span>{event.type === "tool_call" ? "⚙️" : "✓"}</span>
                      <span className="font-medium">{event.tool}</span>
                      {event.type === "tool_call" && <span className="animate-spin">◌</span>}
                    </div>
                  </div>
                </div>
              ))}

              {(state.error || error) && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 border border-red-200 shadow-sm max-w-md">
                    <p className="text-sm font-medium">⚠️ {state.error || error}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 px-6 py-4 bg-white/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end">
              {/* Voice Button */}
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-200 ${
                  isRecording ? VOICE_RECORDING : VOICE_IDLE
                }`}
                title={isRecording ? "Release to stop recording" : "Press to record"}
              >
                🎤
              </button>

              {/* Input Field */}
              <div className="flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type your question or use voice..."
                  className="w-full px-4 py-2.5 rounded-full border border-gray-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-blue-500/50 hover:shadow-lg active:scale-95"
                title="Send message (Enter)"
              >
                ↗️
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <p className="mt-2 text-xs text-red-600 px-4 animate-fade-in">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
