"use client";

import { useState } from "react";
import { Check, Copy, Volume2 } from "lucide-react";
import type { ChatMessageUI } from "@/lib/useBazaarChat";

export function ChatBubble({
  message,
  onReplay,
}: {
  message: ChatMessageUI;
  onReplay?: (text: string, languageCode: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isCustomer = message.role === "customer";

  function copy() {
    navigator.clipboard.writeText(message.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  if (isCustomer) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl bg-user-bubble px-4 py-2.5 text-[14.5px] leading-relaxed text-ink">
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex justify-start">
      <div className="max-w-[75%]">
        <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink">{message.text}</p>
        <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={copy}
            className="flex h-6 w-6 items-center justify-center rounded-md text-ink-soft/70 hover:bg-sidebar hover:text-ink"
            title="Copy"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {onReplay && (
            <button
              onClick={() => onReplay(message.text, message.languageCode || "en-IN")}
              className="flex h-6 w-6 items-center justify-center rounded-md text-ink-soft/70 hover:bg-sidebar hover:text-ink"
              title="Play voice"
            >
              <Volume2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
