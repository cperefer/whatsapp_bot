import { apiGet } from "./client.js";

export interface CrossfitExercise {
  id: number;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
}

export interface CrossfitSession {
  id: number;
  date: string;
  notes: string | null;
  rpe: string | null;
  createdAt: number;
  exercises: CrossfitExercise[];
}

export function listCrossfitSessions(limit?: number): Promise<{ sessions: CrossfitSession[] }> {
  const qs = limit ? `?limit=${limit}` : "";
  return apiGet(`/crossfit/sessions${qs}`);
}

export function getCrossfitSession(id: number): Promise<{ session: CrossfitSession }> {
  return apiGet(`/crossfit/sessions/${id}`);
}

export interface CrossfitPr {
  name: string;
  reps: number;
  result: number;
  unit: string;
}

export function listCrossfitPrs(): Promise<{ prs: CrossfitPr[] }> {
  return apiGet("/crossfit/prs");
}
