"use client";

import { ToolIcon } from "./ToolIcon";
import { toolMeta } from "@/lib/toolMeta";
import type { TraceEntry } from "@/lib/useBazaarChat";

function resultHeadline(tool: string, result: unknown): string {
  if (!result || typeof result !== "object") return "";
  const r = result as any;
  if (r.error) return r.error;
  switch (tool) {
    case "search_catalog":
      return r.results?.length ? `Found ${r.results.length} item(s)` : "No matches found";
    case "add_to_cart":
    case "view_cart":
    case "remove_from_cart":
      return r.cart ? `${r.cart.items.length} item(s) in cart · ₹${r.cart.total_rupees}` : "";
    case "place_order":
      return `Order #${(r.order_id || "").slice(0, 8)} · ₹${r.total_rupees}`;
    case "get_order_status":
      return `${r.status} · ₹${r.total_rupees}`;
    default:
      return "Done";
  }
}

export function InlineToolCard({ entry }: { entry: TraceEntry }) {
  const meta = toolMeta(entry.tool);
  const isOrder = entry.tool === "place_order" && entry.status === "done" && !(entry.result as any)?.error;

  return (
    <div
      className={`fade-in flex max-w-[75%] items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] ${
        isOrder ? "border-brand/25 bg-brand-soft/40" : "border-border bg-card"
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
          isOrder ? "bg-brand text-white" : "bg-sidebar text-ink-soft"
        }`}
      >
        <ToolIcon icon={meta.icon} className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium text-ink">
          {entry.status === "pending" ? meta.verb + "…" : meta.label}
        </span>
        {entry.status === "done" && (
          <span className="text-ink-soft"> — {resultHeadline(entry.tool, entry.result)}</span>
        )}
      </span>
      {entry.status === "pending" && (
        <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-ink-soft/40 border-t-transparent" />
      )}
    </div>
  );
}
