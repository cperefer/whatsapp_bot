import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "../../bot/src/db/schema.js";
import { createAuthRouter } from "./auth/routes.js";

export interface ApiDeps {
  db: BetterSQLite3Database<typeof schema>;
  // Injected rather than imported directly so tests can stub WhatsApp
  // delivery without a live Baileys session.
  sendSelfMessage: (phone: string, text: string) => Promise<boolean>;
  allowedPhones: string[];
}

export function createApp(deps: ApiDeps): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/auth", createAuthRouter(deps));

  return app;
}
