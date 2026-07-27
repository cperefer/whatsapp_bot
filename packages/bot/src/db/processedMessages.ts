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
  // SQLite rejects a bare OFFSET without LIMIT, so the cutoff is applied in
  // JS instead — the row count per session is capped at MAX_TRACKED_MESSAGE_IDS
  // anyway, so fetching all ids here stays cheap.
  const rows = await db
    .select({ id: processedMessages.id })
    .from(processedMessages)
    .where(eq(processedMessages.sessionName, sessionName))
    .orderBy(desc(processedMessages.id))
    .all();
  const stale = rows.slice(MAX_TRACKED_MESSAGE_IDS);
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
