const moneyFormatter = new Intl.NumberFormat("sk-SK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "1 140,00" — Slovak grouping with a regular space so tests and UI agree. */
export function formatAmount(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return moneyFormatter.format(Number.isFinite(n) ? n : 0).replace(/\u00a0|\u202f/g, " ");
}

export function formatMoney(value: number | string | null | undefined, currency = "EUR"): string {
  return `${formatAmount(value)} ${currency}`;
}

const longDate = new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "long", year: "numeric" });
const shortDate = new Intl.DateTimeFormat("sk-SK", { day: "2-digit", month: "2-digit", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("sk-SK", { hour: "2-digit", minute: "2-digit" });

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  // Plain dates ("2026-11-22") must stay on the same calendar day in every timezone.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  }
  return new Date(value);
}

export function formatLongDate(value: string | Date): string {
  return longDate.format(toDate(value));
}

export function formatShortDate(value: string | Date): string {
  return shortDate.format(toDate(value)).replace(/\s/g, "");
}

export function formatTime(value: string | Date): string {
  return timeFmt.format(toDate(value));
}

/** Local calendar date as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function initials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const AVATAR_TONES = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "chart-6"] as const;
export type AvatarTone = (typeof AVATAR_TONES)[number];

export function avatarTone(name: string): AvatarTone {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length] ?? "chart-3";
}
