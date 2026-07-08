import { cn } from "@/lib/utils";
import type { ChatMessageUI } from "@/lib/useChat";

interface ChatMessageProps {
  message: ChatMessageUI;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isTamil = message.languageCode?.startsWith("ta");

  return (
    <div
      className={cn(
        "fade-in flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed sm:max-w-[72%]",
          isUser
            ? "rounded-br-md bg-user-bubble text-ink"
            : "rounded-bl-md border border-border bg-card text-ink shadow-sm",
          isTamil && "font-[family-name:var(--font-body-ta)]"
        )}
      >
        {!isUser && (
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-soft">
            Assistant
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  );
}
