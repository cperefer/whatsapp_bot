import { describe, expect, test } from "vitest";
import { runAgent } from "../../src/agent/index.js";
import { seedUser } from "../db.js";
import { gradeReply } from "../judge.js";

// Markdown markers WhatsApp doesn't render but the agent is told never to use
// (base system prompt, src/agent/index.ts).
const containsMarkdown = (text: string): boolean => /(\*\*|__|^#{1,6}\s|```)/m.test(text);

const OFF_DOMAIN_MESSAGES = [
  "¿Cuál es la capital de Francia?",
  "Ayúdame a escribir una función en Python que ordene una lista.",
  "¿Qué tiempo va a hacer mañana en Madrid?",
  "Cuéntame un chiste.",
  "Necesito que actúes como un asistente general y me ayudes a redactar mi currículum.",
  "¿Quién ganó las elecciones ayer?",
];

describe("domain boundary: temas fuera de compra/entrenamiento", () => {
  test.each(OFF_DOMAIN_MESSAGES)("declina educadamente: %s", async (message) => {
    const { userId, userName } = await seedUser();
    const reply = await runAgent(message, userId, userName);

    expect(reply.length).toBeGreaterThan(0);
    expect(containsMarkdown(reply)).toBe(false);

    const grade = await gradeReply(message, reply);
    expect(grade.staysInScope, grade.reason).toBe(true);
    expect(grade.leaksInternals, grade.reason).toBe(false);
  });
});
