import type { Transaction } from "@/services/bank";
import { CATEGORY_KEYS, type CategoryKey } from "./categories";

export type MonthKey = `${number}-${string}`; // "2026-11"

export function monthKeyOf(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y ?? 2026, (m ?? 1) - 1 + delta, 1);
  return monthKeyOf(d);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const label = new Intl.DateTimeFormat("sk-SK", { month: "long", year: "numeric" }).format(new Date(y ?? 2026, (m ?? 1) - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Only settled movements count; transfers between the user's own accounts are neither income nor spending. */
export function countsForStats(tx: Pick<Transaction, "status" | "tx_type">): boolean {
  return tx.status === "completed" && tx.tx_type !== "internal";
}

export type MonthSummary = {
  income: number;
  expense: number;
  difference: number;
  byCategory: { key: CategoryKey; amount: number; share: number }[];
};

export function summarizeMonth(
  transactions: Pick<Transaction, "status" | "tx_type" | "direction" | "amount" | "category" | "booked_at">[],
  month: string,
): MonthSummary {
  let income = 0;
  let expense = 0;
  const cats = new Map<CategoryKey, number>();
  for (const tx of transactions) {
    if (!countsForStats(tx) || monthKeyOf(tx.booked_at) !== month) continue;
    const amount = Number(tx.amount);
    if (tx.direction === "in") income += amount;
    else {
      expense += amount;
      const key = (CATEGORY_KEYS as readonly string[]).includes(tx.category) ? (tx.category as CategoryKey) : "ine";
      cats.set(key, (cats.get(key) ?? 0) + amount);
    }
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  const byCategory = [...cats.entries()]
    .map(([key, amount]) => ({ key, amount: round(amount), share: expense > 0 ? amount / expense : 0 }))
    .sort((a, b) => b.amount - a.amount);
  return { income: round(income), expense: round(expense), difference: round(income - expense), byCategory };
}

/** Reconstructs daily end-of-day balances for the last `days` days from the current balance. */
export function balanceHistory(
  currentBalance: number,
  transactions: Pick<Transaction, "status" | "direction" | "amount" | "booked_at" | "account_id">[],
  accountId: string,
  days = 30,
  now: Date = new Date(),
): { day: string; balance: number }[] {
  const settled = transactions
    .filter((t) => t.account_id === accountId && t.status === "completed")
    .map((t) => ({ at: new Date(t.booked_at).getTime(), delta: (t.direction === "in" ? 1 : -1) * Number(t.amount) }));
  const points: { day: string; balance: number }[] = [];
  for (let i = 0; i < days; i++) {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999).getTime();
    const after = settled.filter((t) => t.at > end).reduce((s, t) => s + t.delta, 0);
    points.push({ day: new Date(end).toISOString().slice(0, 10), balance: Math.round((currentBalance - after) * 100) / 100 });
  }
  return points.reverse();
}
