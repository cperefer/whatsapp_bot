import { Router } from "express";
import type { ApiDeps } from "../app.js";
import { parseLimit } from "../shared/query.js";
import { getActivitySession, getActivityWeekSummary, listActivitySessions } from "./queries.js";

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

  // Must come after /week-summary — otherwise that literal path would match
  // this :id param first and 400 as an invalid id.
  router.get("/:id", async (req, res) => {
    const sessionId = Number(req.params.id);
    if (!Number.isInteger(sessionId)) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }

    const session = await getActivitySession(deps.db, req.user!.id, sessionId);
    if (!session) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.status(200).json({ session });
  });

  return router;
}
