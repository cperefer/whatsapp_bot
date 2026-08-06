import { apiGet, apiPost } from "./client.js";

export interface User {
  id: number;
  name: string;
  phone: string;
}

export function requestOtp(phone: string): Promise<{ ok: true }> {
  return apiPost("/auth/request-otp", { phone });
}

export function verifyOtp(phone: string, code: string): Promise<{ user: User }> {
  return apiPost("/auth/verify-otp", { phone, code });
}

export function getMe(): Promise<{ user: User }> {
  return apiGet("/auth/me");
}
