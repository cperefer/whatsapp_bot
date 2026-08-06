import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { sessions, users } from "../../../bot/src/db/schema.js";
import type { ApiDeps } from "../app.js";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: number;
  phone: string;
  name: string;
}

export async function createSession(
  db: ApiDeps["db"],
  userId: number,
  userAgent?: string,
): Promise<{ id: string; expiresAt: number }> {
  const id = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await db
    .insert(sessions)
    .values({ id, userId, createdAt: Date.now(), expiresAt, userAgent })
    .run();
  return { id, expiresAt };
}

export async function getSessionUser(db: ApiDeps["db"], sessionId: string): Promise<SessionUser | null> {
  const row = await db
    .select({ id: users.id, phone: users.phone, name: users.name, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .get();

  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    await deleteSession(db, sessionId);
    return null;
  }

  return { id: row.id, phone: row.phone, name: row.name };
}

export async function deleteSession(db: ApiDeps["db"], sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}
