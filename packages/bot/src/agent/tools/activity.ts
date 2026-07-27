import type Anthropic from "@anthropic-ai/sdk";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { activitySessions } from "../../db/schema.js";

export const activityTools: Anthropic.Tool[] = [
  {
    name: "log_activity",
    description:
      "Log a cardio/sport session other than CrossFit (running, cycling, swimming, hiking...).",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", description: "e.g. running, cycling, swimming, hiking" },
        date: { type: "string" },
        distanceKm: { type: "number" },
        durationSeconds: { type: "number" },
        pace: { type: "string", description: "e.g. '5:30/km'" },
        notes: { type: "string" },
        rpe: { type: "string" },
      },
      required: ["type", "date"],
    },
  },
  {
    name: "get_activity_history",
    description: "Get the historical sessions for a given activity type (e.g. running).",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string" },
      },
      required: ["type"],
    },
  },
  {
    name: "get_activity_week_summary",
    description: "Get a summary of cardio/other-sport sessions from the current week.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
];

const activityToolNames = new Set(activityTools.map((tool) => tool.name));

export function isActivityTool(name: string): boolean {
  return activityToolNames.has(name);
}

export async function executeActivityTool(
  name: string,
  input: Record<string, unknown>,
  userId: number,
): Promise<unknown> {
  switch (name) {
    case "log_activity": {
      const type = String(input.type);
      const date = String(input.date);
      const distanceKm = typeof input.distanceKm === "number" ? input.distanceKm : null;
      const durationSeconds =
        typeof input.durationSeconds === "number" ? input.durationSeconds : null;
      const pace = typeof input.pace === "string" ? input.pace : null;
      const notes = typeof input.notes === "string" ? input.notes : null;
      const rpe = typeof input.rpe === "string" ? input.rpe : null;

      const session = await db
        .insert(activitySessions)
        .values({
          userId,
          type,
          date,
          distanceKm,
          durationSeconds,
          pace,
          notes,
          rpe,
          createdAt: Date.now(),
        })
        .returning({ id: activitySessions.id })
        .get();

      return { ok: true, sessionId: session.id };
    }
    case "get_activity_history": {
      const type = String(input.type);
      const rows = await db
        .select({
          date: activitySessions.date,
          distanceKm: activitySessions.distanceKm,
          durationSeconds: activitySessions.durationSeconds,
          pace: activitySessions.pace,
          notes: activitySessions.notes,
          rpe: activitySessions.rpe,
        })
        .from(activitySessions)
        .where(and(eq(activitySessions.userId, userId), eq(activitySessions.type, type)))
        .orderBy(asc(activitySessions.date));
      return rows;
    }
    case "get_activity_week_summary": {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const rows = await db
        .select({
          type: activitySessions.type,
          date: activitySessions.date,
          distanceKm: activitySessions.distanceKm,
          durationSeconds: activitySessions.durationSeconds,
          pace: activitySessions.pace,
          notes: activitySessions.notes,
          rpe: activitySessions.rpe,
        })
        .from(activitySessions)
        .where(
          and(eq(activitySessions.userId, userId), gte(activitySessions.createdAt, weekAgo)),
        )
        .orderBy(desc(activitySessions.date));
      return rows;
    }
    default:
      throw new Error(`Unknown activity tool: ${name}`);
  }
}
