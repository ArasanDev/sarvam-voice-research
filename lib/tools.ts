import { randomUUID } from "node:crypto";
import { db } from "./db";
import type { ToolSpec } from "./sarvam";

export const TOOL_SPECS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "search_catalog",
      description:
        "Search the shop's product catalog by name or category (matches English or Tamil names).",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "search text" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_cart",
      description: "Add a quantity of a product to the customer's cart.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string" },
          quantity: { type: "number" },
        },
        required: ["product_id", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "view_cart",
      description: "View the current contents and total of the customer's cart.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_from_cart",
      description: "Remove a product entirely from the cart.",
      parameters: {
        type: "object",
        properties: { product_id: { type: "string" } },
        required: ["product_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "place_order",
      description: "Place the order for everything currently in the cart. Cart must not be empty.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_status",
      description: "Look up the status of a previously placed order by order id.",
      parameters: {
        type: "object",
        properties: { order_id: { type: "string" } },
        required: ["order_id"],
      },
    },
  },
];

interface ToolContext {
  shopId: string;
  conversationId: string;
}

function productPublic(p: any) {
  return {
    id: p.id,
    name_en: p.name_en,
    name_local: p.name_local,
    price_rupees: p.price_paise / 100,
    unit: p.unit,
    in_stock: p.in_stock_qty > 0,
    in_stock_qty: p.in_stock_qty,
  };
}

function cartSnapshot(conversationId: string) {
  const rows = db
    .prepare(
      `SELECT ci.product_id, ci.quantity, p.name_en, p.name_local, p.price_paise, p.unit
       FROM cart_item ci JOIN product p ON p.id = ci.product_id
       WHERE ci.conversation_id = ?`
    )
    .all(conversationId) as any[];
  const items = rows.map((r) => ({
    product_id: r.product_id,
    name_en: r.name_en,
    name_local: r.name_local,
    quantity: r.quantity,
    unit: r.unit,
    line_total_rupees: (r.price_paise * r.quantity) / 100,
  }));
  const total_rupees = items.reduce((sum, i) => sum + i.line_total_rupees, 0);
  return { items, total_rupees };
}

export function executeTool(name: string, args: any, ctx: ToolContext): unknown {
  switch (name) {
    case "search_catalog": {
      // The model sometimes sends a compound query ("rice and sugar") — split on
      // common conjunctions/punctuation and OR the terms together so a single
      // tool call can still surface multiple products.
      const terms = String(args.query || "")
        .toLowerCase()
        .split(/\band\b|,|\/|&/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (terms.length === 0) terms.push("");

      const clauses = terms
        .map(() => `(lower(name_en) LIKE ? OR lower(name_local) LIKE ? OR lower(category) LIKE ?)`)
        .join(" OR ");
      const params = terms.flatMap((t) => [`%${t}%`, `%${t}%`, `%${t}%`]);

      const rows = db
        .prepare(`SELECT * FROM product WHERE shop_id = ? AND (${clauses})`)
        .all(ctx.shopId, ...params) as any[];

      db.prepare(
        `INSERT INTO search_log (id, shop_id, query, matched_count, created_at) VALUES (?, ?, ?, ?, ?)`
      ).run(randomUUID(), ctx.shopId, String(args.query || ""), rows.length, Date.now());

      return { results: rows.map(productPublic) };
    }
    case "add_to_cart": {
      const product = db
        .prepare(`SELECT * FROM product WHERE id = ? AND shop_id = ?`)
        .get(args.product_id, ctx.shopId) as any;
      if (!product) return { error: "product not found" };
      const qty = Math.max(1, Math.floor(args.quantity || 1));
      if (product.in_stock_qty < qty) {
        return { error: "insufficient stock", available: product.in_stock_qty };
      }
      const existing = db
        .prepare(`SELECT * FROM cart_item WHERE conversation_id = ? AND product_id = ?`)
        .get(ctx.conversationId, args.product_id) as any;
      if (existing) {
        db.prepare(`UPDATE cart_item SET quantity = ? WHERE id = ?`).run(
          existing.quantity + qty,
          existing.id
        );
      } else {
        db.prepare(
          `INSERT INTO cart_item (id, conversation_id, product_id, quantity) VALUES (?, ?, ?, ?)`
        ).run(randomUUID(), ctx.conversationId, args.product_id, qty);
      }
      return { cart: cartSnapshot(ctx.conversationId) };
    }
    case "view_cart": {
      return { cart: cartSnapshot(ctx.conversationId) };
    }
    case "remove_from_cart": {
      db.prepare(
        `DELETE FROM cart_item WHERE conversation_id = ? AND product_id = ?`
      ).run(ctx.conversationId, args.product_id);
      return { cart: cartSnapshot(ctx.conversationId) };
    }
    case "place_order": {
      const snapshot = cartSnapshot(ctx.conversationId);
      if (snapshot.items.length === 0) {
        return { error: "cart is empty" };
      }
      const orderId = randomUUID();
      const totalPaise = Math.round(snapshot.total_rupees * 100);
      db.prepare(
        `INSERT INTO "order" (id, conversation_id, status, total_paise, created_at) VALUES (?, ?, 'placed', ?, ?)`
      ).run(orderId, ctx.conversationId, totalPaise, Date.now());
      const insertItem = db.prepare(
        `INSERT INTO order_item (id, order_id, product_id, quantity, price_paise_at_order) VALUES (?, ?, ?, ?, ?)`
      );
      for (const item of snapshot.items) {
        const product = db.prepare(`SELECT price_paise FROM product WHERE id = ?`).get(
          item.product_id
        ) as any;
        insertItem.run(randomUUID(), orderId, item.product_id, item.quantity, product.price_paise);
      }
      db.prepare(`DELETE FROM cart_item WHERE conversation_id = ?`).run(ctx.conversationId);
      return { order_id: orderId, total_rupees: snapshot.total_rupees, status: "placed" };
    }
    case "get_order_status": {
      const order = db.prepare(`SELECT * FROM "order" WHERE id = ?`).get(args.order_id) as any;
      if (!order) return { error: "order not found" };
      return {
        order_id: order.id,
        status: order.status,
        total_rupees: order.total_paise / 100,
      };
    }
    default:
      return { error: `unknown tool: ${name}` };
  }
}

// --- Shopkeeper persona: same orchestrator loop, a different tool set that
// operates on the shop's own inventory/sales data instead of a customer cart.

export const SHOPKEEPER_TOOL_SPECS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "check_stock",
      description: "Look up current stock and price for a product by name.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "product name to look up" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_stock",
      description:
        "Set the stock quantity for a product, or mark it out of stock (quantity 0). Matches by name if product_id is not known.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "product name to match, if product_id unknown" },
          product_id: { type: "string" },
          quantity: { type: "number", description: "new stock quantity" },
        },
        required: ["quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "daily_summary",
      description: "Get a summary of today's orders: count and total revenue.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "unmet_demand",
      description:
        "See what customers searched for that returned no matches, most-asked first — signals what to stock.",
      parameters: { type: "object", properties: {} },
    },
  },
];

