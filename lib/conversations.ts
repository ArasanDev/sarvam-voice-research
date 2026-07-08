import { randomUUID } from "node:crypto";
import { db } from "./db";

export function getOrCreateConversation(
  conversationId: string | null,
  languageCode: string
): string {
  if (conversationId) {
    const existing = db
      .prepare("SELECT id FROM conversation WHERE id = ?")
      .get(conversationId) as { id: string } | undefined;
    if (existing) return existing.id;
  }

  const id = conversationId || randomUUID();
  db.prepare(
    "INSERT OR IGNORE INTO conversation (id, language_code, created_at) VALUES (?, ?, ?)"
  ).run(id, languageCode, Date.now());
  return id;
}

export function saveMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  toolCalls?: string
): string {
  const id = randomUUID();
  db.prepare(
    "INSERT INTO message (id, conversation_id, role, content, tool_calls, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, conversationId, role, content, toolCalls ?? null, Date.now());
  return id;
}

export function loadConversationHistory(
  conversationId: string
): Array<{ role: "user" | "assistant"; content: string }> {
  const rows = db
    .prepare(
      "SELECT role, content FROM message WHERE conversation_id = ? AND role IN ('user', 'assistant') ORDER BY created_at ASC"
    )
    .all(conversationId) as Array<{ role: string; content: string }>;

  return rows.map((r) => ({
    role: r.role as "user" | "assistant",
    content: r.content,
  }));
}
