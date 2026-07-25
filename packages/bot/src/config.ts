import "dotenv/config";

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
  dbPath: process.env.DB_PATH ?? "./data/app.db",
} as const;
