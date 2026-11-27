import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, CalendarDays, BookOpen, UserRound, CircleHelp, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import {
  accountsQuery,
  qk,
  recipientsQuery,
  templatesQuery,
  transactionsQuery,
  useInvalidateMoney,
} from "@/hooks/use-bank";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/bank/PageHeader";
import { Section } from "@/components/bank/Section";
import { Money } from "@/components/bank/Money";
import { Iban } from "@/components/bank/Iban";
import { DetailRow } from "@/components/bank/rows";
import { FieldShell, SelectField, TextAreaField, TextField } from "@/components/bank/fields";
import { BottomSheet } from "@/components/bank/BottomSheet";
import { RecipientPicker } from "@/components/bank/RecipientPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { executePayment } from "@/lib/payments.functions";
import { checkSufficientFunds, parseAmount, paymentFormSchema, type PaymentForm } from "@/lib/payment-schema";
import { CATEGORIES, PAYMENT_CATEGORIES } from "@/lib/categories";
import { formatIban, normalizeIban } from "@/lib/iban";
import { formatAmount, formatShortDate, todayIso } from "@/lib/format";
import { createRecipient, createTemplate } from "@/services/bank";
import { bankErrorMessage } from "@/lib/errors";

type PlatbaSearch = { recipientId?: string; templateId?: string; repeat?: string; accountId?: string };