interface ShopContext {
  shopId: string;
}

function resolveProduct(shopId: string, args: any): any {
  if (args.product_id) {
    return db.prepare(`SELECT * FROM product WHERE id = ? AND shop_id = ?`).get(args.product_id, shopId);
  }
  const q = `%${String(args.query || "").toLowerCase()}%`;
  return db
    .prepare(
      `SELECT * FROM product WHERE shop_id = ? AND (lower(name_en) LIKE ? OR lower(name_local) LIKE ?) LIMIT 1`
    )
    .get(shopId, q, q);
}

export function executeShopkeeperTool(name: string, args: any, ctx: ShopContext): unknown {
  switch (name) {
    case "check_stock": {
      const product = resolveProduct(ctx.shopId, args);
      if (!product) return { error: "product not found" };
      return productPublic(product);
    }
    case "update_stock": {
      const product = resolveProduct(ctx.shopId, args);
      if (!product) return { error: "product not found" };
      const qty = Math.max(0, Math.floor(args.quantity ?? 0));
      db.prepare(`UPDATE product SET in_stock_qty = ? WHERE id = ?`).run(qty, product.id);
      return { updated: productPublic({ ...product, in_stock_qty: qty }) };
    }
    case "daily_summary": {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const row = db
        .prepare(
          `SELECT COUNT(*) as order_count, COALESCE(SUM(o.total_paise), 0) as total_paise
           FROM "order" o JOIN conversation c ON c.id = o.conversation_id
           WHERE c.shop_id = ? AND o.created_at >= ?`
        )
        .get(ctx.shopId, dayStart.getTime()) as any;
      return {
        order_count: row.order_count,
        total_revenue_rupees: row.total_paise / 100,
      };
    }
    case "unmet_demand": {
      const rows = db
        .prepare(
          `SELECT query, COUNT(*) as times_asked
           FROM search_log
           WHERE shop_id = ? AND matched_count = 0
           GROUP BY lower(query)
           ORDER BY times_asked DESC
           LIMIT 10`
        )
        .all(ctx.shopId) as any[];
      return { unmet_searches: rows };
    }
    default:
      return { error: `unknown tool: ${name}` };
  }
}
