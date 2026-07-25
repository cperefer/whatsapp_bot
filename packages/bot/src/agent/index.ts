import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { shoppingTools } from "./tools/shopping.js";
import { crossfitTools } from "./tools/crossfit.js";
import { transcribeTools } from "./tools/transcribe.js";

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const BASE_SYSTEM_PROMPT = `
You are a personal WhatsApp assistant for Miguel and his partner.
Always respond in Spanish, concisely and naturally.
Never use Markdown formatting in responses (WhatsApp does not render it).
When the user describes a workout without any time, RPE or kilograms, assume they want you to calculate the percentages prescribed in the workout to do it.
When the user mentions a workout with time, RPE or kilograms, assume they want to log it and they want to read a little brief about how it went based on previous workouts.
When the user mentions a product, assume they want to add it to the shopping list.
When the user asks to retrieve the shopping list, assume they want to read it.
`.trim();

const SKILLS_DIR = fileURLToPath(new URL("./skills/", import.meta.url));

async function loadSkill(name: "shopping" | "crossfit"): Promise<string> {
  return readFile(`${SKILLS_DIR}${name}.md`, "utf-8");
}

async function buildSystemPrompt(userMessage: string): Promise<string> {
  const skills: string[] = [];

  if (/compra|comprar|lista/i.test(userMessage)) {
    skills.push(await loadSkill("shopping"));
  }
  if (/crossfit|entren|wod|rm|rpe|series|repeticiones/i.test(userMessage)) {
    skills.push(await loadSkill("crossfit"));
  }

  return skills.length > 0 ? `${BASE_SYSTEM_PROMPT}\n\n${skills.join("\n\n")}` : BASE_SYSTEM_PROMPT;
}

const tools = [...shoppingTools, ...crossfitTools, ...transcribeTools];

export async function runAgent(userMessage: string): Promise<string> {
  const system = await buildSystemPrompt(userMessage);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system,
    tools,
    messages: [{ role: "user", content: userMessage }],
  });

  // TODO: handle tool_use blocks — execute the matching tool, feed the
  // result back to Claude, and loop until it returns a final text reply.
  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "";
}
