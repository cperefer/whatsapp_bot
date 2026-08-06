import { apiGet } from "./client.js";

export interface ActivitySession {
  id: number;
  userId: number;
  type: string;
  date: string;
  distanceKm: number | null;
  durationSeconds: number | null;
  pace: string | null;
  notes: string | null;
  rpe: string | null;
  createdAt: number;
}

export function listActivity(params: { type?: string; limit?: number } = {}): Promise<{
  sessions: ActivitySession[];
}> {
  const query = new URLSearchParams();
  if (params.type) query.set("type", params.type);
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return apiGet(`/activity${qs ? `?${qs}` : ""}`);
}

export function getActivitySession(id: number): Promise<{ session: ActivitySession }> {
  return apiGet(`/activity/${id}`);
}
