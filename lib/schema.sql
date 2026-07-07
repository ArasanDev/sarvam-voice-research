CREATE TABLE IF NOT EXISTS conversation (
  id TEXT PRIMARY KEY,
  language_code TEXT NOT NULL DEFAULT 'en-IN',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS message (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversation(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tool_calls TEXT,
  created_at INTEGER NOT NULL
);
