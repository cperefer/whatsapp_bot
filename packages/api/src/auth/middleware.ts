import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ApiDeps } from "../app.js";
import { getSessionUser, type SessionUser } from "./session.js";

export const SESSION_COOKIE = "session_id";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export function requireAuth(deps: ApiDeps): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const sessionId = req.cookies?.[SESSION_COOKIE];
    if (typeof sessionId !== "string") {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const user = await getSessionUser(deps.db, sessionId);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    req.user = user;
    next();
  };
}
