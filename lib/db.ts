import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH =
  process.env.BAZAAR_DB_PATH || path.join(process.cwd(), "data", "bazaar.sqlite");

declare global {
  // eslint-disable-next-line no-var
  var __bazaarDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  const schema = fs.readFileSync(
    path.join(process.cwd(), "lib", "schema.sql"),
    "utf-8"
  );
  db.exec(schema);
  return db;
}

// Reuse a single connection across hot-reloads in dev.
export const db: Database.Database = global.__bazaarDb ?? createDb();
if (process.env.NODE_ENV !== "production") {
  global.__bazaarDb = db;
}
