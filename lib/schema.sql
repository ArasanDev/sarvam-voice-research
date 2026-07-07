CREATE TABLE IF NOT EXISTS shop (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  default_language_code TEXT NOT NULL DEFAULT 'en-IN',
  pronunciation_dictionary_id TEXT
);

CREATE TABLE IF NOT EXISTS product (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shop(id),
  name_en TEXT NOT NULL,
  name_local TEXT NOT NULL,
  local_language_code TEXT NOT NULL,
  pronunciation_hint TEXT,
  category TEXT NOT NULL,
  price_paise INTEGER NOT NULL,
  unit TEXT NOT NULL,
  in_stock_qty INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS conversation (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shop(id),
  customer_language_code TEXT NOT NULL DEFAULT 'en-IN',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_item (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversation(id),
  product_id TEXT NOT NULL REFERENCES product(id),
  quantity INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "order" (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversation(id),
  status TEXT NOT NULL DEFAULT 'placed',
  total_paise INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS order_item (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES "order"(id),
  product_id TEXT NOT NULL REFERENCES product(id),
  quantity INTEGER NOT NULL,
  price_paise_at_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS search_log (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shop(id),
  query TEXT NOT NULL,
  matched_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
