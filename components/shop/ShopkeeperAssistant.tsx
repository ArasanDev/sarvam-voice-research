"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { InlineToolCard } from "@/components/chat/InlineToolCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useShopkeeperChat } from "@/lib/useShopkeeperChat";

const SUGGESTIONS = ["What sold today?", "Any items customers wanted but we don't stock?", "Check rice stock"];

export function ShopkeeperAssistant() {
  const { state, sendMessage } = useShopkeeperChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [state.messages.length, state.trace.length]);

  function submit(text = input) {
    if (!text.trim() || state.thinking) return;
    sendMessage(text, "en-IN", false);
    setInput("");
  }

  return (
    <div className="flex h-[520px] flex-col rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[13px] font-semibold text-ink">Ask Bazaar</h2>
        <p className="text-[11.5px] text-ink-soft">
          Your shopkeeper copilot — check stock, mark items out, see today's numbers and what customers wanted but couldn't find.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {state.messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="rounded-full border border-border bg-paper px-3 py-1.5 text-[12.5px] text-ink-soft hover:border-brand/40 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          {Array.from(new Set([...state.messages.map((m) => m.turn), ...state.trace.map((t) => t.turn)]))
            .sort((a, b) => a - b)
            .map((turn) => {
              const customer = state.messages.find((m) => m.turn === turn && m.role === "customer");
              const assistant = state.messages.find((m) => m.turn === turn && m.role === "assistant");
              const tools = state.trace.filter((t) => t.turn === turn);
              return (
                <div key={turn} className="flex flex-col gap-2">
                  {customer && <ChatBubble message={customer} />}
                  {tools.map((entry) => (
                    <div key={entry.id} className="flex justify-start">
                      <InlineToolCard entry={entry} />
                    </div>
                  ))}
                  {assistant && <ChatBubble message={assistant} />}
                </div>
              );
            })}
          {state.thinking && (
            <div className="flex items-center gap-1.5 px-0.5 py-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft/50 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft/50 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft/50" />
            </div>
          )}
          {state.error && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[12.5px] text-danger">
              {state.error}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border p-2.5">
        <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-paper px-2.5 py-1.5 focus-within:border-brand/50">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Ask about stock, sales, or demand…"
            className="max-h-24 min-h-8 flex-1 resize-none border-0 bg-transparent px-1 py-1 text-[13.5px] shadow-none focus-visible:ring-0"
          />
          <Button
            onClick={() => submit()}
            disabled={state.thinking || !input.trim()}
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full bg-brand text-white hover:bg-brand-hover disabled:opacity-40"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
