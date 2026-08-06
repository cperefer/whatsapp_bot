import request from "supertest";
import type { Express } from "express";
import { extractOtpCode } from "./testDb.js";

// Drives the real request-otp/verify-otp flow (rather than minting a cookie
// by hand) so these tests also double as regression coverage if the auth
// flow itself breaks.
export async function loginAndGetCookie(
  app: Express,
  phone: string,
  sentMessages: Array<{ phone: string; text: string }>,
): Promise<string> {
  await request(app).post("/api/auth/request-otp").send({ phone }).expect(200);
  const code = extractOtpCode(sentMessages[sentMessages.length - 1]!.text);
  const verifyRes = await request(app).post("/api/auth/verify-otp").send({ phone, code }).expect(200);
  const cookie = verifyRes.headers["set-cookie"]?.[0];
  if (!cookie) throw new Error("login did not set a session cookie");
  return cookie;
}
