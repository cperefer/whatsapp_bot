import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// Neither Anthropic nor OpenAI expose a public "remaining balance" endpoint,
// so we can't proactively check credit before it runs out. Instead we
// recognize the specific error each API returns once the balance is
// effectively exhausted and surface it to the user at that point.
export function describeCreditError(error: unknown): string | undefined {
  if (error instanceof Anthropic.APIError && /credit balance/i.test(error.message)) {
    return "⚠️ _El crédito de Anthropic se ha agotado. Las respuestas del asistente fallarán hasta que recargues saldo en console.anthropic.com._";
  }

  if (
    error instanceof OpenAI.APIError &&
    (error.code === "insufficient_quota" || /quota/i.test(error.message))
  ) {
    return "⚠️ _El crédito de OpenAI se ha agotado. La transcripción de audios fallará hasta que recargues saldo en platform.openai.com._";
  }

  return undefined;
}
