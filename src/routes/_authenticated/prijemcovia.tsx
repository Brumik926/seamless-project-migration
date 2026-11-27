import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Pencil, Trash2, Star } from "lucide-react";
import { qk, recipientsQuery, templatesQuery, useBankMutation } from "@/hooks/use-bank";
import { PageHeader } from "@/components/bank/PageHeader";
import { SearchField, TextField } from "@/components/bank/fields";
import { EmptyState, ToggleRow, UnderlineTabs } from "@/components/bank/rows";
import { RecipientAvatar } from "@/components/bank/Avatar";
import { Iban } from "@/components/bank/Iban";
import { Money } from "@/components/bank/Money";
import { BottomSheet } from "@/components/bank/BottomSheet";
import { Button } from "@/components/ui/button";
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
import { recipientSchema, templateSchema, zodErrors } from "@/lib/forms";
import { formatAmount } from "@/lib/format";
import { formatIban, normalizeIban } from "@/lib/iban";
import { bankErrorMessage } from "@/lib/errors";
import {
  createRecipient,
  createTemplate,
  deleteRecipient,
  deleteTemplate,
  updateRecipient,
  updateTemplate,
  type PaymentTemplate,
  type Recipient,
} from "@/services/bank";

type Tab = "vsetky" | "prijemcovia" | "sablony";

