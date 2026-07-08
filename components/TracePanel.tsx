import { cn } from "@/lib/utils";
import type { TraceEntry } from "@/lib/useChat";

interface TracePanelProps {
  trace: TraceEntry[];
  thinking: string;
  className?: string;
}

function ToolIcon({ status }: { status: TraceEntry["status"] }) {
  if (status === "pending") {
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
      </span>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-brand" aria-hidden>
      <path
        d="M3 8.5 6.5 12 13 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TracePanel({ trace, thinking, className }: TracePanelProps) {
  const hasActivity = thinking || trace.length > 0;

  return (
    <aside
      className={cn(
        "flex w-full flex-col border-border bg-sidebar lg:w-80 lg:shrink-0 lg:border-l",
        className
      )}
    >
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Agent trace
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!hasActivity ? (
          <p className="px-1 py-6 text-center text-sm text-ink-soft">
            Tool calls and reasoning steps appear here as the assistant works.
          </p>
        ) : (
          <div className="space-y-2">
            {thinking && (
              <div className="fade-in rounded-xl border border-brand/20 bg-brand-soft/50 px-3 py-2.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-brand">
                  Thinking
                </p>
                <p className="font-mono text-xs leading-relaxed text-ink-soft">
                  {thinking}
                </p>
              </div>
            )}

            {trace.map((entry) => (
              <div
                key={entry.id}
                className="fade-in rounded-xl border border-border bg-card px-3 py-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-1 shrink-0">
                    <ToolIcon status={entry.status} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs font-medium text-ink">
                      {entry.tool}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-soft">
                      {entry.type === "tool_call" && entry.status === "pending"
                        ? "Running…"
                        : entry.durationMs
                          ? `Completed in ${entry.durationMs}ms`
                          : "Done"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
