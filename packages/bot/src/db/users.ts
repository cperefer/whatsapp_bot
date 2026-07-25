import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { users } from "./schema.js";

export async function getOrCreateUser(phone: string, name: string): Promise<number> {
  const existing = await db.select().from(users).where(eq(users.phone, phone)).get();
  if (existing) return existing.id;

  const inserted = await db
    .insert(users)
    .values({ phone, name, createdAt: Date.now() })
    .returning({ id: users.id })
    .get();

  return inserted.id;
}