export const Route = createFileRoute("/_authenticated/prijemcovia")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    s["tab"] === "vsetky" || s["tab"] === "prijemcovia" || s["tab"] === "sablony" ? { tab: s["tab"] } : {},
  head: () => ({
    meta: [
      { title: "Príjemcovia a šablóny – Tatra banka" },
      { name: "description", content: "Uložení príjemcovia platieb a platobné šablóny." },
      { property: "og:title", content: "Príjemcovia a šablóny – Tatra banka" },
      { property: "og:description", content: "Správa príjemcov a šablón platieb v mobilnom bankovníctve Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([queryClient.ensureQueryData(recipientsQuery), queryClient.ensureQueryData(templatesQuery)]),
  component: RecipientsPage,
});

type RecipientDraft = { id?: string; name: string; iban: string; note: string; is_favorite: boolean };
type TemplateDraft = {
  id?: string;
  name: string;
  recipient_name: string;
  iban: string;
  amount: string;
  variable_symbol: string;
  specific_symbol: string;
  constant_symbol: string;
  message: string;
};

const emptyRecipient: RecipientDraft = { name: "", iban: "", note: "", is_favorite: false };
const emptyTemplate: TemplateDraft = {
  name: "",
  recipient_name: "",
  iban: "",
  amount: "",
  variable_symbol: "",
  specific_symbol: "",
  constant_symbol: "",
  message: "",
};

function RecipientsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/prijemcovia" });
  const tab: Tab = search.tab ?? "vsetky";
  const { data: recipients } = useSuspenseQuery(recipientsQuery);
  const { data: templates } = useSuspenseQuery(templatesQuery);
  const [q, setQ] = useState("");
  const [actionsFor, setActionsFor] = useState<{ kind: "r"; item: Recipient } | { kind: "t"; item: PaymentTemplate } | null>(null);
  const [rDraft, setRDraft] = useState<RecipientDraft | null>(null);
  const [tDraft, setTDraft] = useState<TemplateDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "r" | "t"; id: string; name: string } | null>(null);

  const saveR = useBankMutation(async (d: RecipientDraft) => {
    const parsed = recipientSchema.parse(d);
    if (d.id) await updateRecipient(d.id, parsed);
    else await createRecipient(parsed);
  }, [qk.recipients]);
  const saveT = useBankMutation(async (d: TemplateDraft) => {
    const parsed = templateSchema.parse(d);
    if (d.id) await updateTemplate(d.id, parsed);
    else await createTemplate(parsed);
  }, [qk.templates]);
  const removeR = useBankMutation((id: string) => deleteRecipient(id), [qk.recipients]);
  const removeT = useBankMutation((id: string) => deleteTemplate(id), [qk.templates]);
  const toggleFav = useBankMutation((r: Recipient) => updateRecipient(r.id, { is_favorite: !r.is_favorite }), [qk.recipients]);

  const s = q.trim().toLowerCase();
  const qIban = normalizeIban(q);
  const rs = useMemo(
    () => recipients.filter((r) => !s || r.name.toLowerCase().includes(s) || (qIban.length > 2 && r.iban.includes(qIban))),
    [recipients, s, qIban],
  );
  const ts = useMemo(
    () =>
      templates.filter(
        (t) => !s || t.name.toLowerCase().includes(s) || t.recipient_name.toLowerCase().includes(s) || (qIban.length > 2 && t.iban.includes(qIban)),
      ),
    [templates, s, qIban],
  );

  function submitRecipient(e: React.FormEvent) {
    e.preventDefault();
    if (!rDraft) return;
    const parsed = recipientSchema.safeParse(rDraft);
    if (!parsed.success) return setErrors(zodErrors(parsed.error));
    saveR.mutate(rDraft, {
      onSuccess: () => {
        toast.success(rDraft.id ? "Príjemca upravený" : "Príjemca pridaný");
        setRDraft(null);
      },
      onError: (err) => toast.error(bankErrorMessage(err)),
    });
  }

  function submitTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!tDraft) return;
    const parsed = templateSchema.safeParse(tDraft);
    if (!parsed.success) return setErrors(zodErrors(parsed.error));
    saveT.mutate(tDraft, {
      onSuccess: () => {
        toast.success(tDraft.id ? "Šablóna upravená" : "Šablóna uložená");
        setTDraft(null);
      },
      onError: (err) => toast.error(bankErrorMessage(err)),
    });
  }

  const showR = tab !== "sablony";
  const showT = tab !== "prijemcovia";

  return (
    <div className="flex min-h-dvh flex-col bg-canvas animate-page-in">
      <PageHeader title="Príjemcovia" back>
        <SearchField value={q} onChange={setQ} className="mt-5" />
      </PageHeader>
      <div className="bg-background">
        <UnderlineTabs
          tabs={[
            { value: "vsetky", label: "Všetky" },
            { value: "prijemcovia", label: "Príjemcovia" },
            { value: "sablony", label: "Šablóny" },
          ]}
          value={tab}
          onChange={(v) => navigate({ search: { tab: v }, replace: true })}
        />
      </div>

      {showR ? (
        <section className="px-5 pt-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm tracking-wide text-muted-foreground uppercase">Príjemcovia ({rs.length})</h2>
            <button type="button" className="font-medium text-link" onClick={() => { setErrors({}); setRDraft({ ...emptyRecipient }); }}>
              Pridať príjemcu
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {rs.length === 0 ? <EmptyState title={q ? "Žiadny príjemca nezodpovedá hľadaniu." : "Zatiaľ nemáte uložených príjemcov."} /> : null}
            {rs.map((r) => (
              <button key={r.id} type="button" onClick={() => setActionsFor({ kind: "r", item: r })} className="bank-tile flex items-center gap-4 px-5 py-4 text-left transition-transform active:scale-[0.99]">
                <RecipientAvatar name={r.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-lg font-bold">
                    <span className="truncate">{r.name}</span>
                    {r.is_favorite ? <Star className="h-4 w-4 shrink-0 fill-warning text-warning" /> : null}
                  </span>
                  <Iban value={r.iban} className="block truncate text-[0.95rem] text-muted-foreground" />
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {showT ? (
        <section className="px-5 pt-6 pb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm tracking-wide text-muted-foreground uppercase">Šablóny ({ts.length})</h2>
            <button type="button" className="font-medium text-link" onClick={() => { setErrors({}); setTDraft({ ...emptyTemplate }); }}>
              Pridať šablónu
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {ts.length === 0 ? <EmptyState title={q ? "Žiadna šablóna nezodpovedá hľadaniu." : "Zatiaľ nemáte žiadne šablóny."} /> : null}
            {ts.map((t) => (
              <button key={t.id} type="button" onClick={() => setActionsFor({ kind: "t", item: t })} className="bank-tile flex items-center gap-4 px-5 py-4 text-left transition-transform active:scale-[0.99]">
                <RecipientAvatar name={t.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-bold">{t.name}</span>
                  <span className="block truncate text-[0.95rem] text-muted-foreground">
                    {t.recipient_name} · <Iban value={t.iban} />
                  </span>
                </span>
                {t.amount ? <Money value={t.amount} className="shrink-0 font-semibold" /> : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Actions */}
      <BottomSheet open={!!actionsFor} onOpenChange={(v) => !v && setActionsFor(null)} title={actionsFor?.item.name ?? ""}>
        {actionsFor ? (
          <div className="flex flex-col gap-3">
            <Button
              variant="bank"
              size="xl"
              onClick={() => {
                const a = actionsFor;
                setActionsFor(null);
                navigate({ to: "/platba", search: a.kind === "r" ? { recipientId: a.item.id } : { templateId: a.item.id } });
              }}
            >
              <Send /> Zaplatiť
            </Button>
            {actionsFor.kind === "r" ? (
              <Button
                variant="bankOutline"
                size="xl"
                disabled={toggleFav.isPending}
                onClick={() => {
                  const r = actionsFor.item;
                  toggleFav.mutate(r, {
                    onSuccess: () => {
                      toast.success(r.is_favorite ? "Odstránené z rýchlej platby" : "Pridané do rýchlej platby");
                      setActionsFor(null);
                    },
                    onError: (err) => toast.error(bankErrorMessage(err)),
                  });
                }}
              >
                <Star /> {actionsFor.item.is_favorite ? "Odobrať z rýchlej platby" : "Pridať do rýchlej platby"}
              </Button>
            ) : null}
            <Button
              variant="bankGhost"
              size="xl"
              onClick={() => {
                setErrors({});
                if (actionsFor.kind === "r") {
                  const r = actionsFor.item;
                  setRDraft({ id: r.id, name: r.name, iban: formatIban(r.iban), note: r.note ?? "", is_favorite: r.is_favorite });
                } else {
                  const t = actionsFor.item;
                  setTDraft({
                    id: t.id,
                    name: t.name,
                    recipient_name: t.recipient_name,
                    iban: formatIban(t.iban),
                    amount: t.amount ? formatAmount(t.amount).replace(/\s/g, "") : "",
                    variable_symbol: t.variable_symbol ?? "",
                    specific_symbol: t.specific_symbol ?? "",
                    constant_symbol: t.constant_symbol ?? "",
                    message: t.message ?? "",
                  });
                }
                setActionsFor(null);
              }}
            >
              <Pencil /> Upraviť
            </Button>
            <Button
              variant="bankDanger"
              size="xl"
              onClick={() => {
                setConfirmDelete({ kind: actionsFor.kind, id: actionsFor.item.id, name: actionsFor.item.name });
                setActionsFor(null);
              }}
            >
              <Trash2 /> Odstrániť
            </Button>
          </div>
        ) : null}
      </BottomSheet>

      {/* Recipient form */}
      <BottomSheet open={!!rDraft} onOpenChange={(v) => !v && setRDraft(null)} title={rDraft?.id ? "Upraviť príjemcu" : "Pridať príjemcu"}>
        {rDraft ? (
          <form onSubmit={submitRecipient} noValidate className="flex flex-col gap-4">
            <TextField id="r-name" label="Názov príjemcu" required maxLength={70} value={rDraft.name} onChange={(e) => setRDraft({ ...rDraft, name: e.target.value })} error={errors["name"]} />
            <TextField id="r-iban" label="IBAN" required autoCapitalize="characters" value={rDraft.iban} onChange={(e) => setRDraft({ ...rDraft, iban: e.target.value.toUpperCase() })} onBlur={() => setRDraft({ ...rDraft, iban: formatIban(rDraft.iban) })} error={errors["iban"]} />
            <TextField id="r-note" label="Poznámka" maxLength={140} value={rDraft.note} onChange={(e) => setRDraft({ ...rDraft, note: e.target.value })} error={errors["note"]} />
            <ToggleRow id="r-fav" label="Rýchla platba" description="Zobraziť na domovskej obrazovke" checked={rDraft.is_favorite} onCheckedChange={(v) => setRDraft({ ...rDraft, is_favorite: v })} />
            <Button type="submit" variant="bank" size="xl" disabled={saveR.isPending}>
              {saveR.isPending ? "Ukladám…" : "Uložiť príjemcu"}
            </Button>
          </form>
        ) : null}
      </BottomSheet>

      {/* Template form */}
      <BottomSheet open={!!tDraft} onOpenChange={(v) => !v && setTDraft(null)} title={tDraft?.id ? "Upraviť šablónu" : "Nová šablóna"}>
        {tDraft ? (
          <form onSubmit={submitTemplate} noValidate className="flex flex-col gap-4">
            <TextField id="t-name" label="Názov šablóny" required maxLength={60} value={tDraft.name} onChange={(e) => setTDraft({ ...tDraft, name: e.target.value })} error={errors["name"]} />
            <TextField id="t-rname" label="Názov príjemcu" required maxLength={70} value={tDraft.recipient_name} onChange={(e) => setTDraft({ ...tDraft, recipient_name: e.target.value })} error={errors["recipient_name"]} />
            <TextField id="t-iban" label="IBAN" required autoCapitalize="characters" value={tDraft.iban} onChange={(e) => setTDraft({ ...tDraft, iban: e.target.value.toUpperCase() })} onBlur={() => setTDraft({ ...tDraft, iban: formatIban(tDraft.iban) })} error={errors["iban"]} />
            <TextField id="t-amount" label="Suma (EUR)" inputMode="decimal" placeholder="0,00" value={tDraft.amount} onChange={(e) => setTDraft({ ...tDraft, amount: e.target.value })} error={errors["amount"]} />
            <TextField id="t-vs" label="Variabilný symbol" inputMode="numeric" maxLength={10} value={tDraft.variable_symbol} onChange={(e) => setTDraft({ ...tDraft, variable_symbol: e.target.value.replace(/\D/g, "") })} error={errors["variable_symbol"]} />
            <TextField id="t-ss" label="Špecifický symbol" inputMode="numeric" maxLength={10} value={tDraft.specific_symbol} onChange={(e) => setTDraft({ ...tDraft, specific_symbol: e.target.value.replace(/\D/g, "") })} error={errors["specific_symbol"]} />
            <TextField id="t-ks" label="Konštantný symbol" inputMode="numeric" maxLength={4} value={tDraft.constant_symbol} onChange={(e) => setTDraft({ ...tDraft, constant_symbol: e.target.value.replace(/\D/g, "") })} error={errors["constant_symbol"]} />
            <TextField id="t-msg" label="Informácia pre príjemcu" maxLength={140} value={tDraft.message} onChange={(e) => setTDraft({ ...tDraft, message: e.target.value })} error={errors["message"]} />
            <Button type="submit" variant="bank" size="xl" disabled={saveT.isPending}>
              {saveT.isPending ? "Ukladám…" : "Uložiť šablónu"}
            </Button>
          </form>
        ) : null}
      </BottomSheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť „{confirmDelete?.name}“?</AlertDialogTitle>
            <AlertDialogDescription>Táto akcia sa nedá vrátiť späť.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!confirmDelete) return;
                const m = confirmDelete.kind === "r" ? removeR : removeT;
                m.mutate(confirmDelete.id, {
                  onSuccess: () => toast.success("Odstránené"),
                  onError: (err) => toast.error(bankErrorMessage(err)),
                });
                setConfirmDelete(null);
              }}
            >
              Odstrániť
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
