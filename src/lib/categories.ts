import {
  ShoppingBasket,
  ShoppingBag,
  Plane,
  Home,
  Car,
  Clapperboard,
  HeartPulse,
  ArrowDownLeft,
  ArrowLeftRight,
  PiggyBank,
  CircleEllipsis,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_KEYS = [
  "potraviny",
  "nakupy",
  "cestovanie",
  "byvanie",
  "doprava",
  "zabava",
  "zdravie",
  "prijem",
  "prevody",
  "sporenie",
  "ine",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

/** Categories a user may pick for an outgoing payment (income is assigned by the bank). */
export const PAYMENT_CATEGORIES = CATEGORY_KEYS.filter((k) => k !== "prijem");

export const CATEGORIES: Record<CategoryKey, { label: string; icon: LucideIcon; color: string }> = {
  potraviny: { label: "Potraviny", icon: ShoppingBasket, color: "var(--chart-4)" },
  nakupy: { label: "Nákupy", icon: ShoppingBag, color: "var(--chart-2)" },
  cestovanie: { label: "Cestovanie", icon: Plane, color: "var(--chart-1)" },
  byvanie: { label: "Bývanie", icon: Home, color: "var(--chart-3)" },
  doprava: { label: "Doprava", icon: Car, color: "var(--chart-6)" },
  zabava: { label: "Zábava", icon: Clapperboard, color: "var(--chart-5)" },
  zdravie: { label: "Zdravie", icon: HeartPulse, color: "var(--positive)" },
  prijem: { label: "Príjem", icon: ArrowDownLeft, color: "var(--positive)" },
  prevody: { label: "Prevody", icon: ArrowLeftRight, color: "var(--primary)" },
  sporenie: { label: "Sporenie", icon: PiggyBank, color: "var(--savings)" },
  ine: { label: "Iné", icon: CircleEllipsis, color: "var(--muted-foreground)" },
};

export function categoryOf(key: string): (typeof CATEGORIES)[CategoryKey] {
  return CATEGORIES[(CATEGORY_KEYS as readonly string[]).includes(key) ? (key as CategoryKey) : "ine"];
}

export const TX_TYPE_LABELS: Record<string, { in: string; out: string }> = {
  transfer_in: { in: "Prijatá platba", out: "Prijatá platba" },
  transfer_out: { in: "Odoslaná platba", out: "Odoslaná platba" },
  card: { in: "Vrátenie na kartu", out: "VE POS nákup" },
  standing_order: { in: "Trvalý príkaz", out: "Trvalý príkaz" },
  internal: { in: "Prevod medzi účtami", out: "Prevod medzi účtami" },
};

export function txTypeLabel(txType: string, direction: string): string {
  const entry = TX_TYPE_LABELS[txType];
  if (!entry) return direction === "in" ? "Prijatá platba" : "Odoslaná platba";
  return direction === "in" ? entry.in : entry.out;
}
