import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const orders = db
    .prepare(
      `SELECT o.id, o.status, o.total_paise, o.created_at, c.customer_language_code
       FROM "order" o JOIN conversation c ON c.id = o.conversation_id
       ORDER BY o.created_at DESC LIMIT 50`
    )
    .all() as any[];

  const itemsStmt = db.prepare(
    `SELECT oi.quantity, p.name_en FROM order_item oi JOIN product p ON p.id = oi.product_id WHERE oi.order_id = ?`
  );

  const result = orders.map((o) => ({
    id: o.id,
    status: o.status,
    total_rupees: o.total_paise / 100,
    created_at: o.created_at,
    language_code: o.customer_language_code,
    items: (itemsStmt.all(o.id) as any[]).map((i) => `${i.quantity}× ${i.name_en}`),
  }));

  return NextResponse.json({ orders: result });
}
