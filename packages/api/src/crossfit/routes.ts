import { Router } from "express";
import type { ApiDeps } from "../app.js";
import { parseLimit } from "../shared/query.js";
import {
  getCrossfitSession,
  getCrossfitWeekSummary,
  getExerciseHistory,
  listCrossfitPrs,
  listCrossfitSessions,
} from "./queries.js";

export function createCrossfitRouter(deps: ApiDeps): Router {
  const router = Router();

  router.get("/sessions", async (req, res) => {
    const limit = parseLimit(req.query.limit, 50);
    const sessions = await listCrossfitSessions(deps.db, req.user!.id, limit);
    res.status(200).json({ sessions });
  });

  router.get("/sessions/:id", async (req, res) => {
    const sessionId = Number(req.params.id);
    if (!Number.isInteger(sessionId)) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }

    const session = await getCrossfitSession(deps.db, req.user!.id, sessionId);
    if (!session) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.status(200).json({ session });
  });

  router.get("/week-summary", async (req, res) => {
    const sessions = await getCrossfitWeekSummary(deps.db, req.user!.id);
    res.status(200).json({ sessions });
  });

  router.get("/exercises/:name/history", async (req, res) => {
    const history = await getExerciseHistory(deps.db, req.user!.id, req.params.name!);
    res.status(200).json({ history });
  });

  router.get("/prs", async (req, res) => {
    const prs = await listCrossfitPrs(deps.db, req.user!.id);
    res.status(200).json({ prs });
  });

  return router;
}
