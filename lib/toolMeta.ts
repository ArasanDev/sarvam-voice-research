export const TOOL_META: Record<string, { label: string; verb: string; icon: string }> = {
  search_catalog: { label: "Search catalog", verb: "Searching catalog", icon: "search" },
  add_to_cart: { label: "Add to cart", verb: "Adding to cart", icon: "cart-plus" },
  view_cart: { label: "View cart", verb: "Checking cart", icon: "cart" },
  remove_from_cart: { label: "Remove from cart", verb: "Updating cart", icon: "cart-minus" },
  place_order: { label: "Place order", verb: "Placing order", icon: "check" },
  get_order_status: { label: "Check order status", verb: "Checking order", icon: "package" },
  check_stock: { label: "Check stock", verb: "Checking stock", icon: "search" },
  update_stock: { label: "Update stock", verb: "Updating stock", icon: "check" },
  daily_summary: { label: "Daily summary", verb: "Summarizing today", icon: "package" },
  unmet_demand: { label: "Unmet demand", verb: "Checking unmet demand", icon: "search" },
};

export function toolMeta(tool: string) {
  return TOOL_META[tool] || { label: tool, verb: `Running ${tool}`, icon: "tool" };
}
