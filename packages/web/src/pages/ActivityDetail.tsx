import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getActivitySession, type ActivitySession } from "../api/activity.js";
import { ApiError } from "../api/client.js";
import { ACTIVITY_TYPE_LABELS, formatDate } from "../lib/format.js";

type LoadState =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "error" }
  | { status: "ready"; session: ActivitySession };

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const sessionId = Number(id);
    if (!Number.isInteger(sessionId)) {
      setState({ status: "not_found" });
      return;
    }

    let cancelled = false;
    getActivitySession(sessionId)
      .then((res) => {
        if (!cancelled) setState({ status: "ready", session: res.session });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: err instanceof ApiError && err.status === 404 ? "not_found" : "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-[#f9f9f7] px-4 py-8 dark:bg-[#0d0d0d]">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link to="/dashboard" className="text-sm text-[#2a78d6] hover:underline dark:text-[#3987e5]">
          ← Volver al dashboard
        </Link>

        {state.status === "loading" && <p className="text-sm text-[#898781]">Cargando...</p>}
        {state.status === "not_found" && <p className="text-sm text-[#898781]">Entrenamiento no encontrado.</p>}
        {state.status === "error" && (
          <div className="rounded-md border border-[#e34948]/30 bg-[#e34948]/5 px-3 py-2 text-sm text-[#e34948]">
            No se pudo cargar el entrenamiento.
          </div>
        )}

        {state.status === "ready" && (
          <section className="rounded-xl border border-black/10 bg-[#fcfcfb] shadow-sm dark:border-white/10 dark:bg-[#1a1a19]">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 dark:border-white/10">
              <h1 className="text-lg font-semibold text-[#0b0b0b] dark:text-white">
                {ACTIVITY_TYPE_LABELS[state.session.type] ?? state.session.type}
              </h1>
              <span className="text-sm text-[#898781]">{formatDate(state.session.date)}</span>
            </div>

            <dl className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-3">
              {state.session.distanceKm != null && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[#898781]">Distancia</dt>
                  <dd className="mt-1 text-sm font-medium tabular-nums text-[#0b0b0b] dark:text-white">
                    {state.session.distanceKm} km
                  </dd>
                </div>
              )}
              {state.session.durationSeconds != null && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[#898781]">Duración</dt>
                  <dd className="mt-1 text-sm font-medium tabular-nums text-[#0b0b0b] dark:text-white">
                    {formatDuration(state.session.durationSeconds)}
                  </dd>
                </div>
              )}
              {state.session.pace && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[#898781]">Ritmo</dt>
                  <dd className="mt-1 text-sm font-medium tabular-nums text-[#0b0b0b] dark:text-white">
                    {state.session.pace}
                  </dd>
                </div>
              )}
              {state.session.rpe && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[#898781]">RPE</dt>
                  <dd className="mt-1 text-sm font-medium tabular-nums text-[#0b0b0b] dark:text-white">
                    {state.session.rpe}
                  </dd>
                </div>
              )}
            </dl>

            <div className="border-t border-black/10 px-5 py-4 dark:border-white/10">
              <h2 className="text-xs uppercase tracking-wide text-[#898781]">Notas</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[#52514e] dark:text-[#c3c2b7]">
                {state.session.notes || "Sin notas."}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
