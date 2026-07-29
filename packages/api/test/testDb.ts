import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "../../bot/src/db/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../../bot/src/db/migrations");

// Applies the real Drizzle migrations against a throwaway in-memory database,
// so tests exercise the same schema as production instead of a hand-copied
// approximation that could drift from it.
export function createTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return db;
}

export function createFakeSender() {
  const sentMessages: Array<{ phone: string; text: string }> = [];
  const sendSelfMessage = async (phone: string, text: string): Promise<boolean> => {
    sentMessages.push({ phone, text });
    return true;
  };
  return { sendSelfMessage, sentMessages };
}

export function extractOtpCode(text: string): string {
  const match = text.match(/\*(\d{6})\*/);
  if (!match?.[1]) throw new Error(`no OTP code found in message: ${text}`);
  return match[1];
}
