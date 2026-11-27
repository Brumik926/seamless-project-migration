/** Allowed daily card limits; mirrors the CHECK constraints on public.card_limits. */
export const CARD_LIMIT_RANGES = {
  atm_daily: { label: "Výber z bankomatu", max: 5000, step: 50 },
  pos_daily: { label: "Platby u obchodníka", max: 10000, step: 100 },
  internet_daily: { label: "Platby na internete", max: 10000, step: 100 },
} as const;

export function clampLimit(key: keyof typeof CARD_LIMIT_RANGES, value: number): number {
  const { max } = CARD_LIMIT_RANGES[key];
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.round(value)));
}
