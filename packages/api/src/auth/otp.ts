import { createHash, randomInt } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { authCodes } from "../../../bot/src/db/schema.js";
import type { ApiDeps } from "../app.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_CODES = 3;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function isRateLimited(db: ApiDeps["db"], userId: number): Promise<boolean> {
  const recent = await db
    .select({ id: authCodes.id })
    .from(authCodes)
    .where(and(eq(authCodes.userId, userId), gt(authCodes.createdAt, Date.now() - RATE_LIMIT_WINDOW_MS)))
    .all();
  return recent.length >= RATE_LIMIT_MAX_CODES;
}

// Invalidates any codes still pending for this user before issuing a new one,
// so only the most recently sent code is ever usable.
export async function createOtp(db: ApiDeps["db"], userId: number): Promise<string> {
  await db
    .update(authCodes)
    .set({ consumedAt: Date.now() })
    .where(and(eq(authCodes.userId, userId), isNull(authCodes.consumedAt)))
    .run();

  const code = generateCode();
  await db
    .insert(authCodes)
    .values({
      userId,
      codeHash: hashCode(code),
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
      createdAt: Date.now(),
    })
    .run();

  return code;
}

export async function verifyOtp(db: ApiDeps["db"], userId: number, code: string): Promise<boolean> {
  const pending = await db
    .select()
    .from(authCodes)
    .where(and(eq(authCodes.userId, userId), isNull(authCodes.consumedAt)))
    .orderBy(desc(authCodes.id))
    .get();

  if (!pending) return false;
  if (pending.expiresAt < Date.now()) return false;
  if (pending.attempts >= MAX_VERIFY_ATTEMPTS) return false;

  await db
    .update(authCodes)
    .set({ attempts: pending.attempts + 1 })
    .where(eq(authCodes.id, pending.id))
    .run();

  if (pending.codeHash !== hashCode(code)) return false;

  await db.update(authCodes).set({ consumedAt: Date.now() }).where(eq(authCodes.id, pending.id)).run();
  return true;
}
