import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { crossfitExercises, crossfitPrs, crossfitSessions, users } from "../../bot/src/db/schema.js";
import { createApp, type ApiDeps } from "../src/app.js";
import { createFakeSender, createTestDb } from "./testDb.js";
import { loginAndGetCookie } from "./testAuth.js";

const PHONE = "34612345678";
const OTHER_PHONE = "34698765432";

describe("crossfit endpoints", () => {
  let db: ApiDeps["db"];
  let app: ReturnType<typeof createApp>;
  let cookie: string;
  let userId: number;
  let otherUserId: number;

  beforeEach(async () => {
    db = createTestDb();
    const { sendSelfMessage, sentMessages } = createFakeSender();
    app = createApp({ db, sendSelfMessage, allowedPhones: [PHONE, OTHER_PHONE] });

    const user = await db
      .insert(users)
      .values({ phone: PHONE, name: "Miguel", createdAt: Date.now() })
      .returning({ id: users.id })
      .get();
    userId = user.id;

    const other = await db
      .insert(users)
      .values({ phone: OTHER_PHONE, name: "Alicia", createdAt: Date.now() })
      .returning({ id: users.id })
      .get();
    otherUserId = other.id;

    cookie = await loginAndGetCookie(app, PHONE, sentMessages);
  });

  it("rejects unauthenticated requests", async () => {
    await request(app).get("/api/crossfit/sessions").expect(401);
  });

  it("lists sessions with nested exercises, newest first", async () => {
    const older = await db
      .insert(crossfitSessions)
      .values({ userId, date: "2026-07-20", rpe: "7", createdAt: Date.now() - 100_000 })
      .returning({ id: crossfitSessions.id })
      .get();
    await db
      .insert(crossfitExercises)
      .values({ sessionId: older.id, name: "bench press", sets: 3, reps: 5, weightKg: 80 })
      .run();
    await db
      .insert(crossfitSessions)
      .values({ userId, date: "2026-07-27", notes: "felt strong", createdAt: Date.now() })
      .run();

    const res = await request(app).get("/api/crossfit/sessions").set("Cookie", cookie).expect(200);

    expect(res.body.sessions).toHaveLength(2);
    expect(res.body.sessions[0].date).toBe("2026-07-27");
    expect(res.body.sessions[1].exercises).toEqual([
      expect.objectContaining({ name: "bench press", sets: 3, reps: 5, weightKg: 80 }),
    ]);
  });

  it("does not leak another user's sessions", async () => {
    await db.insert(crossfitSessions).values({ userId: otherUserId, date: "2026-07-27", createdAt: Date.now() }).run();

    const res = await request(app).get("/api/crossfit/sessions").set("Cookie", cookie).expect(200);
    expect(res.body.sessions).toHaveLength(0);
  });

  it("gets a single session by id, scoped to the owner", async () => {
    const session = await db
      .insert(crossfitSessions)
      .values({ userId, date: "2026-07-27", createdAt: Date.now() })
      .returning({ id: crossfitSessions.id })
      .get();
    const otherSession = await db
      .insert(crossfitSessions)
      .values({ userId: otherUserId, date: "2026-07-27", createdAt: Date.now() })
      .returning({ id: crossfitSessions.id })
      .get();

    const res = await request(app).get(`/api/crossfit/sessions/${session.id}`).set("Cookie", cookie).expect(200);
    expect(res.body.session.id).toBe(session.id);

    await request(app).get(`/api/crossfit/sessions/${otherSession.id}`).set("Cookie", cookie).expect(404);
  });

  it("returns 404 for a non-existent session id", async () => {
    await request(app).get("/api/crossfit/sessions/999999").set("Cookie", cookie).expect(404);
  });

  it("returns 400 for a non-numeric session id", async () => {
    await request(app).get("/api/crossfit/sessions/abc").set("Cookie", cookie).expect(400);
  });

  it("returns exercise progression history in ascending date order", async () => {
    const s1 = await db
      .insert(crossfitSessions)
      .values({ userId, date: "2026-07-10", createdAt: Date.now() })
      .returning({ id: crossfitSessions.id })
      .get();
    const s2 = await db
      .insert(crossfitSessions)
      .values({ userId, date: "2026-07-20", createdAt: Date.now() })
      .returning({ id: crossfitSessions.id })
      .get();
    await db.insert(crossfitExercises).values({ sessionId: s2.id, name: "squat", sets: 5, reps: 5, weightKg: 100 }).run();
    await db.insert(crossfitExercises).values({ sessionId: s1.id, name: "squat", sets: 5, reps: 5, weightKg: 90 }).run();

    const res = await request(app).get("/api/crossfit/exercises/squat/history").set("Cookie", cookie).expect(200);

    expect(res.body.history).toEqual([
      expect.objectContaining({ date: "2026-07-10", weightKg: 90 }),
      expect.objectContaining({ date: "2026-07-20", weightKg: 100 }),
    ]);
  });

  it("lists PRs sorted by name", async () => {
    await db.insert(crossfitPrs).values({ userId, name: "deadlift", reps: 1, result: 150, unit: "kg" }).run();
    await db.insert(crossfitPrs).values({ userId, name: "back squat", reps: 1, result: 120, unit: "kg" }).run();

    const res = await request(app).get("/api/crossfit/prs").set("Cookie", cookie).expect(200);
    expect(res.body.prs.map((pr: { name: string }) => pr.name)).toEqual(["back squat", "deadlift"]);
  });

  it("only returns sessions from the last 7 days in the week summary", async () => {
    await db
      .insert(crossfitSessions)
      .values({ userId, date: "2020-01-01", createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000 })
      .run();
    await db.insert(crossfitSessions).values({ userId, date: "2026-07-28", createdAt: Date.now() }).run();

    const res = await request(app).get("/api/crossfit/week-summary").set("Cookie", cookie).expect(200);
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.sessions[0].date).toBe("2026-07-28");
  });
});
