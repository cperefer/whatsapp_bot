import type { CrossfitPr } from "../api/crossfit.js";

interface PrChartProps {
  prs: CrossfitPr[];
}

function formatValue(pr: CrossfitPr): string {
  const value = Number.isInteger(pr.result) ? String(pr.result) : pr.result.toFixed(1);
  const base = `${value} ${pr.unit}`;
  return pr.reps > 1 && pr.unit !== "reps" ? `${base} × ${pr.reps}` : base;
}

function groupByUnit(prs: CrossfitPr[]): Map<string, CrossfitPr[]> {
  const groups = new Map<string, CrossfitPr[]>();
  for (const pr of prs) {
    const list = groups.get(pr.unit) ?? [];
    list.push(pr);
    groups.set(pr.unit, list);
  }
  return groups;
}

export default function PrChart({ prs }: PrChartProps) {
  if (prs.length === 0) {
    return <p className="text-sm text-[#898781]">Todavía no hay records personales registrados.</p>;
  }

  const groups = groupByUnit(prs);

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([unit, group]) => {
        const sorted = [...group].sort((a, b) => b.result - a.result);
        const max = sorted[0]?.result || 1;

        return (
          <div key={unit}>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#898781]">{unit}</p>
            <div className="space-y-1.5">
              {sorted.map((pr) => {
                const pct = Math.max((pr.result / max) * 100, 4);
                return (
                  <div
                    key={pr.name}
                    tabIndex={0}
                    className="group relative flex items-center gap-3 rounded-md px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-[#2a78d6]"
                  >
                    <span
                      className="w-28 shrink-0 truncate text-sm text-[#52514e] dark:text-[#c3c2b7]"
                      title={pr.name}
                    >
                      {pr.name}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div
                        className="h-3 rounded-r-[4px] bg-[#2a78d6] transition-[filter] group-hover:brightness-110 dark:bg-[#3987e5]"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="shrink-0 text-sm tabular-nums text-[#52514e] dark:text-[#c3c2b7]">
                        {formatValue(pr)}
                      </span>
                    </div>
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute left-28 top-full z-10 mt-1 hidden whitespace-nowrap rounded-md bg-[#0b0b0b] px-2 py-1 text-xs text-white shadow-lg group-hover:block group-focus:block dark:bg-white dark:text-[#0b0b0b]"
                    >
                      <strong className="font-semibold">{formatValue(pr)}</strong>
                      <span className="ml-1 text-[#c3c2b7] dark:text-[#52514e]">{pr.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
