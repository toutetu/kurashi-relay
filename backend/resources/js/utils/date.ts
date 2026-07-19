const TOKYO_TIME_ZONE = "Asia/Tokyo";

export function shiftTokyoDate(date: string, days: number): string {
  const shifted = new Date(`${date}T12:00:00+09:00`);
  shifted.setTime(shifted.getTime() + days * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOKYO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(shifted);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function isTokyoDateAfter(date: string, other: string): boolean {
  return date > other;
}

export function getTokyoToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOKYO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: TOKYO_TIME_ZONE,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
}

export function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: TOKYO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoDate));
}

export function formatTimeRange(startAt: string, endAt: string): string {
  return `${formatTime(startAt)}〜${formatTime(endAt)}`;
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}分`;
  if (remainder === 0) return `${hours}時間`;
  return `${hours}時間${remainder}分`;
}

export function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: TOKYO_TIME_ZONE,
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoDate));
}
