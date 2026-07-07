"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShopkeeperAssistant } from "@/components/shop/ShopkeeperAssistant";

interface Order {
  id: string;
  status: string;
  total_rupees: number;
  created_at: number;
  language_code: string;
  items: string[];
}

export default function ShopPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let alive = true;
    async function poll() {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (alive) setOrders(data.orders);
    }
    poll();
    const id = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex items-center justify-between border-b border-border px-5 py-2 text-[12px] text-ink-soft">
        <span className="font-semibold text-ink">Bazaar</span>
        <Link href="/" className="underline decoration-dotted underline-offset-2 hover:text-ink">
          ← Back to shop counter
        </Link>
      </div>

      <header className="border-b border-border px-6 py-5">
        <h1 className="text-lg font-semibold text-ink">Anand General Store — Orders</h1>
        <p className="text-[13px] text-ink-soft">Live order list, updates every few seconds</p>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {orders.length === 0 ? (
            <p className="text-sm text-ink-soft">No orders placed yet. Ask Bazaar to place one!</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="bg-sidebar text-[11px] uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-2 font-medium">Order</th>
                    <th className="px-4 py-2 font-medium">Items</th>
                    <th className="px-4 py-2 font-medium">Lang</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                    <th className="px-4 py-2 text-right font-medium">Placed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-2.5 font-mono-num text-xs text-ink-soft">
                        #{o.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2.5">{o.items.join(", ")}</td>
                      <td className="px-4 py-2.5 font-mono-num text-xs uppercase">{o.language_code}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-hover">
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono-num font-semibold text-brand">
                        ₹{o.total_rupees}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-ink-soft">
                        {new Date(o.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <ShopkeeperAssistant />
      </main>
    </div>
  );
}
