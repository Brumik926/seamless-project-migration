import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Mail, Phone, Pencil, Info, Globe, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  accountsQuery,
  cardsQuery,
  notificationsQuery,
  qk,
  recipientsQuery,
  settingsQuery,
  standingOrdersQuery,
  transactionsQuery,
  useBankMutation,
} from "@/hooks/use-bank";
import { Section } from "@/components/bank/Section";
import { HeaderIconButton } from "@/components/bank/PageHeader";
import { VegaMark } from "@/components/bank/Logo";
import { Money } from "@/components/bank/Money";
import { Iban } from "@/components/bank/Iban";
import { Sparkline } from "@/components/bank/Sparkline";
import { CardVisual } from "@/components/bank/CardVisual";
import { RecipientAvatar } from "@/components/bank/Avatar";
import { CategoryDonut } from "@/components/bank/CategoryDonut";
import { HomeEditSheet } from "@/components/bank/HomeEditSheet";
import { Switch } from "@/components/ui/switch";
import { balanceHistory, monthKeyOf, summarizeMonth } from "@/lib/stats";
import { categoryOf } from "@/lib/categories";
import { EXCHANGE_RATES } from "@/lib/rates";
import { formatAmount } from "@/lib/format";
import { updateCard, type Card } from "@/services/bank";
import { bankErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/domov")({
  head: () => ({
    meta: [
      { title: "Domov – Tatra banka" },
      { name: "description", content: "Prehľad účtov, kariet, sporení a výdavkov." },
      { property: "og:title", content: "Domov – Tatra banka" },
      { property: "og:description", content: "Prehľad účtov, kariet, sporení a výdavkov v aplikácii Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(accountsQuery),
      queryClient.ensureQueryData(transactionsQuery),
      queryClient.ensureQueryData(cardsQuery),
      queryClient.ensureQueryData(recipientsQuery),
      queryClient.ensureQueryData(settingsQuery),
      queryClient.ensureQueryData(notificationsQuery),
      queryClient.ensureQueryData(standingOrdersQuery),
    ]),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { data: accounts } = useSuspenseQuery(accountsQuery);
  const { data: transactions } = useSuspenseQuery(transactionsQuery);
  const { data: cards } = useSuspenseQuery(cardsQuery);
  const { data: recipients } = useSuspenseQuery(recipientsQuery);
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const { data: notifications } = useSuspenseQuery(notificationsQuery);
  const { data: orders } = useSuspenseQuery(standingOrdersQuery);
  const [editOpen, setEditOpen] = useState(false);

  const unread = notifications.filter((n) => !n.is_read).length;
  const current = accounts.filter((a) => a.account_type === "current");
  const savings = accounts.filter((a) => a.account_type === "savings");
  const favorites = recipients.filter((r) => r.is_favorite);
  const month = monthKeyOf(new Date());
  const summary = useMemo(() => summarizeMonth(transactions, month), [transactions, month]);

  return (
    <div className="flex flex-col gap-3 animate-page-in">
      <header className="sticky top-0 z-30 grid grid-cols-3 items-center border-b border-border/60 bg-background/95 px-5 pt-[calc(env(safe-area-inset-top)+0.85rem)] pb-3 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="flex">
          <HeaderIconButton label="Notifikácie" badge={unread} onClick={() => navigate({ to: "/notifikacie" })}>
            <Mail className="h-8 w-8" strokeWidth={1.5} />
          </HeaderIconButton>
        </div>
        <div className="flex justify-center">
          <VegaMark className="h-11 w-11 text-foreground" />
        </div>
        <div className="flex justify-end gap-5">
          <HeaderIconButton label="Kontakty" onClick={() => navigate({ to: "/kontakty" })}>
            <Phone className="h-7 w-7" strokeWidth={1.5} />
          </HeaderIconButton>
          <HeaderIconButton label="Upraviť zobrazenie" onClick={() => setEditOpen(true)}>
            <Pencil className="h-7 w-7" strokeWidth={1.5} />
          </HeaderIconButton>
        </div>
      </header>

      <Section title="Účty" action={<Link to="/pohyby">Pohyby</Link>}>
        <div className="flex flex-col gap-4">
          {current.map((a) => (
            <Link
              key={a.id}
              to="/ucet/$id"
              params={{ id: a.id }}
              className="bank-tile block p-6 transition-transform active:scale-[0.99]"
            >
              <h3 className="text-xl font-bold">{a.name}</h3>
              <Iban value={a.iban} className="mt-2 block text-[0.95rem] text-muted-foreground" />
              <div className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-4 border-t border-border pt-5">
                <div className="min-w-0">
                  <p className="text-[0.95rem] text-muted-foreground">Aktuálny zostatok</p>
                  <Money value={a.balance} sensitive className="mt-2 block text-[1.6rem] font-bold" />
                </div>
                <Sparkline id={a.id} data={balanceHistory(Number(a.balance), transactions, a.id, 30)} />
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {settings.show_cards && cards.length > 0 ? <CardsSection cards={cards} accounts={accounts} /> : null}

      {settings.show_savings && savings.length > 0 ? (
        <Section title="Sporenia" action={<Link to="/trvale-prikazy">Pravidelné sporenie</Link>}>
          <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5">
            {savings.map((s) => {
              const plan = orders.find((o) => o.iban === s.iban && o.is_active);
              return (
                <Link
                  key={s.id}
                  to="/ucet/$id"
                  params={{ id: s.id }}
                  className="bank-tile relative w-[86%] shrink-0 snap-start overflow-hidden border-l-[6px] border-savings"
                >
                  <div className="p-6">
                    <h3 className="text-xl font-bold">{s.name}</h3>
                    <p className="mt-2 text-[0.95rem] text-muted-foreground">
                      k účtu: <strong className="text-foreground/90">{current[0]?.name ?? "—"}</strong>
                    </p>
                    <Money value={s.balance} sensitive className="mt-5 block text-[1.5rem] font-bold" />
                  </div>
                  <div className="flex items-start gap-3 border-t border-border px-6 py-4 text-[0.95rem] text-muted-foreground">
                    <Info className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.6} />
                    {plan ? (
                      <span>
                        Pravidelné sporenie {formatAmount(plan.amount)} EUR, ďalšie {new Date(plan.next_date).toLocaleDateString("sk-SK")}.
                      </span>
                    ) : (
                      <span>Nastavte si pravidelné sporenie v sekcii Trvalé príkazy.</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>
      ) : null}

      {settings.show_quick_payment ? (
        <Section title="Rýchla platba" action={<Link to="/prijemcovia">Zoznam príjemcov</Link>}>
          {favorites.length === 0 ? (
            <p className="py-8 text-center text-[1.05rem] text-muted-foreground">Nemáte žiadnych príjemcov pre rýchlu platbu.</p>
          ) : (
            <div className="no-scrollbar -mx-5 flex gap-5 overflow-x-auto px-5 pb-1">
              {favorites.map((r) => (
                <Link
                  key={r.id}
                  to="/platba"
                  search={{ recipientId: r.id }}
                  className="flex w-20 shrink-0 flex-col items-center gap-2 text-center"
                >
                  <RecipientAvatar name={r.name} />
                  <span className="line-clamp-2 text-sm">{r.name}</span>
                </Link>
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {settings.show_spending ? (
        <Section title="Prehľad výdavkov" action={<Link to="/mafin">Detail</Link>}>
          <div className="text-center">
            <p className="text-[1.05rem] text-muted-foreground">Rozdiel tento mesiac</p>
            <Money
              value={Math.abs(summary.difference)}
              signed={summary.difference < 0 ? "out" : "in"}
              sensitive
              className="mt-1 block text-[1.8rem] font-bold"
            />
          </div>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="text-right">
              <p className="text-muted-foreground">Výdavky</p>
              <Money value={summary.expense} sensitive className="text-[1.5rem] font-bold text-negative" />
            </div>
            <span className="h-12 w-px bg-border" />
            <div>
              <p className="text-muted-foreground">Príjmy</p>
              <Money value={summary.income} sensitive className="text-[1.5rem] font-bold text-positive" />
            </div>
          </div>
          <Link to="/mafin" className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-6">
            <CategoryDonut data={summary.byCategory} size={150} />
            <ul className="flex min-w-0 flex-col gap-3">
              {summary.byCategory.slice(0, 4).map((c) => {
                const cat = categoryOf(c.key);
                const Icon = cat.icon;
                return (
                  <li key={c.key} className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card" style={{ color: cat.color }}>
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </span>
                    <span className="truncate">{cat.label}</span>
                    <span className="ml-auto shrink-0 text-sm text-muted-foreground">{Math.round(c.share * 100)} %</span>
                  </li>
                );
              })}
              {summary.byCategory.length === 0 ? <li className="text-muted-foreground">Tento mesiac zatiaľ žiadne výdavky.</li> : null}
            </ul>
          </Link>
        </Section>
      ) : null}

      {settings.show_rates ? (
        <Section title="Kurzový lístok" action={<Link to="/kurzy">Detail</Link>} flush>
          <ul>
            {EXCHANGE_RATES.slice(0, 3).map((r) => (
              <li key={r.code} className="mx-5 grid grid-cols-[2rem_minmax(0,1fr)_3.5rem_auto] items-center gap-4 border-t border-border py-5">
                <span className="text-2xl" aria-hidden="true">{r.flag}</span>
                <span className="truncate text-[1.05rem]">{r.country}</span>
                <span className="text-[1.05rem] text-muted-foreground">{r.code}</span>
                <span className="text-right text-[1.05rem] tabular-nums">{r.buy.toFixed(4).replace(".", ",")}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="flex justify-center py-6">
        <button type="button" onClick={() => setEditOpen(true)} className="flex items-center gap-2 text-[0.95rem] font-medium text-link">
          <SlidersHorizontal className="h-5 w-5" /> Upraviť domovskú obrazovku
        </button>
      </div>

      <HomeEditSheet open={editOpen} onOpenChange={setEditOpen} settings={settings} />
    </div>
  );
}

function CardsSection({ cards, accounts }: { cards: Card[]; accounts: { id: string; balance: number }[] }) {
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const card = cards[Math.min(index, cards.length - 1)];
  const toggle = useBankMutation(
    (v: { id: string; internet_payments: boolean }) => updateCard(v.id, { internet_payments: v.internet_payments }),
    [qk.cards, qk.notifications],
  );
  if (!card) return null;
  const account = accounts.find((a) => a.id === card.account_id);
  const isCredit = card.card_type === "credit";
  const available = isCredit ? Number(card.credit_available ?? 0) : Number(account?.balance ?? 0);
  const limit = Number(card.credit_limit ?? 0);

  return (
    <Section title="Karty" action={<Link to="/karty">Zoznam kariet</Link>}>
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          const center = el.getBoundingClientRect().left + el.clientWidth / 2;
          const children = Array.from(el.children);
          let nearest = 0;
          let distance = Number.POSITIVE_INFINITY;
          children.forEach((child, i) => {
            const rect = child.getBoundingClientRect();
            const childCenter = rect.left + rect.width / 2;
            const nextDistance = Math.abs(center - childCenter);
            if (nextDistance < distance) {
              distance = nextDistance;
              nearest = i;
            }
          });
          if (nearest !== index) setIndex(nearest);
        }}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[11%] pb-1"
      >
        {cards.map((c) => (
          <Link key={c.id} to="/karty/$id" params={{ id: c.id }} className="w-[78%] max-w-[19rem] shrink-0 snap-center">
            <CardVisual design={c.design} brand={c.brand} cardType={c.card_type} blocked={c.status === "blocked"} />
          </Link>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
        {cards.map((c, i) => (
          <span key={c.id} className={i === index ? "h-2.5 w-2.5 rounded-full bg-primary" : "h-2 w-2 rounded-full bg-muted-foreground/50"} />
        ))}
      </div>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-[1.2rem] font-bold">{card.name}</h3>
          <p className="mt-1 text-muted-foreground tabular-nums">{card.masked_number}</p>
        </div>
        <div className="text-right">
          <Money value={available} sensitive className="text-[1.3rem] font-bold" />
          {isCredit ? (
            <>
              <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${limit ? Math.max(0, Math.min(100, (available / limit) * 100)) : 0}%` }} />
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">Z úver. rámca {formatAmount(limit)} EUR</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Disponibilný zostatok</p>
          )}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 border-t border-border pt-4">
        <label className="flex items-center justify-center gap-3 text-[1.05rem]">
          <Globe className="h-6 w-6 text-primary" strokeWidth={1.5} />
          <span>Internet</span>
          <Switch
            checked={card.internet_payments}
            disabled={toggle.isPending || card.status === "blocked"}
            onCheckedChange={(v) =>
              toggle.mutate(
                { id: card.id, internet_payments: v },
                {
                  onSuccess: () => toast.success(v ? "Internetové platby zapnuté" : "Internetové platby vypnuté"),
                  onError: (e) => toast.error(bankErrorMessage(e)),
                },
              )
            }
            aria-label="Internetové platby"
          />
        </label>
        <Link to="/karty/$id" params={{ id: card.id }} className="flex items-center justify-center gap-3 text-[1.05rem]">
          <SlidersHorizontal className="h-6 w-6 text-primary" strokeWidth={1.5} />
          Limity karty
        </Link>
      </div>
    </Section>
  );
}
