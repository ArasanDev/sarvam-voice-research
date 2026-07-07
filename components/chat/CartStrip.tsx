"use client";

export function CartStrip({ cart }: { cart: { items: any[]; total_rupees: number } | null }) {
  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex items-center justify-between border-b border-border bg-sidebar/50 px-5 py-1.5 text-[12px] text-ink-soft">
        <span>Cart is empty</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-sidebar/50 px-5 py-1.5">
      {cart.items.map((item) => (
        <span
          key={item.product_id}
          className="shrink-0 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-ink-soft"
        >
          {item.name_en} <span className="font-mono-num text-ink">×{item.quantity}</span>
        </span>
      ))}
      <span className="ml-auto shrink-0 font-mono-num text-[12.5px] font-semibold text-brand">
        ₹{cart.total_rupees}
      </span>
    </div>
  );
}
