import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { listActivity, type ActivitySession } from "../api/activity.js";
import { listCrossfitSessions, listCrossfitPrs, type CrossfitSession, type CrossfitPr } from "../api/crossfit.js";
import PrChart from "../components/PrChart.js";
import { ACTIVITY_TYPE_LABELS, formatDate } from "../lib/format.js";

type WorkoutEntry =
  | { kind: "activity"; date: string; data: ActivitySession }
  | { kind: "crossfit"; date: string; data: CrossfitSession };

const RECENT_LIMIT = 5;
const DISPLAY_LIMIT = 8;

function workoutHref(entry: WorkoutEntry): string {
  return entry.kind === "activity" ? `/activity/${entry.data.id}` : `/crossfit/${entry.data.id}`;
}

function activitySummary(session: ActivitySession): string {
  const parts: string[] = [];
  if (session.distanceKm) parts.push(`${session.distanceKm} km`);
  if (session.durationSeconds) parts.push(`${Math.round(session.durationSeconds / 60)} min`);
  if (session.pace) parts.push(session.pace);
  return parts.length > 0 ? parts.join(" · ") : "Sin detalles";
}

function crossfitSummary(session: CrossfitSession): string {
  if (session.exercises.length === 0) return "Sin ejercicios registrados";
  return session.exercises.map((exercise) => exercise.name).join(", ");
}

const CARD_CLASS =
  "rounded-xl border border-black/10 bg-[#fcfcfb] shadow-sm dark:border-white/10 dark:bg-[#1a1a19]";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={CARD_CLASS}>
      <h2 className="border-b border-black/10 px-5 py-4 text-sm font-semibold text-[#0b0b0b] dark:border-white/10 dark:text-white">
        {title}
      </h2>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export default function Dashboard() {
  const [entries, setEntries] = useState<WorkoutEntry[] | null>(null);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [prs, setPrs] = useState<CrossfitPr[] | null>(null);
  const [prsError, setPrsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([listActivity({ limit: RECENT_LIMIT }), listCrossfitSessions(RECENT_LIMIT)])
      .then(([activity, crossfit]) => {
        if (cancelled) return;
        const merged: WorkoutEntry[] = [
          ...activity.sessions.map((data): WorkoutEntry => ({ kind: "activity", date: data.date, data })),
          ...crossfit.sessions.map((data): WorkoutEntry => ({ kind: "crossfit", date: data.date, data })),
        ]
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .slice(0, DISPLAY_LIMIT);
        setEntries(merged);
      })
      .catch(() => {
        if (!cancelled) setEntriesError("No se pudieron cargar los entrenamientos.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    listCrossfitPrs()
      .then((res) => {
        if (!cancelled) setPrs(res.prs);
      })
      .catch(() => {
        if (!cancelled) setPrsError("No se pudieron cargar los records personales.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f9f9f7] px-4 py-8 dark:bg-[#0d0d0d]">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-xl font-semibold text-[#0b0b0b] dark:text-white">Dashboard</h1>

        <Card title="Últimos entrenamientos">
          {entriesError && (
            <div className="rounded-md border border-[#e34948]/30 bg-[#e34948]/5 px-3 py-2 text-sm text-[#e34948]">
              {entriesError}
            </div>
          )}

          {!entries && !entriesError && <p className="text-sm text-[#898781]">Cargando...</p>}

          {entries && entries.length === 0 && (
            <p className="text-sm text-[#898781]">Todavía no hay entrenamientos registrados.</p>
          )}

          {entries && entries.length > 0 && (
            <ul className="-mx-5 divide-y divide-[#e1e0d9] dark:divide-[#2c2c2a]">
              {entries.map((entry) => (
                <li key={`${entry.kind}-${entry.data.id}`}>
                  <Link
                    to={workoutHref(entry)}
                    className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0b0b0b] dark:text-white">
                        {entry.kind === "activity"
                          ? (ACTIVITY_TYPE_LABELS[entry.data.type] ?? entry.data.type)
                          : "CrossFit"}
                      </p>
                      <p className="truncate text-sm text-[#898781]">
                        {entry.kind === "activity" ? activitySummary(entry.data) : crossfitSummary(entry.data)}
                      </p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs text-[#898781]">{formatDate(entry.date)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Records personales">
          {prsError && (
            <div className="rounded-md border border-[#e34948]/30 bg-[#e34948]/5 px-3 py-2 text-sm text-[#e34948]">
              {prsError}
            </div>
          )}

          {!prs && !prsError && <p className="text-sm text-[#898781]">Cargando...</p>}

          {prs && <PrChart prs={prs} />}
        </Card>
      </div>
    </div>
  );
}
