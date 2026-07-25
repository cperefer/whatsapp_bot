import type Anthropic from "@anthropic-ai/sdk";

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
