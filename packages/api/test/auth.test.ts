import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { sessions, users } from "../../bot/src/db/schema.js";
import { createApp, type ApiDeps } from "../src/app.js";
import { createFakeSender, createTestDb, extractOtpCode } from "./testDb.js";

const ALLOWED_PHONE = "34612345678";
const OTHER_ALLOWED_PHONE = "34698765432";

describe("auth flow", () => {
  let db: ApiDeps["db"];
  let sentMessages: Array<{ phone: string; text: string }>;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = createTestDb();
    const fakeSender = createFakeSender();
    sentMessages = fakeSender.sentMessages;
    app = createApp({
      db,
      sendSelfMessage: fakeSender.sendSelfMessage,
      allowedPhones: [ALLOWED_PHONE, OTHER_ALLOWED_PHONE],
    });

    await db.insert(users).values({ phone: ALLOWED_PHONE, name: "Miguel", createdAt: Date.now() }).run();
  });

  describe("POST /api/auth/request-otp", () => {
    it("sends a code over WhatsApp for a known, whitelisted phone", async () => {
      await request(app).post("/api/auth/request-otp").send({ phone: ALLOWED_PHONE }).expect(200);

      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0]?.phone).toBe(ALLOWED_PHONE);
      expect(sentMessages[0]?.text).toMatch(/\d{6}/);
    });

    it("responds 200 without sending anything for a non-whitelisted phone", async () => {
      const res = await request(app).post("/api/auth/request-otp").send({ phone: "34600000000" });

      expect(res.status).toBe(200);
      expect(sentMessages).toHaveLength(0);
    });

    it("responds 200 without sending anything for a whitelisted phone with no user row yet", async () => {
      const res = await request(app).post("/api/auth/request-otp").send({ phone: OTHER_ALLOWED_PHONE });

      expect(res.status).toBe(200);
      expect(sentMessages).toHaveLength(0);
    });

    it("returns 503 when WhatsApp delivery is unavailable", async () => {
      const brokenApp = createApp({
        db,
        sendSelfMessage: async () => false,
        allowedPhones: [ALLOWED_PHONE],
      });

      const res = await request(brokenApp).post("/api/auth/request-otp").send({ phone: ALLOWED_PHONE });
      expect(res.status).toBe(503);
    });

    it("rate-limits repeated requests for the same phone", async () => {
      for (let i = 0; i < 3; i++) {
        await request(app).post("/api/auth/request-otp").send({ phone: ALLOWED_PHONE }).expect(200);
      }

      const res = await request(app).post("/api/auth/request-otp").send({ phone: ALLOWED_PHONE });
      expect(res.status).toBe(429);
      expect(sentMessages).toHaveLength(3);
    });

    it("invalidates a previously sent code once a new one is requested", async () => {
      await request(app).post("/api/auth/request-otp").send({ phone: ALLOWED_PHONE }).expect(200);
      const firstCode = extractOtpCode(sentMessages[0]!.text);

      await request(app).post("/api/auth/request-otp").send({ phone: ALLOWED_PHONE }).expect(200);

      const res = await request(app)
        .post("/api/auth/verify-otp")
        .send({ phone: ALLOWED_PHONE, code: firstCode });
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/verify-otp", () => {
    it("logs in with the correct code and sets a session cookie", async () => {
      await request(app).post("/api/auth/request-otp").send({ phone: ALLOWED_PHONE }).expect(200);
      const code = extractOtpCode(sentMessages[0]!.text);

      const res = await request(app).post("/api/auth/verify-otp").send({ phone: ALLOWED_PHONE, code });

      expect(res.status).toBe(200);
      expect(res.body.user.phone).toBe(ALLOWED_PHONE);
      expect(res.headers["set-cookie"]?.[0]).toMatch(/session_id=/);
      expect(res.headers["set-cookie"]?.[0]).toMatch(/HttpOnly/);
    });

    it("rejects an incorrect code", async () => {
      await request(app).post("/api/auth/request-otp").send({ phone: ALLOWED_PHONE }).expect(200);

      const res = await request(app)
        .post("/api/auth/verify-otp")
        .send({ phone: ALLOWED_PHONE, code: "000000" });
      expect(res.status).toBe(401);
    });

    it("rejects reusing an already-consumed code", async () => {
      await request(app).post("/api/auth/request-otp").send({ phone: ALLOWED_PHONE }).expect(200);
      const code = extractOtpCode(sentMessages[0]!.text);

      await request(app).post("/api/auth/verify-otp").send({ phone: ALLOWED_PHONE, code }).expect(200);
      const res = await request(app).post("/api/auth/verify-otp").send({ phone: ALLOWED_PHONE, code });
      expect(res.status).toBe(401);
    });

    it("locks out the code after 5 wrong attempts, even with the right code", async () => {
      await request(app).post("/api/auth/request-otp").send({ phone: ALLOWED_PHONE }).expect(200);
      const code = extractOtpCode(sentMessages[0]!.text);

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post("/api/auth/verify-otp")
          .send({ phone: ALLOWED_PHONE, code: "000000" });
      }

      const res = await request(app).post("/api/auth/verify-otp").send({ phone: ALLOWED_PHONE, code });
      expect(res.status).toBe(401);
    });

    it("rejects a code for a phone with no user row", async () => {
      const res = await request(app)
        .post("/api/auth/verify-otp")
        .send({ phone: "34600000000", code: "123456" });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("rejects requests without a session cookie", async () => {
      await request(app).get("/api/auth/me").expect(401);
    });

    it("rejects an unknown session id", async () => {
      await request(app).get("/api/auth/me").set("Cookie", "session_id=does-not-exist").expect(401);
    });

    it("rejects an expired session", async () => {
      await request(app).post("/api/auth/request-otp").send({ phone: ALLOWED_PHONE }).expect(200);
      const code = extractOtpCode(sentMessages[0]!.text);
      const verifyRes = await request(app).post("/api/auth/verify-otp").send({ phone: ALLOWED_PHONE, code });
      const cookie = verifyRes.headers["set-cookie"]![0]!;

      await db.update(sessions).set({ expiresAt: Date.now() - 1000 }).where(eq(sessions.userId, 1)).run();

      await request(app).get("/api/auth/me").set("Cookie", cookie).expect(401);
    });

    it("returns the logged-in user for a valid session", async () => {
      await request(app).post("/api/auth/request-otp").send({ phone: ALLOWED_PHONE }).expect(200);
      const code = extractOtpCode(sentMessages[0]!.text);
      const verifyRes = await request(app).post("/api/auth/verify-otp").send({ phone: ALLOWED_PHONE, code });
      const cookie = verifyRes.headers["set-cookie"]![0]!;

      const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe("Miguel");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("clears the session so it can no longer be used", async () => {
      await request(app).post("/api/auth/request-otp").send({ phone: ALLOWED_PHONE }).expect(200);
      const code = extractOtpCode(sentMessages[0]!.text);
      const verifyRes = await request(app).post("/api/auth/verify-otp").send({ phone: ALLOWED_PHONE, code });
      const cookie = verifyRes.headers["set-cookie"]![0]!;

      await request(app).post("/api/auth/logout").set("Cookie", cookie).expect(200);
      await request(app).get("/api/auth/me").set("Cookie", cookie).expect(401);
    });
  });
});
