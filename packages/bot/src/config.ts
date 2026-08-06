import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  anthropicApiKey: requireEnv("ANTHROPIC_API_KEY"),
  openaiApiKey: requireEnv("OPENAI_API_KEY"),
  allowedPhones: requireEnv("ALLOWED_PHONES")
    .split(",")
    .map((phone) => phone.trim()),
  whatsappSessions: requireEnv("WHATSAPP_SESSIONS")
    .split(",")
    .map((session) => session.trim()),
  dbPath: process.env.DB_PATH ?? "./data/app.db",
  isProduction: process.env.NODE_ENV === "production",
  // Browsers drop a Secure cookie outright over plain HTTP, so login can't
  // persist a session until TLS is in front of the app. Defaults to
  // isProduction, but COOKIE_SECURE=false lets a VPS without a domain/TLS
  // yet be tested over plain HTTP without permanently weakening prod.
  cookieSecure:
    process.env.COOKIE_SECURE != null
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production",
} as const;
