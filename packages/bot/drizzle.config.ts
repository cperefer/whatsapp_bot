import { defineConfig } from "drizzle-kit";
import { config } from "./src/config.js";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: config.dbPath,
  },
});
