import { desc, eq, inArray } from "drizzle-orm";
import { db } from "./index.js";
import { conversationMessages } from "./schema.js";

export type ConversationRole = "user" | "assistant";

export interface ConversationTurn {
  role: ConversationRole;
  content: string;
}

// A gap longer than this between two messages from the same user is treated
// as the start of a new, unrelated conversation (e.g. a workout planned in
// the morning and logged in the afternoon still counts as one session; a
// message the next day does not) — older turns are simply not replayed.
const IDLE_WINDOW_MS = 12 * 60 * 60 * 1000;

// Upper bound on how many turns can be replayed even within an active
// session, so a very chatty day doesn't grow the prompt unbounded.
const MAX_HISTORY_TURNS = 40;

// Cap on how many turns we retain per user regardless of the idle window, so
// the table can't grow unbounded over a long-running process.
const MAX_STORED_TURNS_PER_USER = 200;

export async function getConversationHistory(userId: number): Promise<ConversationTurn[]> {
  const rows = await db
    .select({
      role: conversationMessages.role,
      content: conversationMessages.content,
      createdAt: conversationMessages.createdAt,
    })
    .from(conversationMessages)
    .where(eq(conversationMessages.userId, userId))
    .orderBy(desc(conversationMessages.id))
    .limit(MAX_HISTORY_TURNS)
    .all();

  const [newest, ...rest] = rows;
  if (!newest) return [];

  // Rows come back newest-first. Walk toward older rows and stop at the
  // first gap wider than the idle window — everything before that belongs
  // to a previous, unrelated conversation.
  const session = [newest];
  let last = newest;
  for (const row of rest) {
    const gap = last.createdAt - row.createdAt;
    if (gap > IDLE_WINDOW_MS) break;
    session.push(row);
    last = row;
  }

  return session.reverse().map((row) => ({ role: row.role as ConversationRole, content: row.content }));
}

export async function appendConversationTurn(
  userId: number,
  role: ConversationRole,
  content: string,
): Promise<void> {
  await db.insert(conversationMessages).values({ userId, role, content, createdAt: Date.now() }).run();
  await pruneOldTurns(userId);
}

async function pruneOldTurns(userId: number): Promise<void> {
  // SQLite rejects a bare OFFSET without LIMIT, so the cutoff is applied in
  // JS instead — the row count per user is capped at MAX_STORED_TURNS_PER_USER
  // anyway, so fetching all ids here stays cheap.
  const rows = await db
    .select({ id: conversationMessages.id })
    .from(conversationMessages)
    .where(eq(conversationMessages.userId, userId))
    .orderBy(desc(conversationMessages.id))
    .all();
  const stale = rows.slice(MAX_STORED_TURNS_PER_USER);
  if (stale.length === 0) return;

  await db
    .delete(conversationMessages)
    .where(
      inArray(
        conversationMessages.id,
        stale.map((row) => row.id),
      ),
    )
    .run();
}
