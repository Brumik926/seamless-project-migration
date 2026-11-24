import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRight, Info } from "lucide-react";
import { accountsQuery, cardsQuery } from "@/hooks/use-bank";
import { PageHeader } from "@/components/bank/PageHeader";
import { SearchField } from "@/components/bank/fields";
import { EmptyState, UnderlineTabs } from "@/components/bank/rows";
import { CardVisual } from "@/components/bank/CardVisual";
import { Money } from "@/components/bank/Money";
import { Iban } from "@/components/bank/Iban";

type Tab = "all" | "debit" | "credit";

export const Route = createFileRoute("/_authenticated/karty/")({
  head: () => ({
    meta: [
      { title: "Zoznam kariet – Tatra banka" },
      { name: "description", content: "Debetné a kreditné karty, disponibilné zostatky a nastavenia." },
      { property: "og:title", content: "Zoznam kariet – Tatra banka" },
      { property: "og:description", content: "Prehľad a správa platobných kariet v školskom bankovom simulátore." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([queryClient.ensureQueryData(cardsQuery), queryClient.ensureQueryData(accountsQuery)]),
  component: CardsPage,
});

function CardsPage() {
  const { data: cards } = useSuspenseQuery(cardsQuery);
  const { data: accounts } = useSuspenseQuery(accountsQuery);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const list = useMemo(
    () =>
      cards.filter(
        (c) =>
          c.status === "active" &&
          (tab === "all" || c.card_type === tab) &&
          (!q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()) || c.masked_number.includes(q.trim())),
      ),
    [cards, tab, q],
  );

  return (
    <div className="flex min-h-dvh flex-col animate-page-in">
      <PageHeader title="Zoznam kariet" back>
        <SearchField value={q} onChange={setQ} className="mt-5" />
      </PageHeader>
      <div className="bg-background">
        <UnderlineTabs
          tabs={[
            { value: "all", label: "Všetky" },
            { value: "debit", label: "Debetné" },
            { value: "credit", label: "Kreditné" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <div className="flex flex-col gap-4 px-5 pt-5 pb-8">
        {list.length === 0 ? <EmptyState title="Žiadne karty." /> : null}
        {list.map((c) => {
          const acc = accounts.find((a) => a.id === c.account_id);
          const credit = c.card_type === "credit";
          return (
            <Link key={c.id} to="/karty/$id" params={{ id: c.id }} className="bank-tile block overflow-hidden rounded-2xl border border-border/60 bg-background shadow-tile transition-transform active:scale-[0.99]">
              <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-4 p-5">
                <CardVisual size="sm" design={c.design} brand={c.brand} cardType={c.card_type} blocked={c.status === "blocked"} />
                <span className="min-w-0">
                  <span className="block truncate text-lg font-bold">{c.name}</span>
                  <span className="block text-[0.95rem] text-muted-foreground tabular-nums">{c.masked_number}</span>
                  <span className="block truncate text-[0.95rem] text-muted-foreground">
                    {c.brand} {credit ? "kreditná" : "debetná"}
                    {c.status === "blocked" ? " · zablokovaná" : ""}
                  </span>
                </span>
                <ChevronRight className="h-7 w-7 text-primary" />
              </div>
              <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
                {credit ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Celkový úverový rámec</span>
                    <Money value={c.credit_limit ?? 0} className="text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex justify-between gap-3">
                    <span className="shrink-0 text-muted-foreground">Číslo účtu</span>
                    <Iban value={acc?.iban} className="truncate text-sm text-muted-foreground" />
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Disponibilný zostatok</span>
                  <Money value={credit ? (c.credit_available ?? 0) : (acc?.balance ?? 0)} sensitive className="text-lg font-bold" />
                </div>
              </div>
            </Link>
          );
        })}
        <p className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Info className="h-5 w-5 text-primary" /> Zobrazené sú iba platné karty.
        </p>
      </div>
    </div>
  );
}
