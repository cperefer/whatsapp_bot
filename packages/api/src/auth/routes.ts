import { Router } from "express";
import { eq } from "drizzle-orm";
import { users } from "../../../bot/src/db/schema.js";
import type { ApiDeps } from "../app.js";
import { createOtp, isRateLimited, verifyOtp } from "./otp.js";
import { createSession, deleteSession } from "./session.js";
import { requireAuth, SESSION_COOKIE } from "./middleware.js";

const SESSION_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function createAuthRouter(deps: ApiDeps): Router {
  const router = Router();

  router.post("/request-otp", async (req, res) => {
    const phone = readString(req.body?.phone);

    // Always answer 200 regardless of whether the phone is whitelisted/known,
    // so this endpoint can't be used to enumerate registered numbers.
    if (!deps.allowedPhones.includes(phone)) {
      res.status(200).json({ ok: true });
      return;
    }

    const user = await deps.db.select().from(users).where(eq(users.phone, phone)).get();
    if (!user) {
      res.status(200).json({ ok: true });
      return;
    }

    if (await isRateLimited(deps.db, user.id)) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }

    const code = await createOtp(deps.db, user.id);
    const sent = await deps.sendSelfMessage(
      phone,
      `🔐 Tu código de acceso al dashboard es *${code}*. Caduca en 5 minutos.`,
    );
    if (!sent) {
      res.status(503).json({ error: "whatsapp_unavailable" });
      return;
    }

    res.status(200).json({ ok: true });
  });

  router.post("/verify-otp", async (req, res) => {
    const phone = readString(req.body?.phone);
    const code = readString(req.body?.code);

    const user = await deps.db.select().from(users).where(eq(users.phone, phone)).get();
    if (!user || !(await verifyOtp(deps.db, user.id, code))) {
      res.status(401).json({ error: "invalid_code" });
      return;
    }

    const session = await createSession(deps.db, user.id, req.headers["user-agent"]);
    res.cookie(SESSION_COOKIE, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
    });
    res.status(200).json({ user: { id: user.id, name: user.name, phone: user.phone } });
  });

  router.get("/me", requireAuth(deps), (req, res) => {
    res.status(200).json({ user: req.user });
  });

  router.post("/logout", async (req, res) => {
    const sessionId = req.cookies?.[SESSION_COOKIE];
    if (typeof sessionId === "string") {
      await deleteSession(deps.db, sessionId);
    }
    res.clearCookie(SESSION_COOKIE);
    res.status(200).json({ ok: true });
  });

  return router;
}
