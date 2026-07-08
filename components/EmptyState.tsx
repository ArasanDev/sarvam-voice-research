interface EmptyStateProps {
  onSuggestionClick: (text: string) => void;
}

const SUGGESTIONS = [
  "What can Sarvam AI do?",
  "Explain voice AI in Tamil",
  "Research latest AI news",
];

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-4">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-brand" aria-hidden>
          <path
            d="M12 3c4.97 0 9 3.582 9 8s-4.03 8-9 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 3C7.03 3 3 6.582 3 11s4.03 8 9 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.35"
          />
          <circle cx="12" cy="11" r="2" fill="currentColor" />
        </svg>
      </div>

      <h2 className="mb-2 text-center text-xl font-semibold tracking-tight text-ink">
        What would you like to research?
      </h2>
      <p className="mb-8 max-w-sm text-center text-sm leading-relaxed text-ink-soft">
        Speak in English, Tamil, or Hindi — or type below. Responses are read aloud
        automatically.
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSuggestionClick(suggestion)}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-ink-soft transition-colors hover:border-brand/30 hover:bg-brand-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
