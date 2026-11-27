import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { accountsQuery, qk, standingOrdersQuery, useBankMutation } from "@/hooks/use-bank";
import { PageHeader } from "@/components/bank/PageHeader";
import { SelectField, TextField, FieldShell } from "@/components/bank/fields";
import { EmptyState } from "@/components/bank/rows";
import { Money } from "@/components/bank/Money";
import { Iban } from "@/components/bank/Iban";
import { BottomSheet } from "@/components/bank/BottomSheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { FREQUENCIES, standingOrderSchema, zodErrors } from "@/lib/forms";
import { formatAmount, formatShortDate, todayIso } from "@/lib/format";
import { formatIban } from "@/lib/iban";
import { bankErrorMessage } from "@/lib/errors";
import { createStandingOrder, deleteStandingOrder, updateStandingOrder, type StandingOrder } from "@/services/bank";

export const Route = createFileRoute("/_authenticated/trvale-prikazy")({
  head: () => ({
    meta: [
      { title: "Trvalé príkazy – Tatra banka" },
      { name: "description", content: "Pravidelné platby: nájomné, sporenie a ďalšie trvalé príkazy." },
      { property: "og:title", content: "Trvalé príkazy – Tatra banka" },
      { property: "og:description", content: "Správa trvalých príkazov v mobilnom bankovníctve Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([queryClient.ensureQueryData(standingOrdersQuery), queryClient.ensureQueryData(accountsQuery)]),
  component: StandingOrdersPage,
});

type Draft = {
  id?: string;
  account_id: string;
  name: string;
  recipient_name: string;
  iban: string;
  amount: string;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  next_date: string;
  end_date: string;
  variable_symbol: string;
  specific_symbol: string;
  constant_symbol: string;
  message: string;
};

const freqLabel = (f: string) => FREQUENCIES.find((x) => x.value === f)?.label ?? f;

function StandingOrdersPage() {
  const { data: orders } = useSuspenseQuery(standingOrdersQuery);
  const { data: accounts } = useSuspenseQuery(accountsQuery);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<StandingOrder | null>(null);

  const save = useBankMutation(async (d: Draft) => {
    const p = standingOrderSchema.parse(d);
    if (d.id) await updateStandingOrder(d.id, p);
    else await createStandingOrder(p);
  }, [qk.standingOrders]);
  const toggle = useBankMutation((o: StandingOrder) => updateStandingOrder(o.id, { is_active: !o.is_active }), [qk.standingOrders]);
  const remove = useBankMutation((id: string) => deleteStandingOrder(id), [qk.standingOrders]);

  const blank = (): Draft => ({
    account_id: accounts.find((a) => a.is_primary)?.id ?? accounts[0]?.id ?? "",
    name: "",
    recipient_name: "",
    iban: "",
    amount: "",
    frequency: "monthly",
    next_date: todayIso(),
    end_date: "",
    variable_symbol: "",
    specific_symbol: "",
    constant_symbol: "",
    message: "",
  });

  function edit(o: StandingOrder) {
    setErrors({});
    setDraft({
      id: o.id,
      account_id: o.account_id,
      name: o.name,
      recipient_name: o.recipient_name,
      iban: formatIban(o.iban),
      amount: formatAmount(o.amount).replace(/\s/g, ""),
      frequency: o.frequency as Draft["frequency"],
      next_date: o.next_date,
      end_date: o.end_date ?? "",
      variable_symbol: o.variable_symbol ?? "",
      specific_symbol: o.specific_symbol ?? "",
      constant_symbol: o.constant_symbol ?? "",
      message: o.message ?? "",
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const parsed = standingOrderSchema.safeParse(draft);
    if (!parsed.success) return setErrors(zodErrors(parsed.error));
    if (!draft.id && parsed.data.next_date < todayIso()) return setErrors({ next_date: "Dátum nemôže byť v minulosti" });
    save.mutate(draft, {
      onSuccess: () => {
        toast.success(draft.id ? "Trvalý príkaz upravený" : "Trvalý príkaz vytvorený");
        setDraft(null);
      },
      onError: (err) => toast.error(bankErrorMessage(err)),
    });
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => draft && setDraft({ ...draft, [k]: v });

  return (
    <div className="flex min-h-dvh flex-col gap-3 animate-page-in">
      <PageHeader
        title="Trvalé príkazy"
        back
        right={
          <button type="button" aria-label="Nový trvalý príkaz" onClick={() => { setErrors({}); setDraft(blank()); }} className="text-primary">
            <Plus className="h-8 w-8" strokeWidth={1.6} />
          </button>
        }
      />
      <section className="flex flex-col gap-3 px-5">
        {orders.length === 0 ? (
          <div className="bank-section rounded-xl">
            <EmptyState title="Nemáte žiadne trvalé príkazy.">
              <Button variant="bank" onClick={() => setDraft(blank())}>Vytvoriť trvalý príkaz</Button>
            </EmptyState>
          </div>
        ) : null}
        {orders.map((o) => {
          const acc = accounts.find((a) => a.id === o.account_id);
          return (
            <article key={o.id} className="overflow-hidden rounded-xl bg-background shadow-tile">
              <button type="button" onClick={() => edit(o)} className="flex w-full items-start gap-4 px-5 pt-5 pb-4 text-left">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-primary">
                  <CalendarClock className="h-6 w-6" strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-bold">{o.name}</span>
                  <span className="block truncate text-[0.95rem] text-muted-foreground">{o.recipient_name}</span>
                  <Iban value={o.iban} className="block truncate text-sm text-muted-foreground" />
                </span>
                <Money value={o.amount} className="shrink-0 text-lg font-bold" />
              </button>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-5 py-3 text-sm">
                <span className="text-muted-foreground">
                  {freqLabel(o.frequency)} · {o.is_active ? `ďalšia ${formatShortDate(o.next_date)}` : "pozastavený"}
                  {o.end_date ? ` · do ${formatShortDate(o.end_date)}` : ""} · z účtu {acc?.name ?? "—"}
                </span>
                <span className="flex items-center gap-3">
                  <Switch
                    checked={o.is_active}
                    aria-label={o.is_active ? "Pozastaviť" : "Aktivovať"}
                    disabled={toggle.isPending}
                    onCheckedChange={() =>
                      toggle.mutate(o, {
                        onSuccess: () => toast.success(o.is_active ? "Príkaz pozastavený" : "Príkaz aktivovaný"),
                        onError: (err) => toast.error(bankErrorMessage(err)),
                      })
                    }
                  />
                  <button type="button" aria-label="Zrušiť trvalý príkaz" onClick={() => setToDelete(o)} className="text-negative">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </span>
              </div>
            </article>
          );
        })}
        <p className="px-1 pb-4 text-center text-xs text-muted-foreground">
          Trvalé príkazy sa vykonajú automaticky pri otvorení aplikácie v deň splatnosti alebo neskôr.
        </p>
      </section>

      <BottomSheet open={!!draft} onOpenChange={(v) => !v && setDraft(null)} title={draft?.id ? "Upraviť trvalý príkaz" : "Nový trvalý príkaz"}>
        {draft ? (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <SelectField id="so-acc" label="Z účtu" value={draft.account_id} onChange={(e) => set("account_id", e.target.value)} options={accounts.map((a) => ({ value: a.id, label: a.name }))} error={errors["account_id"]} />
            <TextField id="so-name" label="Názov príkazu" required maxLength={60} value={draft.name} onChange={(e) => set("name", e.target.value)} error={errors["name"]} />
            <TextField id="so-rname" label="Názov príjemcu" required maxLength={70} value={draft.recipient_name} onChange={(e) => set("recipient_name", e.target.value)} error={errors["recipient_name"]} />
            <TextField id="so-iban" label="IBAN" required autoCapitalize="characters" value={draft.iban} onChange={(e) => set("iban", e.target.value.toUpperCase())} onBlur={() => set("iban", formatIban(draft.iban))} error={errors["iban"]} />
            <TextField id="so-amount" label="Suma (EUR)" required inputMode="decimal" placeholder="0,00" value={draft.amount} onChange={(e) => set("amount", e.target.value)} error={errors["amount"]} />
            <SelectField id="so-freq" label="Frekvencia" value={draft.frequency} onChange={(e) => set("frequency", e.target.value as Draft["frequency"])} options={FREQUENCIES.map((f) => ({ value: f.value, label: f.label }))} />
            <FieldShell label="Prvá / ďalšia platba" required htmlFor="so-next" error={errors["next_date"]}>
              <input id="so-next" type="date" min={todayIso()} value={draft.next_date} onChange={(e) => set("next_date", e.target.value)} className="relative w-full bg-transparent text-[1.05rem] outline-none" />
            </FieldShell>
            <FieldShell label="Platí do (nepovinné)" htmlFor="so-end" error={errors["end_date"]}>
              <input id="so-end" type="date" min={draft.next_date} value={draft.end_date} onChange={(e) => set("end_date", e.target.value)} className="relative w-full bg-transparent text-[1.05rem] outline-none" />
            </FieldShell>
            <TextField id="so-vs" label="Variabilný symbol" inputMode="numeric" maxLength={10} value={draft.variable_symbol} onChange={(e) => set("variable_symbol", e.target.value.replace(/\D/g, ""))} error={errors["variable_symbol"]} />
            <TextField id="so-ss" label="Špecifický symbol" inputMode="numeric" maxLength={10} value={draft.specific_symbol} onChange={(e) => set("specific_symbol", e.target.value.replace(/\D/g, ""))} error={errors["specific_symbol"]} />
            <TextField id="so-ks" label="Konštantný symbol" inputMode="numeric" maxLength={4} value={draft.constant_symbol} onChange={(e) => set("constant_symbol", e.target.value.replace(/\D/g, ""))} error={errors["constant_symbol"]} />
            <TextField id="so-msg" label="Informácia pre príjemcu" maxLength={140} value={draft.message} onChange={(e) => set("message", e.target.value)} error={errors["message"]} />
            <Button type="submit" variant="bank" size="xl" disabled={save.isPending}>
              {save.isPending ? "Ukladám…" : "Uložiť trvalý príkaz"}
            </Button>
          </form>
        ) : null}
      </BottomSheet>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Zrušiť trvalý príkaz „{toDelete?.name}“?</AlertDialogTitle>
            <AlertDialogDescription>Budúce platby sa už nevykonajú. Doterajšie pohyby zostanú v histórii.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ponechať</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!toDelete) return;
                remove.mutate(toDelete.id, {
                  onSuccess: () => toast.success("Trvalý príkaz zrušený"),
                  onError: (err) => toast.error(bankErrorMessage(err)),
                });
                setToDelete(null);
              }}
            >
              Zrušiť príkaz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
