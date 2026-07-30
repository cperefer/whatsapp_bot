import { and, asc, desc, eq, gte } from "drizzle-orm";
import { crossfitExercises, crossfitPrs, crossfitSessions } from "../../../bot/src/db/schema.js";
import type { ApiDeps } from "../app.js";

export interface CrossfitExercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
}

export interface CrossfitSession {
  id: number;
  date: string;
  notes: string | null;
  rpe: string | null;
  createdAt: number;
  exercises: CrossfitExercise[];
}

async function attachExercises(db: ApiDeps["db"], session: typeof crossfitSessions.$inferSelect): Promise<CrossfitSession> {
  const exercises = await db
    .select()
    .from(crossfitExercises)
    .where(eq(crossfitExercises.sessionId, session.id))
    .all();
  return { ...session, exercises };
}

export async function listCrossfitSessions(
  db: ApiDeps["db"],
  userId: number,
  limit: number,
): Promise<CrossfitSession[]> {
  const sessionRows = await db
    .select()
    .from(crossfitSessions)
    .where(eq(crossfitSessions.userId, userId))
    .orderBy(desc(crossfitSessions.date), desc(crossfitSessions.id))
    .limit(limit)
    .all();

  const sessions: CrossfitSession[] = [];
  for (const session of sessionRows) {
    sessions.push(await attachExercises(db, session));
  }
  return sessions;
}

export async function getCrossfitSession(
  db: ApiDeps["db"],
  userId: number,
  sessionId: number,
): Promise<CrossfitSession | null> {
  const session = await db
    .select()
    .from(crossfitSessions)
    .where(and(eq(crossfitSessions.id, sessionId), eq(crossfitSessions.userId, userId)))
    .get();
  if (!session) return null;
  return attachExercises(db, session);
}

export async function getCrossfitWeekSummary(db: ApiDeps["db"], userId: number): Promise<CrossfitSession[]> {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const sessionRows = await db
    .select()
    .from(crossfitSessions)
    .where(and(eq(crossfitSessions.userId, userId), gte(crossfitSessions.createdAt, weekAgo)))
    .orderBy(desc(crossfitSessions.date))
    .all();

  const sessions: CrossfitSession[] = [];
  for (const session of sessionRows) {
    sessions.push(await attachExercises(db, session));
  }
  return sessions;
}

export async function getExerciseHistory(
  db: ApiDeps["db"],
  userId: number,
  exerciseName: string,
): Promise<Array<{ date: string; sets: number; reps: number; weightKg: number }>> {
  return db
    .select({
      date: crossfitSessions.date,
      sets: crossfitExercises.sets,
      reps: crossfitExercises.reps,
      weightKg: crossfitExercises.weightKg,
    })
    .from(crossfitExercises)
    .innerJoin(crossfitSessions, eq(crossfitExercises.sessionId, crossfitSessions.id))
    .where(and(eq(crossfitSessions.userId, userId), eq(crossfitExercises.name, exerciseName)))
    .orderBy(asc(crossfitSessions.date))
    .all();
}

export async function listCrossfitPrs(
  db: ApiDeps["db"],
  userId: number,
): Promise<Array<{ name: string; reps: number; result: number; unit: string }>> {
  return db
    .select({
      name: crossfitPrs.name,
      reps: crossfitPrs.reps,
      result: crossfitPrs.result,
      unit: crossfitPrs.unit,
    })
    .from(crossfitPrs)
    .where(eq(crossfitPrs.userId, userId))
    .orderBy(asc(crossfitPrs.name))
    .all();
}
