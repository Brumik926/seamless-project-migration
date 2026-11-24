import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Unlock, Pencil } from "lucide-react";
import { accountsQuery, cardLimitsQuery, cardsQuery, qk, transactionsQuery, useBankMutation } from "@/hooks/use-bank";
import { PageHeader } from "@/components/bank/PageHeader";
import { Section } from "@/components/bank/Section";
import { CardVisual } from "@/components/bank/CardVisual";
import { Money } from "@/components/bank/Money";
import { DetailRow, ToggleRow, EmptyState } from "@/components/bank/rows";
import { TransactionRow } from "@/components/bank/TransactionRow";
import { BottomSheet } from "@/components/bank/BottomSheet";
import { TextField } from "@/components/bank/fields";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatAmount } from "@/lib/format";
import { bankErrorMessage } from "@/lib/errors";
import { updateCard, updateCardLimits } from "@/services/bank";
import { CARD_LIMIT_RANGES, clampLimit } from "@/lib/card-limits";

export const Route = createFileRoute("/_authenticated/karty/$id")({
  head: () => ({
    meta: [
      { title: "Detail karty – Tatra banka" },
      { name: "description", content: "Blokovanie karty, internetové platby a denné limity." },
      { property: "og:title", content: "Detail karty – Tatra banka" },
      { property: "og:description", content: "Nastavenia platobnej karty v aplikácii Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context: { queryClient }, params }) =>
    Promise.all([
      queryClient.ensureQueryData(cardsQuery),
      queryClient.ensureQueryData(accountsQuery),
      queryClient.ensureQueryData(cardLimitsQuery(params.id)),
      queryClient.ensureQueryData(transactionsQuery),
    ]),
  errorComponent: () => (
    <div>
      <PageHeader title="Detail karty" back="/karty" />
      <p className="bank-section text-muted-foreground">Karta sa nenašla.</p>
    </div>
  ),
  component: CardDetail,
});

type LimitKey = keyof typeof CARD_LIMIT_RANGES;

function CardDetail() {
  const { id } = Route.useParams();
  const { data: cards } = useSuspenseQuery(cardsQuery);
  const { data: accounts } = useSuspenseQuery(accountsQuery);
  const { data: limits } = useSuspenseQuery(cardLimitsQuery(id));
  const { data: transactions } = useSuspenseQuery(transactionsQuery);
  const card = cards.find((c) => c.id === id);
  const [draft, setDraft] = useState<Record<LimitKey, number>>({
    atm_daily: Number(limits.atm_daily),
    pos_daily: Number(limits.pos_daily),
    internet_daily: Number(limits.internet_daily),
  });
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(card?.name ?? "");

  useEffect(() => {
    setDraft({ atm_daily: Number(limits.atm_daily), pos_daily: Number(limits.pos_daily), internet_daily: Number(limits.internet_daily) });
  }, [limits]);

  const patchCard = useBankMutation(
    (p: Parameters<typeof updateCard>[1]) => updateCard(id, p),
    [qk.cards, qk.notifications],
  );
  const saveLimits = useBankMutation(
    (p: Record<LimitKey, number>) => updateCardLimits(id, p),
    [qk.cardLimits(id), qk.notifications],
  );
  const cardTx = useMemo(() => transactions.filter((t) => t.card_id === id).slice(0, 5), [transactions, id]);

  if (!card) {
    return (
      <div>
        <PageHeader title="Detail karty" back="/karty" />
        <p className="bank-section text-muted-foreground">Karta sa nenašla.</p>
      </div>
    );
  }
  const account = accounts.find((a) => a.id === card.account_id);
  const blocked = card.status === "blocked";
  const credit = card.card_type === "credit";
  const dirty =
    draft.atm_daily !== Number(limits.atm_daily) ||
    draft.pos_daily !== Number(limits.pos_daily) ||
    draft.internet_daily !== Number(limits.internet_daily);

  const patch = (p: Parameters<typeof updateCard>[1], ok: string) =>
    patchCard.mutate(p, { onSuccess: () => toast.success(ok), onError: (e) => toast.error(bankErrorMessage(e)) });

  return (
    <div className="flex flex-col gap-3 animate-page-in">
      <PageHeader
        title="Detail karty"
        back
        right={
          <button type="button" aria-label="Premenovať kartu" onClick={() => { setName(card.name); setRenameOpen(true); }} className="text-primary">
            <Pencil className="h-6 w-6" strokeWidth={1.5} />
          </button>
        }
      />
      <section className="bank-section">
        <div className="mx-auto max-w-[20rem]">
          <CardVisual design={card.design} brand={card.brand} cardType={card.card_type} holder={card.holder_name} number={card.masked_number} blocked={blocked} />
        </div>
        <div className="mt-5 text-center">
          <h2 className="text-xl font-bold">{card.name}</h2>
          <p className="text-muted-foreground tabular-nums">{card.masked_number}</p>
          <Money value={credit ? (card.credit_available ?? 0) : (account?.balance ?? 0)} sensitive className="mt-3 block text-[1.8rem] font-bold" />
          <p className="text-sm text-muted-foreground">
            {credit ? `Disponibilný zostatok z rámca ${formatAmount(card.credit_limit ?? 0)} EUR` : "Disponibilný zostatok na účte"}
          </p>
        </div>
        <Button variant={blocked ? "bank" : "bankDanger"} size="xl" className="mt-6" disabled={patchCard.isPending} onClick={() => (blocked ? patch({ status: "active" }, "Karta odblokovaná") : setConfirmBlock(true))}>
          {blocked ? <Unlock /> : <Lock />} {blocked ? "Odblokovať kartu" : "Dočasne zablokovať kartu"}
        </Button>
      </section>

      <Section title="Nastavenia karty">
        <ToggleRow
          id="internet"
          label="Internetové platby"
          description="Platby kartou na internete"
          checked={card.internet_payments}
          disabled={blocked || patchCard.isPending}
          onCheckedChange={(v) => patch({ internet_payments: v }, v ? "Internetové platby zapnuté" : "Internetové platby vypnuté")}
        />
        <ToggleRow
          id="contactless"
          label="Bezkontaktné platby"
          description="Platby priložením karty"
          checked={card.contactless}
          disabled={blocked || patchCard.isPending}
          onCheckedChange={(v) => patch({ contactless: v }, v ? "Bezkontaktné platby zapnuté" : "Bezkontaktné platby vypnuté")}
        />
      </Section>

      <Section title="Denné limity">
        <div className="flex flex-col gap-7">
          {(Object.keys(CARD_LIMIT_RANGES) as LimitKey[]).map((k) => {
            const r = CARD_LIMIT_RANGES[k];
            return (
              <div key={k}>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <label htmlFor={`lim-${k}`} className="text-[1.05rem]">{r.label}</label>
                  <Money value={draft[k]} className="text-lg font-bold" />
                </div>
                <Slider
                  id={`lim-${k}`}
                  min={0}
                  max={r.max}
                  step={r.step}
                  value={[draft[k]]}
                  disabled={blocked}
                  onValueChange={([v]) => setDraft((d) => ({ ...d, [k]: clampLimit(k, v ?? 0) }))}
                  aria-label={r.label}
                />
                <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>0 EUR</span>
                  <span>{formatAmount(r.max)} EUR</span>
                </div>
              </div>
            );
          })}
          <Button
            variant="bank"
            size="xl"
            disabled={!dirty || saveLimits.isPending || blocked}
            onClick={() =>
              saveLimits.mutate(draft, {
                onSuccess: () => toast.success("Limity boli uložené"),
                onError: (e) => toast.error(bankErrorMessage(e)),
              })
            }
          >
            {saveLimits.isPending ? "Ukladám…" : "Uložiť limity"}
          </Button>
        </div>
      </Section>

      <Section title="Informácie">
        <DetailRow className="border-t-0" label="Typ karty" value={`${card.brand} ${credit ? "kreditná" : "debetná"}`} />
        <DetailRow label="Držiteľ" value={card.holder_name || "—"} />
        <DetailRow label="Platnosť do" value={card.expiry} />
        <DetailRow label="Účet" value={account?.name ?? "—"} />
        <DetailRow label="Stav" value={blocked ? <span className="text-negative">Zablokovaná</span> : <span className="text-positive">Aktívna</span>} />
      </Section>

      <section className="bank-section pr-0 pb-0">
        <h2 className="mb-3 text-[1.45rem] font-extrabold">Posledné platby kartou</h2>
        {cardTx.length === 0 ? <EmptyState title="Kartou ste zatiaľ neplatili." /> : cardTx.map((t) => <TransactionRow key={t.id} tx={t} />)}
      </section>

      <AlertDialog open={confirmBlock} onOpenChange={setConfirmBlock}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Zablokovať kartu?</AlertDialogTitle>
            <AlertDialogDescription>Kým kartu neodblokujete, nebude možné ňou platiť ani vyberať hotovosť.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => patch({ status: "blocked" }, "Karta zablokovaná")}>
              Zablokovať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomSheet open={renameOpen} onOpenChange={setRenameOpen} title="Premenovať kartu">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (n.length < 1 || n.length > 40) return void toast.error("Názov musí mať 1 až 40 znakov");
            patchCard.mutate({ name: n }, { onSuccess: () => { toast.success("Karta premenovaná"); setRenameOpen(false); }, onError: (err) => toast.error(bankErrorMessage(err)) });
          }}
          className="flex flex-col gap-4"
        >
          <TextField id="card-name" label="Názov karty" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="bank" size="xl" disabled={patchCard.isPending}>Uložiť</Button>
        </form>
      </BottomSheet>
    </div>
  );
}
