import { and, desc, eq, gte } from "drizzle-orm";
import { activitySessions } from "../../../bot/src/db/schema.js";
import type { ApiDeps } from "../app.js";

export async function listActivitySessions(
  db: ApiDeps["db"],
  userId: number,
  type: string | undefined,
  limit: number,
): Promise<Array<typeof activitySessions.$inferSelect>> {
  const condition = type
    ? and(eq(activitySessions.userId, userId), eq(activitySessions.type, type))
    : eq(activitySessions.userId, userId);

  return db
    .select()
    .from(activitySessions)
    .where(condition)
    .orderBy(desc(activitySessions.date), desc(activitySessions.id))
    .limit(limit)
    .all();
}

export async function getActivityWeekSummary(
  db: ApiDeps["db"],
  userId: number,
): Promise<Array<typeof activitySessions.$inferSelect>> {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return db
    .select()
    .from(activitySessions)
    .where(and(eq(activitySessions.userId, userId), gte(activitySessions.createdAt, weekAgo)))
    .orderBy(desc(activitySessions.date))
    .all();
}
