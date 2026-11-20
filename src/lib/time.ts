export const TIMEZONE = "Asia/Kuala_Lumpur";

/** YYYY-MM-DD for a date in Malaysia time. */
export function klDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function klHour(d: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, hour: "2-digit", hour12: false }).format(d)) % 24;
}

export function formatKlDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00+08:00`) : new Date(iso);
  return new Intl.DateTimeFormat("en-MY", { timeZone: TIMEZONE, ...opts }).format(d);
}

export function formatKlTime(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

/** Whole days from `today` (KL) to `date` (YYYY-MM-DD). Negative = overdue. */
export function daysUntil(date: string, today: string = klDateString()): number {
  const a = Date.parse(`${today}T00:00:00+08:00`);
  const b = Date.parse(`${date}T00:00:00+08:00`);
  return Math.round((b - a) / 86_400_000);
}

/** Add days to a YYYY-MM-DD string. */
export function addDays(date: string, days: number): string {
  const t = Date.parse(`${date}T00:00:00+08:00`) + days * 86_400_000;
  return klDateString(new Date(t));
}

export function relativeDue(date: string, today: string = klDateString()): string {
  const d = daysUntil(date, today);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  if (d < 0) return `${-d} days overdue`;
  return `In ${d} days`;
}
