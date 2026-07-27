import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { beforeAll, beforeEach } from "vitest";

// config.ts loads the same root .env lazily on its own import, but the
// ANTHROPIC_API_KEY check below runs before that import happens, so load it
// here too.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Must run before any app module (config.js etc.) is imported by a test file,
// so db/index.ts opens this throwaway file instead of the real production DB.
// Vitest guarantees setupFiles execute before a test file's own imports are
// resolved.
const tmpDir = mkdtempSync(path.join(tmpdir(), "wa-bot-eval-"));
process.env.DB_PATH = path.join(tmpDir, "eval.db");

// These aren't used by runAgent/tool execution, only required by config.ts's
// requireEnv() so the module doesn't throw on import.
process.env.OPENAI_API_KEY ??= "eval-placeholder";
process.env.ALLOWED_PHONES ??= "00000000000";
process.env.WHATSAPP_SESSIONS ??= "eval";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error(
    "ANTHROPIC_API_KEY es necesaria para correr los evals (llaman a la API real de Anthropic, " +
      "incluido el juez). Defínela en .env o en el entorno antes de ejecutar `npm run eval`.",
  );
}

const { initSchema, resetDb } = await import("./db.js");

beforeAll(() => {
  initSchema();
});

beforeEach(() => {
  resetDb();
});
