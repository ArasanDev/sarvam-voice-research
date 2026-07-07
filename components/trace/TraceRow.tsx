"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ToolIcon } from "@/components/chat/ToolIcon";
import { toolMeta } from "@/lib/toolMeta";
import type { TraceEntry } from "@/lib/useBazaarChat";

function summarizeResult(tool: string, result: unknown): string {
  if (!result || typeof result !== "object") return "";
  const r = result as any;
  if (r.error) return r.error;
  switch (tool) {
    case "search_catalog":
      return r.results?.length ? r.results.map((p: any) => p.name_en).join(", ") : "no matches";
    case "add_to_cart":
    case "view_cart":
    case "remove_from_cart":
      return r.cart ? `${r.cart.items.length} line(s) · ₹${r.cart.total_rupees}` : "";
    case "place_order":
      return `#${(r.order_id || "").slice(0, 8)} · ₹${r.total_rupees}`;
    case "get_order_status":
      return `${r.status} · ₹${r.total_rupees}`;
    default:
      return "";
  }
}

export function TraceRow({ entry }: { entry: TraceEntry }) {
  const [open, setOpen] = useState(false);
  const meta = toolMeta(entry.tool);
  const isOrder = entry.tool === "place_order" && entry.status === "done" && !(entry.result as any)?.error;

  return (
    <div className="fade-in">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-card/60"
      >
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
            isOrder ? "bg-brand text-white" : "bg-card text-ink-soft"
          }`}
        >
          <ToolIcon icon={meta.icon} className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-medium text-ink">{meta.label}</span>
            {entry.status === "done" ? (
              <span className="font-mono-num text-[10px] text-ink-soft/60">{entry.durationMs}ms</span>
            ) : (
              <span className="h-2.5 w-2.5 shrink-0 animate-spin rounded-full border-[1.5px] border-ink-soft/40 border-t-transparent" />
            )}
          </div>
          {entry.status === "done" && (
            <div className="mt-0.5 truncate text-[12px] text-ink-soft">
              {summarizeResult(entry.tool, entry.result)}
            </div>
          )}
        </div>
        <ChevronDown
          className={`mt-1 h-3.5 w-3.5 shrink-0 text-ink-soft/50 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="ml-9 mr-4 mb-2 rounded-lg border border-border bg-card px-3 py-2 font-mono-num text-[11px] text-ink-soft">
          <div className="mb-1 text-ink-soft/60">
            {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div className="mb-1 text-ink-soft/70">args</div>
          <pre className="mb-2 whitespace-pre-wrap break-words">{JSON.stringify(entry.args, null, 2)}</pre>
          {entry.status === "done" && (
            <>
              <div className="mb-1 text-ink-soft/70">result</div>
              <pre className="whitespace-pre-wrap break-words">{JSON.stringify(entry.result, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