export const Route = createFileRoute("/_authenticated/platba")({
  validateSearch: (s: Record<string, unknown>): PlatbaSearch => {
    const out: PlatbaSearch = {};
    for (const k of ["recipientId", "templateId", "repeat", "accountId"] as const) {
      const v = s[k];
      if (typeof v === "string" && v) out[k] = v;
    }
    return out;
  },
  head: () => ({
    meta: [
      { title: "Nová platba – Tatra banka" },
      { name: "description", content: "Zadajte SEPA platbu s IBAN, sumou a symbolmi." },
      { property: "og:title", content: "Nová platba – Tatra banka" },
      { property: "og:description", content: "Zadanie platobného príkazu v mobilnom bankovníctve Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(accountsQuery),
      queryClient.ensureQueryData(recipientsQuery),
      queryClient.ensureQueryData(templatesQuery),
      queryClient.ensureQueryData(transactionsQuery),
    ]),
  component: PaymentPage,
});

type Draft = {
  accountId: string;
  recipientName: string;
  iban: string;
  amount: string;
  executionDate: string;
  message: string;
  variableSymbol: string;
  specificSymbol: string;
  constantSymbol: string;
  payerReference: string;
  category: string;
};

const CONSTANT_SYMBOLS = [
  { code: "0308", label: "Platba za služby" },
  { code: "0558", label: "Finančné platby – ostatné" },
  { code: "1148", label: "Zálohová platba" },
  { code: "3558", label: "Platba poistného" },
  { code: "0138", label: "Mzdy a platy" },
];

type Done = { transactionId: string; status: string; balance: number | null; form: PaymentForm };

function PaymentPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const invalidateMoney = useInvalidateMoney();
  const runPayment = useServerFn(executePayment);
  const { data: accounts } = useSuspenseQuery(accountsQuery);
  const { data: recipients } = useSuspenseQuery(recipientsQuery);
  const { data: templates } = useSuspenseQuery(templatesQuery);
  const { data: transactions } = useSuspenseQuery(transactionsQuery);

  const initial = useMemo<Draft>(() => {
    const today = todayIso();
    const base: Draft = {
      accountId: (accounts.find((a) => a.id === search.accountId) ?? accounts[0])?.id ?? "",
      recipientName: "",
      iban: "",
      amount: "",
      executionDate: today,
      message: "",
      variableSymbol: "",
      specificSymbol: "",
      constantSymbol: "",
      payerReference: "",
      category: "prevody",
    };
    const r = recipients.find((x) => x.id === search.recipientId);
    if (r) return { ...base, recipientName: r.name, iban: formatIban(r.iban) };
    const t = templates.find((x) => x.id === search.templateId);
    if (t)
      return {
        ...base,
        recipientName: t.recipient_name,
        iban: formatIban(t.iban),
        amount: t.amount ? formatAmount(t.amount).replace(/\s/g, "") : "",
        message: t.message ?? "",
        variableSymbol: t.variable_symbol ?? "",
        specificSymbol: t.specific_symbol ?? "",
        constantSymbol: t.constant_symbol ?? "",
      };
    const tx = transactions.find((x) => x.id === search.repeat);
    if (tx && tx.counterparty_iban)
      return {
        ...base,
        accountId: tx.account_id,
        recipientName: tx.counterparty_name,
        iban: formatIban(tx.counterparty_iban),
        amount: formatAmount(tx.amount).replace(/\s/g, ""),
        message: tx.message ?? "",
        variableSymbol: tx.variable_symbol ?? "",
        specificSymbol: tx.specific_symbol ?? "",
        constantSymbol: tx.constant_symbol ?? "",
        category: tx.category === "prijem" ? "prevody" : tx.category,
      };
    return base;
    // Prefill only when the requested source changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.recipientId, search.templateId, search.repeat, search.accountId]);

  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [step, setStep] = useState<"form" | "review" | "done">("form");
  const [validated, setValidated] = useState<PaymentForm | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [payerOpen, setPayerOpen] = useState(false);
  const [ksOpen, setKsOpen] = useState(false);
  const [saveRecipient, setSaveRecipient] = useState(false);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    setDraft(initial);
    setStep("form");
    setErrors({});
  }, [initial]);

  const account = accounts.find((a) => a.id === draft.accountId) ?? accounts[0];
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const isKnownRecipient = recipients.some((r) => r.iban === normalizeIban(draft.iban));
  const today = todayIso();

  function review(e: React.FormEvent) {
    e.preventDefault();
    const parsed = paymentFormSchema.safeParse({
      accountId: draft.accountId,
      recipientName: draft.recipientName,
      iban: draft.iban,
      amount: draft.amount ? parseAmount(draft.amount) : Number.NaN,
      currency: "EUR",
      executionDate: draft.executionDate,
      variableSymbol: draft.variableSymbol,
      constantSymbol: draft.constantSymbol,
      specificSymbol: draft.specificSymbol,
      message: draft.message,
      payerReference: draft.payerReference,
      category: draft.category,
    });
    if (!parsed.success) {
      const errs: Partial<Record<keyof Draft, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Draft;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      toast.error("Skontrolujte zvýraznené polia");
      return;
    }
    if (parsed.data.executionDate < today) {
      setErrors({ executionDate: "Dátum splatnosti nemôže byť v minulosti" });
      return;
    }
    if (account && normalizeIban(account.iban) === parsed.data.iban) {
      setErrors({ iban: "Nemôžete posielať peniaze na ten istý účet" });
      return;
    }
    if (account && !checkSufficientFunds(Number(account.balance), parsed.data.amount, parsed.data.executionDate, today)) {
      setErrors({ amount: `Na účte nie je dostatok prostriedkov (zostatok ${formatAmount(account.balance)} EUR)` });
      return;
    }
    setValidated(parsed.data);
    setTemplateName(parsed.data.recipientName.slice(0, 60));
    // One key per reviewed payment: double taps or retries cannot pay twice.
    idempotencyKey.current = crypto.randomUUID();
    setStep("review");
    window.scrollTo({ top: 0 });
  }

  async function confirm() {
    if (!validated || !idempotencyKey.current || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const result = await runPayment({ data: { ...validated, idempotencyKey: idempotencyKey.current } });
      if (!result.ok) {
        toast.error(result.error);
        if (result.error.includes("prostriedkov")) setStep("form");
        return;
      }
      const extras: Promise<unknown>[] = [];
      if (saveRecipient && !isKnownRecipient)
        extras.push(createRecipient({ name: validated.recipientName, iban: validated.iban }).catch(() => toast.error("Príjemcu sa nepodarilo uložiť")));
      if (saveTemplate && templateName.trim())
        extras.push(
          createTemplate({
            name: templateName.trim().slice(0, 60),
            recipient_name: validated.recipientName,
            iban: validated.iban,
            amount: validated.amount,
            variable_symbol: validated.variableSymbol ?? null,
            constant_symbol: validated.constantSymbol ?? null,
            specific_symbol: validated.specificSymbol ?? null,
            message: validated.message ?? null,
          }).catch(() => toast.error("Šablónu sa nepodarilo uložiť")),
        );
      await Promise.all(extras);
      await Promise.all([
        invalidateMoney(),
        qc.invalidateQueries({ queryKey: qk.recipients }),
        qc.invalidateQueries({ queryKey: qk.templates }),
      ]);
      setDone({ transactionId: result.transactionId, status: result.status, balance: result.balance, form: validated });
      setStep("done");
      window.scrollTo({ top: 0 });
    } catch (err) {
      toast.error(bankErrorMessage(err, "Platbu sa nepodarilo odoslať. Skúste to znova."));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  function newPayment() {
    setDraft({ ...initial, recipientName: "", iban: "", amount: "", message: "", variableSymbol: "", specificSymbol: "", constantSymbol: "", payerReference: "" });
    setDone(null);
    setValidated(null);
    setSaveRecipient(false);
    setSaveTemplate(false);
    idempotencyKey.current = null;
    setStep("form");
    navigate({ to: "/platba", search: {}, replace: true });
  }

  if (step === "done" && done) {
    const scheduled = done.status === "scheduled";
    const failed = done.status === "failed";
    return (
      <div className="flex min-h-[calc(100dvh-6.5rem)] flex-col animate-page-in">
        <PageHeader title="Platba" />
        <section className="bank-section flex flex-1 flex-col items-center text-center">
          <span className={`mt-6 grid h-24 w-24 place-items-center rounded-full animate-pop-in ${failed ? "bg-negative/15 text-negative" : scheduled ? "bg-warning/15 text-warning" : "bg-positive/15 text-positive"}`}>
            {scheduled ? <Clock className="h-14 w-14" strokeWidth={1.5} /> : <CheckCircle2 className="h-14 w-14" strokeWidth={1.5} />}
          </span>
          <h2 className="mt-6 text-2xl font-extrabold">
            {failed ? "Platba nebola vykonaná" : scheduled ? "Platba je naplánovaná" : "Platba bola odoslaná"}
          </h2>
          <Money value={done.form.amount} className="mt-3 block text-[2.2rem] font-bold" />
          <p className="mt-1 text-muted-foreground">
            pre <strong className="text-foreground">{done.form.recipientName}</strong>
          </p>
          <Iban value={done.form.iban} className="mt-1 text-sm text-muted-foreground" />
          <p className="mt-5 rounded-xl bg-card px-4 py-3 text-sm text-muted-foreground">
            {scheduled
              ? `Platbu vykonáme ${formatShortDate(done.form.executionDate)}, ak bude na účte dostatok prostriedkov.`
              : done.balance !== null
                ? `Nový zostatok na účte: ${formatAmount(done.balance)} EUR`
                : "Platba bola spracovaná."}
          </p>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Platba bola úspešne spracovaná.
          </p>
          <div className="mt-auto flex w-full flex-col gap-3 pt-8">
            <Button asChild variant="bank" size="xl">
              <Link to="/transakcia/$id" params={{ id: done.transactionId }}>
                Detail platby
              </Link>
            </Button>
            <Button variant="bankOutline" size="xl" onClick={newPayment}>
              Nová platba
            </Button>
            <Button asChild variant="bankGhost" size="xl">
              <Link to="/domov">Domov</Link>
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (step === "review" && validated && account) {
    return (
      <div className="flex flex-col gap-3 animate-page-in">
        <PageHeader title="Kontrola platby" back={false} right={null}>
          <button type="button" onClick={() => setStep("form")} className="mt-2 text-[0.95rem] font-medium text-link">
            ← Upraviť údaje
          </button>
        </PageHeader>
        <section className="bank-section text-center">
          <p className="text-muted-foreground">Suma na odoslanie</p>
          <Money value={validated.amount} className="mt-1 block text-[2.4rem] font-extrabold" />
          <p className="mt-1 text-muted-foreground">
            {validated.executionDate === today ? "Splatnosť: čo najskôr" : `Splatnosť: ${formatShortDate(validated.executionDate)}`}
          </p>
        </section>
        <Section title="Platiteľ">
          <DetailRow className="border-t-0" label="Účet" value={account.name} />
          <DetailRow label="IBAN" value={<Iban value={account.iban} />} />
          <DetailRow label="Zostatok po platbe" value={<Money value={validated.executionDate === today ? Number(account.balance) - validated.amount : Number(account.balance)} sensitive />} />
        </Section>
        <Section title="Príjemca">
          <DetailRow className="border-t-0" label="Názov" value={validated.recipientName} />
          <DetailRow label="IBAN" value={<Iban value={validated.iban} />} />
          {validated.message ? <DetailRow label="Informácia pre príjemcu" value={validated.message} /> : null}
          {validated.variableSymbol ? <DetailRow label="Variabilný symbol" value={validated.variableSymbol} /> : null}
          {validated.specificSymbol ? <DetailRow label="Špecifický symbol" value={validated.specificSymbol} /> : null}
          {validated.constantSymbol ? <DetailRow label="Konštantný symbol" value={validated.constantSymbol} /> : null}
          {validated.payerReference ? <DetailRow label="Referencia platiteľa" value={validated.payerReference} /> : null}
          <DetailRow label="Kategória" value={CATEGORIES[validated.category as keyof typeof CATEGORIES]?.label ?? "Prevody"} />
        </Section>
        <section className="bank-section flex flex-col gap-4">
          {!isKnownRecipient ? (
            <label className="flex items-center gap-3 text-[1.05rem]">
              <Checkbox checked={saveRecipient} onCheckedChange={(v) => setSaveRecipient(v === true)} /> Uložiť príjemcu
            </label>
          ) : null}
          <label className="flex items-center gap-3 text-[1.05rem]">
            <Checkbox checked={saveTemplate} onCheckedChange={(v) => setSaveTemplate(v === true)} /> Uložiť ako šablónu
          </label>
          {saveTemplate ? (
            <TextField id="tpl" label="Názov šablóny" maxLength={60} value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          ) : null}
          <Button variant="bank" size="xl" onClick={confirm} disabled={submitting} className="mt-2">
            {submitting ? "Odosielam…" : "Potvrdiť a odoslať"}
          </Button>
          <Button variant="bankOutline" size="xl" onClick={() => setStep("form")} disabled={submitting}>
            Späť na úpravu
          </Button>
          <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0" /> Platba bude spracovaná prostredníctvom SEPA prevodu.
          </p>
        </section>
      </div>
    );
  }

  return (
    <form onSubmit={review} noValidate className="flex flex-col gap-3 animate-page-in">
      <PageHeader
        title="Platba"
        back
        right={
          <Link to="/kontakty" aria-label="Pomoc" className="text-primary">
            <CircleHelp className="h-9 w-9" strokeWidth={1.3} />
          </Link>
        }
      />
      {account ? (
        <section className="bank-section pb-0">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Platiteľ</span>
              <span className="text-[1.15rem]">{account.name}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">IBAN</span>
              <Iban value={account.iban} className="truncate text-right text-[1.05rem]" />
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Aktuálny zostatok</span>
              <Money value={account.balance} sensitive className="text-[1.15rem]" />
            </div>
          </div>
          {accounts.length > 1 ? (
            <button type="button" onClick={() => setPayerOpen(true)} className="mt-5 flex w-full items-center justify-center gap-3 border-t border-border py-5 text-[1.1rem]">
              Zmeniť platiteľa <ChevronRight className="h-6 w-6 text-primary" />
            </button>
          ) : (
            <div className="h-6" />
          )}
        </section>
      ) : null}

      <Section title="Príjemca" action={<button type="button" onClick={() => setPickerOpen(true)}>Zoznam príjemcov</button>}>
        <div className="flex flex-col gap-4">
          <button type="button" onClick={() => setPickerOpen(true)} className="bank-field flex h-[4.25rem] items-center justify-between px-5 text-left text-[1.05rem] text-muted-foreground">
            Vyberte príjemcu
            <UserRound className="h-7 w-7 text-primary" strokeWidth={1.4} />
          </button>
          <TextField
            id="iban"
            label="IBAN"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={draft.iban}
            onChange={(e) => set("iban", e.target.value.toUpperCase())}
            onBlur={() => draft.iban && set("iban", formatIban(draft.iban))}
            error={errors.iban}
            placeholder="SK00 0000 0000 0000 0000 0000"
          />
          <TextField
            id="recipientName"
            label="Názov príjemcu"
            required
            maxLength={70}
            value={draft.recipientName}
            onChange={(e) => set("recipientName", e.target.value)}
            error={errors.recipientName}
          />
          <div className="my-1 h-px bg-border" />
          <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-4">
            <TextField
              id="amount"
              label="Suma"
              required
              inline
              inputMode="decimal"
              placeholder="0,00"
              value={draft.amount}
              onChange={(e) => set("amount", e.target.value.replace(/[^\d.,\s]/g, ""))}
              error={errors.amount}
            />
            <FieldShell label="" htmlFor="currency" inline>
              <select id="currency" aria-label="Mena" value="EUR" onChange={() => undefined} className="w-full cursor-pointer appearance-none bg-transparent text-[1.05rem] outline-none">
                <option value="EUR">EUR</option>
              </select>
              <ChevronDown className="pointer-events-none h-6 w-6 shrink-0 text-primary" />
            </FieldShell>
          </div>
          <FieldShell label="Dátum splatnosti" required htmlFor="executionDate" inline error={errors.executionDate}>
            <span className="relative flex items-center gap-3">
              <span className="text-[1.05rem]">{draft.executionDate === today ? "Čo najskôr" : formatShortDate(draft.executionDate)}</span>
              <CalendarDays className="h-7 w-7 text-primary" strokeWidth={1.4} />
              <input
                id="executionDate"
                type="date"
                min={today}
                value={draft.executionDate}
                onChange={(e) => set("executionDate", e.target.value || today)}
                className="absolute inset-0 opacity-0"
                aria-label="Dátum splatnosti"
              />
            </span>
          </FieldShell>
          <TextAreaField id="message" label="Informácia pre príjemcu" maxLength={140} value={draft.message} onChange={(e) => set("message", e.target.value)} error={errors.message} />
        </div>
      </Section>

      <Section title="Ostatné údaje">
        <div className="flex flex-col gap-4">
          <TextField id="vs" label="Variabilný symbol" inputMode="numeric" maxLength={10} value={draft.variableSymbol} onChange={(e) => set("variableSymbol", e.target.value.replace(/\D/g, ""))} error={errors.variableSymbol} />
          <TextField id="ss" label="Špecifický symbol" inputMode="numeric" maxLength={10} value={draft.specificSymbol} onChange={(e) => set("specificSymbol", e.target.value.replace(/\D/g, ""))} error={errors.specificSymbol} />
          <div className="relative">
            <TextField id="ks" label="Konštantný symbol" inputMode="numeric" maxLength={4} value={draft.constantSymbol} onChange={(e) => set("constantSymbol", e.target.value.replace(/\D/g, ""))} error={errors.constantSymbol} className="pr-10" />
            <button type="button" aria-label="Číselník konštantných symbolov" onClick={() => setKsOpen(true)} className="absolute top-[2.1rem] right-5 -translate-y-1/2 text-primary">
              <BookOpen className="h-7 w-7" strokeWidth={1.4} />
            </button>
          </div>
          <TextField id="ref" label="Referencia platiteľa" maxLength={35} value={draft.payerReference} onChange={(e) => set("payerReference", e.target.value)} error={errors.payerReference} />
          <SelectField
            id="category"
            label="Kategória (MaFin)"
            value={draft.category}
            onChange={(e) => set("category", e.target.value)}
            options={PAYMENT_CATEGORIES.map((k) => ({ value: k, label: CATEGORIES[k].label }))}
          />
        </div>
      </Section>

      <div className="bg-canvas px-5 py-5">
        <Button type="submit" variant="bank" size="xl">
          Skontrolovať
        </Button>
      </div>

      <RecipientPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        recipients={recipients}
        templates={templates}
        onPickRecipient={(r) => {
          setDraft((d) => ({ ...d, recipientName: r.name, iban: formatIban(r.iban) }));
          setErrors({});
          setPickerOpen(false);
        }}
        onPickTemplate={(t) => {
          setDraft((d) => ({
            ...d,
            recipientName: t.recipient_name,
            iban: formatIban(t.iban),
            amount: t.amount ? formatAmount(t.amount).replace(/\s/g, "") : d.amount,
            message: t.message ?? "",
            variableSymbol: t.variable_symbol ?? "",
            specificSymbol: t.specific_symbol ?? "",
            constantSymbol: t.constant_symbol ?? "",
          }));
          setErrors({});
          setPickerOpen(false);
        }}
      />

      <BottomSheet open={payerOpen} onOpenChange={setPayerOpen} title="Zmeniť platiteľa">
        <div className="flex flex-col gap-3">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                set("accountId", a.id);
                setPayerOpen(false);
              }}
              className={`bank-field px-5 py-4 text-left ${a.id === draft.accountId ? "ring-2 ring-primary" : ""}`}
            >
              <span className="flex justify-between gap-3 font-bold">
                {a.name} <Money value={a.balance} sensitive />
              </span>
              <Iban value={a.iban} className="text-sm text-muted-foreground" />
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={ksOpen} onOpenChange={setKsOpen} title="Konštantný symbol">
        <div className="flex flex-col">
          {CONSTANT_SYMBOLS.map((k) => (
            <button
              key={k.code}
              type="button"
              onClick={() => {
                set("constantSymbol", k.code);
                setKsOpen(false);
              }}
              className="flex items-center justify-between gap-4 border-t border-border py-4 text-left first:border-t-0"
            >
              <span>{k.label}</span>
              <span className="font-bold tabular-nums">{k.code}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </form>
  );
}
