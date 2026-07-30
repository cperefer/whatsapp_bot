import { Router } from "express";
import type { ApiDeps } from "../app.js";
import { parseLimit } from "../shared/query.js";
import { getActivityWeekSummary, listActivitySessions } from "./queries.js";

export function createActivityRouter(deps: ApiDeps): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const limit = parseLimit(req.query.limit, 50);
    const sessions = await listActivitySessions(deps.db, req.user!.id, type, limit);
    res.status(200).json({ sessions });
  });

  router.get("/week-summary", async (req, res) => {
    const sessions = await getActivityWeekSummary(deps.db, req.user!.id);
    res.status(200).json({ sessions });
  });

  return router;
}
