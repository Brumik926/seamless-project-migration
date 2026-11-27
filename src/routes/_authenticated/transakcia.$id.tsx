import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Repeat, UserPlus, FileText, Share2, XCircle, Clock, CheckCircle2 } from "lucide-react";
import { accountsQuery, qk, recipientsQuery, transactionQuery, useBankMutation, useInvalidateMoney } from "@/hooks/use-bank";
import { PageHeader } from "@/components/bank/PageHeader";
import { Money } from "@/components/bank/Money";
import { Iban } from "@/components/bank/Iban";
import { DetailRow } from "@/components/bank/rows";
import { SelectField, TextField } from "@/components/bank/fields";
import { BottomSheet } from "@/components/bank/BottomSheet";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CATEGORY_KEYS, categoryOf, txTypeLabel } from "@/lib/categories";
import { formatIban } from "@/lib/iban";
import { formatLongDate, formatMoney, formatShortDate, formatTime } from "@/lib/format";
import { bankErrorMessage } from "@/lib/errors";
import { cancelScheduledPayment, createRecipient, createTemplate, updateTransactionCategory } from "@/services/bank";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/transakcia/$id")({
  head: () => ({
    meta: [
      { title: "Detail pohybu – Tatra banka" },
      { name: "description", content: "Podrobnosti transakcie: suma, protistrana, symboly a správa." },
      { property: "og:title", content: "Detail pohybu – Tatra banka" },
      { property: "og:description", content: "Podrobnosti transakcie v mobilnom bankovníctve Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context: { queryClient }, params }) =>
    Promise.all([
      queryClient.ensureQueryData(transactionQuery(params.id)),
      queryClient.ensureQueryData(accountsQuery),
      queryClient.ensureQueryData(recipientsQuery),
    ]),
  errorComponent: () => (
    <div className="bank-section min-h-dvh">
      <PageHeader title="Detail pohybu" back="/pohyby" />
      <p className="px-5 text-muted-foreground">Tento pohyb sa nenašiel.</p>
    </div>
  ),
  component: TransactionDetail,
});

const STATUS: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  completed: { label: "Zaúčtovaná", icon: CheckCircle2, cls: "text-positive" },
  scheduled: { label: "Naplánovaná", icon: Clock, cls: "text-warning" },
  failed: { label: "Zlyhala – nedostatok prostriedkov", icon: XCircle, cls: "text-negative" },
  cancelled: { label: "Zrušená", icon: XCircle, cls: "text-muted-foreground" },
};

function TransactionDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const invalidateMoney = useInvalidateMoney();
  const { data: tx } = useSuspenseQuery(transactionQuery(id));
  const { data: accounts } = useSuspenseQuery(accountsQuery);
  const { data: recipients } = useSuspenseQuery(recipientsQuery);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState(tx.counterparty_name);
  const [cancelling, setCancelling] = useState(false);

  const account = accounts.find((a) => a.id === tx.account_id);
  const incoming = tx.direction === "in";
  const status = STATUS[tx.status] ?? STATUS["completed"]!;
  const StatusIcon = status.icon;
  const cat = categoryOf(tx.category);
  const CatIcon = cat.icon;
  const canSaveRecipient =
    !!tx.counterparty_iban && tx.tx_type !== "card" && tx.tx_type !== "internal" && !recipients.some((r) => r.iban === tx.counterparty_iban);
  const canRepeat = !incoming && !!tx.counterparty_iban && tx.tx_type !== "card";

  const setCategory = useBankMutation((c: string) => updateTransactionCategory(tx.id, c), [qk.transactions]);
  const saveRecipient = useBankMutation(
    () => createRecipient({ name: tx.counterparty_name, iban: tx.counterparty_iban ?? "" }),
    [qk.recipients],
  );
  const saveTemplate = useBankMutation(
    (name: string) =>
      createTemplate({
        name,
        recipient_name: tx.counterparty_name,
        iban: tx.counterparty_iban ?? "",
        amount: Number(tx.amount),
        variable_symbol: tx.variable_symbol,
        constant_symbol: tx.constant_symbol,
        specific_symbol: tx.specific_symbol,
        message: tx.message,
      }),
    [qk.templates],
  );

  async function share() {
    const text = [
      `${incoming ? "Prijatá" : "Odoslaná"} platba – Tatra banka`,
      `Suma: ${formatMoney(tx.amount)}`,
      `${incoming ? "Od" : "Príjemca"}: ${tx.counterparty_name}`,
      tx.counterparty_iban ? `IBAN: ${formatIban(tx.counterparty_iban)}` : "",
      `Dátum: ${formatShortDate(tx.booked_at)}`,
      tx.variable_symbol ? `VS: ${tx.variable_symbol}` : "",
      tx.message ? `Správa: ${tx.message}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      if (navigator.share) await navigator.share({ title: "Potvrdenie o platbe", text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Potvrdenie skopírované do schránky");
      }
    } catch {
      // User closed the share dialog.
    }
  }

  async function cancel() {
    setCancelling(true);
    try {
      const ok = await cancelScheduledPayment(tx.id);
      if (ok) toast.success("Naplánovaná platba bola zrušená");
      else toast.error("Platbu už nie je možné zrušiť");
      await Promise.all([invalidateMoney(), qc.invalidateQueries({ queryKey: qk.transaction(tx.id) })]);
    } catch (e) {
      toast.error(bankErrorMessage(e));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 animate-page-in">
      <PageHeader title="Detail pohybu" back />
      <section className="bank-section relative overflow-hidden text-center">
        <p className="text-[1.05rem] text-muted-foreground">{txTypeLabel(tx.tx_type, tx.direction)}</p>
        <Money
          value={tx.amount}
          signed={incoming ? "in" : "out"}
          className={cn("mt-3 block text-[2.55rem] font-bold tracking-tight", incoming ? "text-positive" : "text-negative", tx.status !== "completed" && "text-muted-foreground")}
        />
        <h2 className="mt-3 text-xl font-bold">{tx.counterparty_name || "Bez názvu"}</h2>
        <p className={cn("mt-3 inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-sm font-semibold", status.cls)}>
          <StatusIcon className="h-4 w-4" /> {status.label}
        </p>
      </section>

      <section className="bank-section pt-2">
        <DetailRow className="border-t-0" label="Dátum" value={`${formatLongDate(tx.booked_at)}, ${formatTime(tx.booked_at)}`} />
        <DetailRow label="Dátum splatnosti" value={formatShortDate(tx.execution_date)} />
        <DetailRow label="Účet" value={account?.name ?? "—"} />
        {tx.counterparty_iban ? (
          <DetailRow label={incoming ? "IBAN platiteľa" : "IBAN príjemcu"} value={<Iban value={tx.counterparty_iban} />} />
        ) : null}
        {tx.variable_symbol ? <DetailRow label="Variabilný symbol" value={tx.variable_symbol} /> : null}
        {tx.specific_symbol ? <DetailRow label="Špecifický symbol" value={tx.specific_symbol} /> : null}
        {tx.constant_symbol ? <DetailRow label="Konštantný symbol" value={tx.constant_symbol} /> : null}
        {tx.message ? <DetailRow label="Informácia pre príjemcu" value={tx.message} /> : null}
        {tx.payer_reference ? <DetailRow label="Referencia platiteľa" value={tx.payer_reference} /> : null}
        {tx.balance_after !== null ? <DetailRow label="Zostatok po pohybe" value={<Money value={tx.balance_after} sensitive />} /> : null}
        {tx.co2_kg ? <DetailRow label="Uhlíková stopa" value={`${String(tx.co2_kg).replace(".", ",")} kg CO₂e`} /> : null}
        <DetailRow label="Číslo transakcie" value={<span className="text-sm text-muted-foreground">{tx.id.slice(0, 8).toUpperCase()}</span>} />
      </section>

      <section className="bank-section">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-card" style={{ color: cat.color }}>
            <CatIcon className="h-5 w-5" />
          </span>
          <h3 className="text-lg font-bold">Kategória</h3>
        </div>
        <SelectField
          id="tx-category"
          label="Kategória pre MaFin"
          value={tx.category}
          disabled={setCategory.isPending}
          onChange={(e) =>
            setCategory.mutate(e.target.value, {
              onSuccess: () => {
                toast.success("Kategória uložená");
                void qc.invalidateQueries({ queryKey: qk.transaction(tx.id) });
              },
              onError: (err) => toast.error(bankErrorMessage(err)),
            })
          }
          options={CATEGORY_KEYS.map((k) => ({ value: k, label: CATEGORIES[k].label }))}
        />
      </section>

      <section className="bank-section flex flex-col gap-3">
        {tx.status === "scheduled" ? (
          <Button variant="bankDanger" size="xl" disabled={cancelling} onClick={cancel}>
            <XCircle /> {cancelling ? "Ruším…" : "Zrušiť naplánovanú platbu"}
          </Button>
        ) : null}
        {canRepeat ? (
          <Button asChild variant="bank" size="xl">
            <Link to="/platba" search={{ repeat: tx.id }}>
              <Repeat /> Zopakovať platbu
            </Link>
          </Button>
        ) : null}
        {canSaveRecipient ? (
          <Button
            variant="bankOutline"
            size="xl"
            disabled={saveRecipient.isPending}
            onClick={() =>
              saveRecipient.mutate(undefined, {
                onSuccess: () => toast.success("Príjemca uložený"),
                onError: (e) => toast.error(bankErrorMessage(e)),
              })
            }
          >
            <UserPlus /> Uložiť príjemcu
          </Button>
        ) : null}
        {canRepeat ? (
          <Button variant="bankOutline" size="xl" onClick={() => setTemplateOpen(true)}>
            <FileText /> Vytvoriť šablónu
          </Button>
        ) : null}
        <Button variant="bankGhost" size="xl" onClick={share}>
          <Share2 /> Zdieľať potvrdenie
        </Button>
      </section>

      <BottomSheet open={templateOpen} onOpenChange={setTemplateOpen} title="Nová šablóna">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = templateName.trim();
            if (!name) return void toast.error("Zadajte názov šablóny");
            saveTemplate.mutate(name.slice(0, 60), {
              onSuccess: () => {
                toast.success("Šablóna uložená");
                setTemplateOpen(false);
                navigate({ to: "/prijemcovia", search: { tab: "sablony" } });
              },
              onError: (err) => toast.error(bankErrorMessage(err)),
            });
          }}
          className="flex flex-col gap-4"
        >
          <TextField id="tpl-name" label="Názov šablóny" maxLength={60} value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          <Button type="submit" variant="bank" size="xl" disabled={saveTemplate.isPending}>
            Uložiť šablónu
          </Button>
        </form>
      </BottomSheet>
    </div>
  );
}
