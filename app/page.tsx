"use client";

import { useRef, useState, useEffect } from "react";
import { useChat } from "@/lib/useChat";

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

  const handleNewChat = () => {
    window.location.reload();
  };

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Sidebar */}
      <div
        className={`flex flex-col border-r border-gray-200 bg-gray-50 transition-all ${
          sidebarOpen ? "w-64" : "w-0"
        } overflow-hidden`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {sidebarOpen && <h2 className="text-sm font-semibold text-gray-900">ChatGPT</h2>}
        </div>

        <button
          onClick={handleNewChat}
          className="m-3 flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <span>+ New chat</span>
        </button>

        <div className="flex-1 overflow-y-auto px-2">
          {state.messages.length > 0 && (
            <div className="space-y-2 text-xs">
              <p className="px-2 py-3 text-gray-600">Today</p>
              <div className="rounded-lg bg-white p-2 text-gray-700 hover:bg-gray-100 cursor-pointer">
                {state.messages[0].text.substring(0, 30)}...
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-3 text-xs text-gray-600">
          Sarvam Voice Research
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            ☰
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Sarvam Voice Research</h1>
          <div className="w-8"></div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {state.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">How can I help?</h2>
              <p className="text-gray-600">Ask me anything or use voice input</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {state.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-2xl rounded-lg px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-3">
                    <p className="text-sm">💭 {thinking}</p>
                  </div>
                </div>
              )}

              {state.trace.map((event) => (
                <div key={event.id} className="flex justify-start">
                  <div className="bg-purple-50 text-purple-900 rounded-lg px-4 py-2 text-xs border border-purple-200">
                    {event.type === "tool_call" && `🔧 Calling ${event.tool}...`}
                    {event.type === "tool_result" && `✓ ${event.tool} completed`}
                  </div>
                </div>
              ))}

              {(state.error || error) && (
                <div className="flex justify-start">
                  <div className="bg-red-50 text-red-900 rounded-lg px-4 py-3 border border-red-200">
                    <p className="text-sm">⚠️ {state.error || error}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={isRecording}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition ${
                  isRecording
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {isRecording ? "🔴" : "🎤"}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Message Sarvam..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <button
                onClick={handleSend}
                className="flex-shrink-0 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition"
              >
                Send
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
