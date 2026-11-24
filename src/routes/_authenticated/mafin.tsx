import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { transactionsQuery } from "@/hooks/use-bank";
import { PageHeader } from "@/components/bank/PageHeader";
import { Section } from "@/components/bank/Section";
import { Money } from "@/components/bank/Money";
import { CategoryDonut } from "@/components/bank/CategoryDonut";
import { EmptyState } from "@/components/bank/rows";
import { categoryOf } from "@/lib/categories";
import { countsForStats, monthKeyOf, monthLabel, shiftMonth, summarizeMonth } from "@/lib/stats";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/mafin")({
  head: () => ({
    meta: [
      { title: "MaFin – prehľad príjmov a výdavkov – Tatra banka" },
      { name: "description", content: "Mesačný prehľad príjmov, výdavkov a kategórií." },
      { property: "og:title", content: "MaFin – Tatra banka" },
      { property: "og:description", content: "Prehľad príjmov a výdavkov v aplikácii Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(transactionsQuery),
  component: MaFin,
});

function MaFin() {
  const { data: transactions } = useSuspenseQuery(transactionsQuery);
  const thisMonth = monthKeyOf(new Date());
  const [month, setMonth] = useState(thisMonth);
  const summary = useMemo(() => summarizeMonth(transactions, month), [transactions, month]);
  const trend = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const m = shiftMonth(month, i - 5);
        const s = summarizeMonth(transactions, m);
        const [, mm] = m.split("-");
        return { month: `${Number(mm)}/${m.slice(2, 4)}`, Príjmy: s.income, Výdavky: s.expense };
      }),
    [transactions, month],
  );
  const merchants = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (!countsForStats(t) || t.direction !== "out" || monthKeyOf(t.booked_at) !== month) continue;
      map.set(t.counterparty_name, (map.get(t.counterparty_name) ?? 0) + Number(t.amount));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [transactions, month]);

  return (
    <div className="flex flex-col gap-3 animate-page-in">
      <PageHeader title="MaFin" back>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" aria-label="Predchádzajúci mesiac" onClick={() => setMonth(shiftMonth(month, -1))} className="p-2 text-primary">
            <ChevronLeft className="h-7 w-7" />
          </button>
          <span className="text-lg font-bold">{monthLabel(month)}</span>
          <button type="button" aria-label="Nasledujúci mesiac" disabled={month >= thisMonth} onClick={() => setMonth(shiftMonth(month, 1))} className="p-2 text-primary disabled:opacity-30">
            <ChevronRight className="h-7 w-7" />
          </button>
        </div>
      </PageHeader>

      <section className="bank-section text-center">
        <p className="text-muted-foreground">Rozdiel</p>
        <Money value={Math.abs(summary.difference)} signed={summary.difference < 0 ? "out" : "in"} sensitive className="mt-1 block text-[2rem] font-bold" />
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="text-right">
            <p className="text-muted-foreground">Výdavky</p>
            <Money value={summary.expense} sensitive className="text-[1.5rem] font-bold text-negative" />
          </div>
          <span className="h-12 w-px bg-border" />
          <div className="text-left">
            <p className="text-muted-foreground">Príjmy</p>
            <Money value={summary.income} sensitive className="text-[1.5rem] font-bold text-positive" />
          </div>
        </div>
      </section>

      <Section title="Výdavky podľa kategórií">
        <div className="flex justify-center">
          <CategoryDonut data={summary.byCategory} size={210} />
        </div>
        {summary.byCategory.length === 0 ? (
          <EmptyState title="V tomto mesiaci nemáte žiadne výdavky." />
        ) : (
          <ul className="mt-6">
            {summary.byCategory.map((c) => {
              const cat = categoryOf(c.key);
              const Icon = cat.icon;
              return (
                <li key={c.key}>
                  <Link to="/pohyby" search={{ category: c.key, direction: "out" }} className="flex items-center gap-4 border-t border-border py-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card" style={{ color: cat.color }}>
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-3">
                        <span className="truncate">{cat.label}</span>
                        <Money value={c.amount} sensitive className="font-semibold" />
                      </span>
                      <span className="mt-2 flex items-center gap-3">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <span className="block h-full rounded-full" style={{ width: `${c.share * 100}%`, background: cat.color }} />
                        </span>
                        <span className="w-10 text-right text-sm text-muted-foreground">{Math.round(c.share * 100)} %</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Posledných 6 mesiacov">
        <div className="h-52" role="img" aria-label="Príjmy a výdavky za posledných 6 mesiacov">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--popover-foreground)" }}
                formatter={(v: number) => formatMoney(v)}
              />
              <Bar dataKey="Príjmy" fill="var(--positive)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Výdavky" fill="var(--negative)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-positive" /> Príjmy</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-negative" /> Výdavky</span>
        </div>
      </Section>

      <Section title="Najväčšie výdavky">
        {merchants.length === 0 ? (
          <EmptyState title="Žiadne výdavky." />
        ) : (
          <ol>
            {merchants.map(([name, amount], i) => (
              <li key={name} className="flex items-center gap-4 border-t border-border py-4 first:border-t-0">
                <span className="w-6 text-muted-foreground">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <Money value={amount} sensitive className="font-semibold text-negative" />
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
