"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Volume2, VolumeOff } from "lucide-react";
import { ChatBubble } from "./ChatBubble";
import { CartStrip } from "./CartStrip";
import { MicButton } from "./MicButton";
import { InlineToolCard } from "./InlineToolCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { replayText } from "@/lib/useBazaarChat";
import type { ChatMessageUI, TraceEntry } from "@/lib/useBazaarChat";

const LANGUAGES: Array<{ code: "en-IN" | "ta-IN"; label: string }> = [
  { code: "en-IN", label: "EN" },
  { code: "ta-IN", label: "தமிழ்" },
];

const STARTER_PROMPTS: Array<{ text: string; languageCode: "en-IN" | "ta-IN" }> = [
  { text: "Do you have rice?", languageCode: "en-IN" },
  { text: "அரிசி இருக்கா?", languageCode: "ta-IN" },
  { text: "What snacks do you have?", languageCode: "en-IN" },
];

export function ChatPanel({
  messages,
  trace,
  cart,
  thinking,
  error,
  onSend,
}: {
  messages: ChatMessageUI[];
  trace: TraceEntry[];
  cart: { items: any[]; total_rupees: number } | null;
  thinking: boolean;
  error: string | null;
  onSend: (text: string, languageCode: string, wantsAudio: boolean) => void;
}) {
  const [language, setLanguage] = useState<"en-IN" | "ta-IN">("en-IN");
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const turns = useMemo(() => {
    const turnNumbers = Array.from(
      new Set([...messages.map((m) => m.turn), ...trace.map((t) => t.turn)])
    ).sort((a, b) => a - b);
    return turnNumbers.map((turn) => ({
      turn,
      customer: messages.find((m) => m.turn === turn && m.role === "customer"),
      assistant: messages.find((m) => m.turn === turn && m.role === "assistant"),
      tools: trace.filter((t) => t.turn === turn),
    }));
  }, [messages, trace]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, trace.length, thinking]);

  function submit(text = input) {
    if (!text.trim() || thinking) return;
    onSend(text, language, voiceReplies);
    setInput("");
  }

  const hasConversation = turns.length > 0;

  return (
    <section className="flex h-full w-full flex-col bg-paper">
      <header className="flex items-center gap-3 border-b border-border px-5 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[13px] text-white">
          B
        </span>
        <div className="min-w-0">
          <h1 className="text-[14px] font-semibold leading-tight text-ink">Anand General Store</h1>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="flex overflow-hidden rounded-full border border-border bg-card p-0.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
                  language === l.code ? "bg-brand text-white" : "text-ink-soft hover:bg-sidebar"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVoiceReplies((v) => !v)}
                className="h-8 w-8 rounded-full text-ink-soft hover:bg-sidebar hover:text-ink"
              >
                {voiceReplies ? <Volume2 className="h-4 w-4" /> : <VolumeOff className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{voiceReplies ? "Voice replies on" : "Voice replies off"}</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {cart && cart.items.length > 0 && <CartStrip cart={cart} />}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-8">
          {!hasConversation && (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg text-white">
                B
              </span>
              <div>
                <h2 className="text-[18px] font-semibold text-ink">Vanakkam! How can I help today?</h2>
                <p className="mt-1 max-w-sm text-[13.5px] text-ink-soft">
                  Type or hold the mic — English and Tamil both work.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p.text}
                    onClick={() => {
                      setLanguage(p.languageCode);
                      onSend(p.text, p.languageCode, voiceReplies);
                    }}
                    className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] text-ink-soft transition-colors hover:border-brand/40 hover:text-ink"
                  >
                    {p.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map(({ turn, customer, assistant, tools }) => (
            <div key={turn} className="flex flex-col gap-3">
              {customer && <ChatBubble message={customer} />}
              {tools.map((entry) => (
                <div key={entry.id} className="flex justify-start">
                  <InlineToolCard entry={entry} />
                </div>
              ))}
              {assistant && <ChatBubble message={assistant} onReplay={replayText} />}
              {!assistant && thinking && turn === turns[turns.length - 1]?.turn && (
                <div className="flex items-center gap-1.5 px-0.5 py-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft/50 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft/50 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft/50" />
                </div>
              )}
            </div>
          ))}

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[13px] text-danger">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-paper px-4 pb-5 pt-3">
        <div className="mx-auto flex max-w-2xl items-end gap-1.5 rounded-3xl border border-border bg-card px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus-within:border-brand/50">
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
            placeholder={
              language === "ta-IN" ? "உங்கள் செய்தியை தட்டச்சு செய்யவும்…" : "Message Bazaar…"
            }
            className="max-h-32 min-h-9 flex-1 resize-none border-0 bg-transparent px-1.5 py-1.5 text-[14.5px] shadow-none focus-visible:ring-0"
          />
          <MicButton
            disabled={thinking}
            onTranscript={(transcript, detectedLang) => {
              const lang = detectedLang.startsWith("ta") ? "ta-IN" : "en-IN";
              setLanguage(lang);
              onSend(transcript, lang, voiceReplies);
            }}
          />
          <Button
            onClick={() => submit()}
            disabled={thinking || !input.trim()}
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full bg-brand text-white hover:bg-brand-hover disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
