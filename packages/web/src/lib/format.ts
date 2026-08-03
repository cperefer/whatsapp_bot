export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  running: "Running",
  cycling: "Ciclismo",
  swimming: "Natación",
  hiking: "Senderismo",
};

export function formatDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}
