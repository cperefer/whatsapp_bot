import type Anthropic from "@anthropic-ai/sdk";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { crossfitExercises, crossfitSessions } from "../../db/schema.js";

export const crossfitTools: Anthropic.Tool[] = [
  {
    name: "log_session",
    description: "Log a CrossFit training session with its exercises.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string" },
        notes: { type: "string" },
        rpe: { type: "string" },
        exercises: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              sets: { type: "number" },
              reps: { type: "number" },
              weightKg: { type: "number" },
            },
            required: ["name", "sets", "reps", "weightKg"],
          },
        },
      },
      required: ["date", "exercises"],
    },
  },
  {
    name: "get_week_summary",
    description: "Get a summary of training sessions from the current week.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_exercise_history",
    description: "Get the historical progression of a specific exercise.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    },
  },
];

const crossfitToolNames = new Set(crossfitTools.map((tool) => tool.name));

export function isCrossfitTool(name: string): boolean {
  return crossfitToolNames.has(name);
}

interface ExerciseInput {
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
}

export async function executeCrossfitTool(
  name: string,
  input: Record<string, unknown>,
  userId: number,
): Promise<unknown> {
  switch (name) {
    case "log_session": {
      const date = String(input.date);
      const notes = typeof input.notes === "string" ? input.notes : null;
      const rpe = typeof input.rpe === "string" ? input.rpe : null;
      const exercises = (input.exercises as ExerciseInput[] | undefined) ?? [];

      const session = await db
        .insert(crossfitSessions)
        .values({ userId, date, notes, rpe, createdAt: Date.now() })
        .returning({ id: crossfitSessions.id })
        .get();

      for (const exercise of exercises) {
        await db.insert(crossfitExercises).values({
          sessionId: session.id,
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          weightKg: exercise.weightKg,
        });
      }

      return { ok: true, sessionId: session.id };
    }
    case "get_week_summary": {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const sessions = await db
        .select()
        .from(crossfitSessions)
        .where(and(eq(crossfitSessions.userId, userId), gte(crossfitSessions.createdAt, weekAgo)))
        .orderBy(desc(crossfitSessions.date));

      const result = [];
      for (const session of sessions) {
        const exercises = await db
          .select()
          .from(crossfitExercises)
          .where(eq(crossfitExercises.sessionId, session.id));
        result.push({
          date: session.date,
          notes: session.notes,
          rpe: session.rpe,
          exercises: exercises.map((e) => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            weightKg: e.weightKg,
          })),
        });
      }
      return result;
    }
    case "get_exercise_history": {
      const exerciseName = String(input.name);
      const rows = await db
        .select({
          date: crossfitSessions.date,
          sets: crossfitExercises.sets,
          reps: crossfitExercises.reps,
          weightKg: crossfitExercises.weightKg,
        })
        .from(crossfitExercises)
        .innerJoin(crossfitSessions, eq(crossfitExercises.sessionId, crossfitSessions.id))
        .where(and(eq(crossfitSessions.userId, userId), eq(crossfitExercises.name, exerciseName)))
        .orderBy(asc(crossfitSessions.date));

      return rows;
    }
    default:
      throw new Error(`Unknown crossfit tool: ${name}`);
  }
}
