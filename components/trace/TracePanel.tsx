"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TraceRow } from "./TraceRow";
import type { ChatMessageUI, TraceEntry } from "@/lib/useBazaarChat";

const THINKING_STATUSES = [
  "Reading your message…",
  "Deciding what to do…",
  "Checking the catalog…",
];

export function TracePanel({
  trace,
  messages,
  thinking,
}: {
  trace: TraceEntry[];
  messages: ChatMessageUI[];
  thinking: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [trace.length, thinking]);

  useEffect(() => {
    if (!thinking) {
      setStatusIdx(0);
      return;
    }
    const id = setInterval(() => setStatusIdx((i) => (i + 1) % THINKING_STATUSES.length), 1400);
    return () => clearInterval(id);
  }, [thinking]);

  const groups: Array<{ turn: number; entries: TraceEntry[] }> = [];
  for (const entry of trace) {
    const g = groups[groups.length - 1];
    if (g && g.turn === entry.turn) g.entries.push(entry);
    else groups.push({ turn: entry.turn, entries: [entry] });
  }

  function groupLabel(turn: number) {
    const msg = messages.find((m) => m.turn === turn && m.role === "customer");
    const ts = msg ? new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const snippet = msg ? (msg.text.length > 36 ? msg.text.slice(0, 36) + "…" : msg.text) : "";
    return { ts, snippet };
  }

  const latestTurn = messages.length > 0 ? messages[messages.length - 1].turn : trace.at(-1)?.turn;
  const showThinkingRow = thinking && !trace.some((t) => t.turn === latestTurn && t.status === "pending");

  return (
    <aside className="flex h-full w-full flex-col border-l border-border bg-sidebar">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-[13px] font-semibold text-ink">Agent activity</span>
        <Link
          href="/shop"
          className="text-[11px] text-ink-soft underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          Shopkeeper view →
        </Link>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {groups.length === 0 && !thinking && (
          <div className="flex h-64 flex-col items-center justify-center gap-2 px-8 text-center text-ink-soft">
            <p className="text-[13px]">No activity yet</p>
            <p className="text-[12px] text-ink-soft/70">
              Catalog searches, cart updates and orders will appear here as the agent works.
            </p>
          </div>
        )}
        {groups.map((g) => {
          const { ts, snippet } = groupLabel(g.turn);
          return (
            <div key={g.turn}>
              <div className="sticky top-0 z-10 bg-sidebar/95 px-4 py-1.5 backdrop-blur">
                <span className="text-[10.5px] font-medium text-ink-soft/80">
                  {ts}
                  {snippet && <span className="text-ink-soft/50"> · "{snippet}"</span>}
                </span>
              </div>
              <div className="divide-y divide-border/60">
                {g.entries.map((entry) => (
                  <TraceRow key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          );
        })}
        {showThinkingRow && (
          <div className="flex items-center gap-2 px-4 py-3 text-ink-soft">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-ink-soft/40" />
            <span className="text-[12px] italic">{THINKING_STATUSES[statusIdx]}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
