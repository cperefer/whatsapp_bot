import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { activitySessions, users } from "../../bot/src/db/schema.js";
import { createApp, type ApiDeps } from "../src/app.js";
import { createFakeSender, createTestDb } from "./testDb.js";
import { loginAndGetCookie } from "./testAuth.js";

const PHONE = "34612345678";
const OTHER_PHONE = "34698765432";

describe("activity endpoints", () => {
  let db: ApiDeps["db"];
  let app: ReturnType<typeof createApp>;
  let cookie: string;
  let userId: number;

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

    cookie = await loginAndGetCookie(app, PHONE, sentMessages);
  });

  it("rejects unauthenticated requests", async () => {
    await request(app).get("/api/activity").expect(401);
  });

  it("lists activity sessions newest first", async () => {
    await db
      .insert(activitySessions)
      .values({ userId, type: "running", date: "2026-07-01", distanceKm: 5, createdAt: Date.now() - 100_000 })
      .run();
    await db
      .insert(activitySessions)
      .values({ userId, type: "cycling", date: "2026-07-20", distanceKm: 30, createdAt: Date.now() })
      .run();

    const res = await request(app).get("/api/activity").set("Cookie", cookie).expect(200);

    expect(res.body.sessions).toHaveLength(2);
    expect(res.body.sessions[0].type).toBe("cycling");
  });

  it("filters by activity type", async () => {
    await db.insert(activitySessions).values({ userId, type: "running", date: "2026-07-01", createdAt: Date.now() }).run();
    await db.insert(activitySessions).values({ userId, type: "cycling", date: "2026-07-02", createdAt: Date.now() }).run();

    const res = await request(app).get("/api/activity?type=running").set("Cookie", cookie).expect(200);

    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.sessions[0].type).toBe("running");
  });

  it("respects the limit query param", async () => {
    for (let i = 0; i < 5; i++) {
      await db
        .insert(activitySessions)
        .values({ userId, type: "running", date: `2026-07-0${i + 1}`, createdAt: Date.now() + i })
        .run();
    }

    const res = await request(app).get("/api/activity?limit=2").set("Cookie", cookie).expect(200);
    expect(res.body.sessions).toHaveLength(2);
  });

  it("only returns sessions from the last 7 days in the week summary", async () => {
    await db
      .insert(activitySessions)
      .values({ userId, type: "running", date: "2020-01-01", createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000 })
      .run();
    await db.insert(activitySessions).values({ userId, type: "running", date: "2026-07-28", createdAt: Date.now() }).run();

    const res = await request(app).get("/api/activity/week-summary").set("Cookie", cookie).expect(200);
    expect(res.body.sessions).toHaveLength(1);
  });

  it("does not leak another user's activity sessions", async () => {
    const other = await db
      .insert(users)
      .values({ phone: OTHER_PHONE, name: "Alicia", createdAt: Date.now() })
      .returning({ id: users.id })
      .get();
    await db.insert(activitySessions).values({ userId: other.id, type: "running", date: "2026-07-28", createdAt: Date.now() }).run();

    const res = await request(app).get("/api/activity").set("Cookie", cookie).expect(200);
    expect(res.body.sessions).toHaveLength(0);
  });
});
