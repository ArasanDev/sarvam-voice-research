"use client";

import {
  Search,
  ShoppingCart,
  PlusCircle,
  MinusCircle,
  CheckCircle2,
  Package,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  search: Search,
  cart: ShoppingCart,
  "cart-plus": PlusCircle,
  "cart-minus": MinusCircle,
  check: CheckCircle2,
  package: Package,
  tool: Wrench,
};

export function ToolIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] || Wrench;
  return <Icon className={className} strokeWidth={1.75} />;
}
