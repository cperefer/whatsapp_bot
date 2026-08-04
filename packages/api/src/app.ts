import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "../../bot/src/db/schema.js";
import { createAuthRouter } from "./auth/routes.js";
import { requireAuth } from "./auth/middleware.js";
import { createCrossfitRouter } from "./crossfit/routes.js";
import { createActivityRouter } from "./activity/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Anchored to this file's own location, not process.cwd() — a bare relative
// path broke DB_PATH the same way depending on which workspace's npm script
// started the process (bot vs. api have different cwds).
const WEB_DIST = path.resolve(__dirname, "../../web/dist");
const WEB_INDEX = path.join(WEB_DIST, "index.html");

export interface ApiDeps {
  db: BetterSQLite3Database<typeof schema>;
  // Injected rather than imported directly so tests can stub WhatsApp
  // delivery without a live Baileys session.
  sendSelfMessage: (phone: string, text: string) => Promise<boolean>;
  allowedPhones: string[];
  // Optional so existing tests/callers that don't care about this keep working;
  // auth/routes.ts falls back to NODE_ENV when omitted.
  cookieSecure?: boolean;
}

export function createApp(deps: ApiDeps): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/auth", createAuthRouter(deps));
  app.use("/api/crossfit", requireAuth(deps), createCrossfitRouter(deps));
  app.use("/api/activity", requireAuth(deps), createActivityRouter(deps));

  // Any /api/* request that didn't match a route above is a real 404, not a
  // client-side route — answer JSON instead of falling through to the SPA below.
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  // Serves the built dashboard (packages/web/dist) and falls back to its
  // index.html for any other path, so client-side routes like /dashboard
  // survive a direct load or refresh. A harmless no-op in dev, where dist
  // doesn't exist yet — the dev server (Vite) serves the frontend instead.
  app.use(express.static(WEB_DIST));
  app.get("*", (_req, res) => {
    res.sendFile(WEB_INDEX, (err) => {
      if (err) res.status(404).send("Not found");
    });
  });

  return app;
}
