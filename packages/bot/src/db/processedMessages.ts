import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "./index.js";
import { processedMessages } from "./schema.js";

// Cap on how many message ids we retain per session, so the table can't grow
// unbounded over a long-running process.
const MAX_TRACKED_MESSAGE_IDS = 500;

export async function wasMessageProcessed(sessionName: string, messageId: string): Promise<boolean> {
  const existing = await db
    .select({ id: processedMessages.id })
    .from(processedMessages)
    .where(and(eq(processedMessages.sessionName, sessionName), eq(processedMessages.messageId, messageId)))
    .get();
  return existing !== undefined;
}

export async function markMessageProcessed(sessionName: string, messageId: string): Promise<void> {
  await db
    .insert(processedMessages)
    .values({ sessionName, messageId, processedAt: Date.now() })
    .onConflictDoNothing()
    .run();

  await pruneOldMessages(sessionName);
}

async function pruneOldMessages(sessionName: string): Promise<void> {
  const stale = await db
    .select({ id: processedMessages.id })
    .from(processedMessages)
    .where(eq(processedMessages.sessionName, sessionName))
    .orderBy(desc(processedMessages.id))
    .offset(MAX_TRACKED_MESSAGE_IDS)
    .all();
  if (stale.length === 0) return;

  await db
    .delete(processedMessages)
    .where(
      inArray(
        processedMessages.id,
        stale.map((row) => row.id),
      ),
    )
    .run();
}
