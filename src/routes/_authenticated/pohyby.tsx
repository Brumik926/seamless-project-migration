import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { accountsQuery, transactionsQuery } from "@/hooks/use-bank";
import { PageHeader, HeaderIconButton } from "@/components/bank/PageHeader";
import { SearchField, SelectField } from "@/components/bank/fields";
import { Iban } from "@/components/bank/Iban";
import { TransactionRow } from "@/components/bank/TransactionRow";
import { EmptyState } from "@/components/bank/rows";
import { BottomSheet } from "@/components/bank/BottomSheet";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/categories";
import { formatLongDate } from "@/lib/format";
import { normalizeIban } from "@/lib/iban";
import type { Transaction } from "@/services/bank";

type Direction = "all" | "in" | "out";
type PohybySearch = { account?: string; category?: string; direction?: Direction };

export const Route = createFileRoute("/_authenticated/pohyby")({
  validateSearch: (s: Record<string, unknown>): PohybySearch => {
    const out: PohybySearch = {};
    if (typeof s["account"] === "string") out.account = s["account"];
    if (typeof s["category"] === "string") out.category = s["category"];
    if (s["direction"] === "in" || s["direction"] === "out" || s["direction"] === "all") out.direction = s["direction"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Pohyby na účte – Tatra banka" },
      { name: "description", content: "História prijatých a odoslaných platieb a nákupov kartou." },
      { property: "og:title", content: "Pohyby na účte – Tatra banka" },
      { property: "og:description", content: "História transakcií v aplikácii Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([queryClient.ensureQueryData(accountsQuery), queryClient.ensureQueryData(transactionsQuery)]),
  component: Pohyby,
});

function dayKey(tx: Transaction): string {
  const d = new Date(tx.booked_at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Pohyby() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/pohyby" });
  const { data: accounts } = useSuspenseQuery(accountsQuery);
  const { data: transactions } = useSuspenseQuery(transactionsQuery);
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const account = accounts.find((a) => a.id === search.account) ?? accounts[0];
  const direction: Direction = search.direction ?? "all";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qIban = normalizeIban(query);
    return transactions.filter((t) => {
      if (account && t.account_id !== account.id) return false;
      if (direction !== "all" && t.direction !== direction) return false;
      if (search.category && t.category !== search.category) return false;
      if (!q) return true;
      return (
        t.counterparty_name.toLowerCase().includes(q) ||
        (t.message ?? "").toLowerCase().includes(q) ||
        (t.variable_symbol ?? "").includes(q) ||
        (qIban.length >= 4 && (t.counterparty_iban ?? "").includes(qIban)) ||
        String(t.amount).replace(".", ",").includes(q.replace(".", ","))
      );
    });
  }, [transactions, account, direction, search.category, query]);

  const scheduled = filtered.filter((t) => t.status === "scheduled").sort((a, b) => a.execution_date.localeCompare(b.execution_date));
  const booked = useMemo(
    () => filtered.filter((t) => t.status !== "scheduled").sort((a, b) => new Date(b.booked_at).getTime() - new Date(a.booked_at).getTime()),
    [filtered],
  );
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of booked) {
      const k = dayKey(t);
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return [...map.entries()];
  }, [booked]);

  const activeFilters = (direction !== "all" ? 1 : 0) + (search.category ? 1 : 0);

  return (
    <div className="flex flex-col gap-3 animate-page-in">
      <PageHeader
        title="Pohyby na účte"
        right={
          <HeaderIconButton label="Filter pohybov" badge={activeFilters} onClick={() => setFilterOpen(true)}>
            <SlidersHorizontal className="h-7 w-7" strokeWidth={1.5} />
          </HeaderIconButton>
        }
      >
        <SearchField value={query} onChange={setQuery} className="mt-5" />
      </PageHeader>

      {account ? (
        <button type="button" onClick={() => setAccountOpen(true)} className="bank-section grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 text-left">
          <span className="text-[1.05rem] text-muted-foreground">K účtu</span>
          <span className="min-w-0 text-right">
            <span className="block text-[1.2rem]">{account.name}</span>
            <Iban value={account.iban} className="mt-1 block truncate text-[0.95rem] text-muted-foreground" />
          </span>
          <ChevronDown className="mt-1 h-6 w-6 text-primary" />
        </button>
      ) : null}

      {scheduled.length > 0 ? (
        <section className="bank-section pr-0 pb-0">
          <h2 className="mb-3 text-[1.05rem] text-muted-foreground">Naplánované platby</h2>
          {scheduled.map((t) => (
            <TransactionRow key={t.id} tx={t} />
          ))}
        </section>
      ) : null}

      {groups.length === 0 && scheduled.length === 0 ? (
        <section className="bank-section">
          <EmptyState title={query || activeFilters ? "Žiadne pohyby nezodpovedajú hľadaniu." : "Na účte zatiaľ nie sú žiadne pohyby."}>
            {activeFilters ? (
              <Button variant="bankOutline" onClick={() => navigate({ search: (p) => ({ account: p.account }) as PohybySearch })}>
                Zrušiť filtre
              </Button>
            ) : null}
          </EmptyState>
        </section>
      ) : null}

      {groups.map(([day, txs]) => (
        <section key={day} className="bank-section pr-0 pb-0">
          <h2 className="mb-3 text-[1.05rem] text-muted-foreground">{formatLongDate(day)}</h2>
          {txs.map((t) => (
            <TransactionRow key={t.id} tx={t} />
          ))}
        </section>
      ))}

      <BottomSheet open={accountOpen} onOpenChange={setAccountOpen} title="Vyberte účet">
        <div className="flex flex-col gap-3">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                navigate({ search: (p) => ({ ...p, account: a.id }) });
                setAccountOpen(false);
              }}
              className={`bank-field px-5 py-4 text-left ${a.id === account?.id ? "ring-2 ring-primary" : ""}`}
            >
              <span className="block font-bold">{a.name}</span>
              <Iban value={a.iban} className="text-sm text-muted-foreground" />
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={filterOpen} onOpenChange={setFilterOpen} title="Filter pohybov">
        <div className="flex flex-col gap-4">
          <SelectField
            id="f-direction"
            label="Typ pohybu"
            value={direction}
            onChange={(e) => navigate({ search: (p) => ({ ...p, direction: e.target.value as Direction }) })}
            options={[
              { value: "all", label: "Všetky" },
              { value: "in", label: "Prijaté" },
              { value: "out", label: "Odoslané" },
            ]}
          />
          <SelectField
            id="f-category"
            label="Kategória"
            value={search.category ?? ""}
            onChange={(e) =>
              navigate({
                search: (p) => {
                  const next: PohybySearch = { ...p };
                  if (e.target.value) next.category = e.target.value;
                  else delete next.category;
                  return next;
                },
              })
            }
            options={[{ value: "", label: "Všetky kategórie" }, ...CATEGORY_KEYS.map((k) => ({ value: k, label: CATEGORIES[k].label }))]}
          />
          <div className="mt-2 flex flex-col gap-3">
            <Button variant="bank" size="xl" onClick={() => setFilterOpen(false)}>
              Zobraziť {filtered.length} pohybov
            </Button>
            <Button
              variant="bankOutline"
              size="xl"
              onClick={() => {
                navigate({ search: (p) => ({ account: p.account }) as PohybySearch });
                setFilterOpen(false);
              }}
            >
              Zrušiť filtre
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
