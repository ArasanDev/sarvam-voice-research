import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  size?: "default" | "large";
}

export function VoiceButton({
  isRecording,
  onStart,
  onStop,
  size = "default",
}: VoiceButtonProps) {
  const isLarge = size === "large";

  return (
    <button
      type="button"
      aria-label={isRecording ? "Stop recording" : "Hold to record"}
      onMouseDown={onStart}
      onMouseUp={onStop}
      onMouseLeave={isRecording ? onStop : undefined}
      onTouchStart={onStart}
      onTouchEnd={onStop}
      className={cn(
        "group relative flex shrink-0 items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        isLarge ? "h-20 w-20" : "h-11 w-11",
        isRecording
          ? "bg-danger text-white pulse-rec"
          : "bg-brand text-white hover:bg-brand-hover active:scale-95"
      )}
    >
      {isRecording && (
        <>
          <span className="voice-ring voice-ring-1" />
          <span className="voice-ring voice-ring-2" />
        </>
      )}

      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={cn(isLarge ? "h-8 w-8" : "h-5 w-5")}
        aria-hidden
      >
        {isRecording ? (
          <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" />
        ) : (
          <>
            <path
              d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"
              fill="currentColor"
            />
            <path
              d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>

      {isLarge && !isRecording && (
        <span className="pointer-events-none absolute -bottom-7 whitespace-nowrap text-xs font-medium text-ink-soft opacity-0 transition-opacity group-hover:opacity-100">
          Hold to speak
        </span>
      )}
    </button>
  );
}
