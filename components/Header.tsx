export function Header() {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border bg-card/80 px-5 py-3.5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5 text-brand"
            aria-hidden
          >
            <path
              d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"
              fill="currentColor"
              opacity="0.9"
            />
            <path
              d="M19 10v1a7 7 0 0 1-14 0v-1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M12 18v4M8 22h8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-ink">
            Sarvam Research
          </h1>
          <p className="text-xs text-ink-soft">Voice-first multilingual assistant</p>
        </div>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <span className="rounded-full border border-border bg-sidebar px-2.5 py-1 text-[11px] font-medium text-ink-soft">
          en-IN · ta-IN · hi-IN
        </span>
      </div>
    </header>
  );
}
