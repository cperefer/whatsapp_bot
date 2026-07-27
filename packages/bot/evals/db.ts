import { sql } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { getOrCreateUser } from "../src/db/users.js";

// Mirrors src/db/schema.ts. The project has no migrations folder yet
// (db:migrate is run ad hoc against the prod DB), so evals create the schema
// directly against a throwaway sqlite file instead of depending on that
// pipeline. If you change schema.ts, update this too.
const CREATE_TABLES = [
  sql`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  sql`CREATE TABLE IF NOT EXISTS shopping_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    added_by INTEGER NOT NULL REFERENCES users(id),
    added_at INTEGER NOT NULL,
    checked INTEGER NOT NULL DEFAULT 0,
    checked_at INTEGER
  )`,
  sql`CREATE TABLE IF NOT EXISTS crossfit_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    notes TEXT,
    rpe TEXT,
    created_at INTEGER NOT NULL
  )`,
  sql`CREATE TABLE IF NOT EXISTS crossfit_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES crossfit_sessions(id),
    name TEXT NOT NULL,
    sets INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight_kg REAL NOT NULL
  )`,
  sql`CREATE TABLE IF NOT EXISTS crossfit_prs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    reps INTEGER NOT NULL,
    result REAL NOT NULL,
    unit TEXT NOT NULL
  )`,
];

const TABLES_IN_DELETE_ORDER = [
  "crossfit_exercises",
  "crossfit_prs",
  "crossfit_sessions",
  "shopping_items",
  "users",
];

export function initSchema(): void {
  for (const statement of CREATE_TABLES) {
    db.run(statement);
  }
}

export function resetDb(): void {
  for (const table of TABLES_IN_DELETE_ORDER) {
    db.run(sql.raw(`DELETE FROM ${table}`));
  }
}

export async function seedUser(name = "Miguel"): Promise<{ userId: number; userName: string }> {
  const phone = `eval-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const userId = await getOrCreateUser(phone, name);
  return { userId, userName: name };
}
