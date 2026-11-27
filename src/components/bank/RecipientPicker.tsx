import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BottomSheet } from "./BottomSheet";
import { SearchField, TextField } from "./fields";
import { UnderlineTabs, EmptyState } from "./rows";
import { RecipientAvatar } from "./Avatar";
import { Iban } from "./Iban";
import { Money } from "./Money";
import { Button } from "@/components/ui/button";
import { qk, useBankMutation } from "@/hooks/use-bank";
import { createRecipient, type PaymentTemplate, type Recipient } from "@/services/bank";
import { formatIban, normalizeIban, isValidIban } from "@/lib/iban";

type Tab = "vsetky" | "prijemcovia" | "sablony";

/** Three-tab picker matching the reference; recipient creation stays inside the payment flow. */
export function RecipientPicker({
  open,
  onOpenChange,
  recipients,
  templates,
  onPickRecipient,
  onPickTemplate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipients: Recipient[];
  templates: PaymentTemplate[];
  onPickRecipient: (r: Recipient) => void;
  onPickTemplate: (t: PaymentTemplate) => void;
}) {
  const [tab, setTab] = useState<Tab>("vsetky");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [iban, setIban] = useState("");
  const [error, setError] = useState("");
  const saveRecipient = useBankMutation(
    (input: { name: string; iban: string }) => createRecipient(input),
    [qk.recipients],
  );
  const match = (label: string, account: string) => {
    const search = q.trim().toLowerCase();
    return !search || label.toLowerCase().includes(search) || normalizeIban(account).includes(normalizeIban(q));
  };
  const rs = useMemo(() => recipients.filter((r) => match(r.name, r.iban)), [recipients, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const ts = useMemo(() => templates.filter((t) => match(`${t.name} ${t.recipient_name}`, t.iban)), [templates, q]); // eslint-disable-line react-hooks/exhaustive-deps

  function close() {
    setAdding(false);
    setError("");
    setName("");
    setIban("");
    onOpenChange(false);
  }

  function submitRecipient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanIban = normalizeIban(iban);
    if (cleanName.length < 2 || cleanName.length > 70) return setError("Zadajte názov príjemcu (2 až 70 znakov).");
    if (!isValidIban(cleanIban)) return setError("Zadaný IBAN nie je platný.");
    saveRecipient.mutate({ name: cleanName, iban: cleanIban }, {
      onSuccess: (recipient) => {
        toast.success("Príjemca bol uložený");
        setAdding(false);
        onPickRecipient(recipient);
        setName("");
        setIban("");
      },
      onError: () => setError("Príjemcu sa nepodarilo uložiť. Skúste to znova."),
    });
  }

  return (
    <BottomSheet open={open} onOpenChange={(value) => value ? onOpenChange(true) : close()} title={adding ? "Pridať príjemcu" : "Vyberte príjemcu"}>
      {adding ? (
        <form onSubmit={submitRecipient} noValidate className="flex flex-col gap-4">
          <TextField id="picker-recipient-name" label="Názov príjemcu" required maxLength={70} value={name} onChange={(e) => { setName(e.target.value); setError(""); }} />
          <TextField id="picker-recipient-iban" label="IBAN" required autoCapitalize="characters" value={iban} onChange={(e) => { setIban(e.target.value.toUpperCase()); setError(""); }} onBlur={() => setIban(formatIban(iban))} />
          {error ? <p role="alert" className="text-sm text-negative">{error}</p> : null}
          <Button type="submit" variant="bank" size="xl" disabled={saveRecipient.isPending}>{saveRecipient.isPending ? "Ukladám…" : "Uložiť príjemcu"}</Button>
          <Button type="button" variant="bankGhost" size="xl" onClick={() => { setAdding(false); setError(""); }}>Späť na výber</Button>
        </form>
      ) : (
        <>
          <SearchField value={q} onChange={setQ} />
          <div className="-mx-5 mt-3">
            <UnderlineTabs
              tabs={[
                { value: "vsetky", label: `Všetky (${rs.length + ts.length})` },
                { value: "prijemcovia", label: `Príjemcovia (${rs.length})` },
                { value: "sablony", label: `Šablóny (${ts.length})` },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>
          {tab !== "sablony" ? (
            <section className="mt-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Príjemcovia ({rs.length})</h3>
                <button type="button" onClick={() => setAdding(true)} className="shrink-0 font-medium text-link">Pridať príjemcu</button>
              </div>
              <div className="flex flex-col gap-3">
                {rs.length === 0 ? <EmptyState title="Žiadni príjemcovia." /> : rs.map((r) => (
                  <button key={r.id} type="button" onClick={() => onPickRecipient(r)} className="bank-tile flex items-center gap-4 px-5 py-4 text-left">
                    <RecipientAvatar name={r.name} />
                    <span className="min-w-0">
                      <span className="block truncate text-lg font-bold">{r.name}</span>
                      <Iban value={r.iban} className="block truncate text-sm text-muted-foreground" />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {tab !== "prijemcovia" ? (
            <section className="mt-5">
              {tab === "vsetky" ? <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Šablóny platieb</h3> : null}
              <div className="flex flex-col gap-3">
                {ts.length === 0 ? <EmptyState title="Žiadne šablóny." /> : ts.map((t) => (
                  <button key={t.id} type="button" onClick={() => onPickTemplate(t)} className="bank-tile flex items-center gap-4 px-5 py-4 text-left">
                    <RecipientAvatar name={t.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-lg font-bold">{t.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">{t.recipient_name}</span>
                    </span>
                    {t.amount ? <Money value={t.amount} className="shrink-0 font-semibold" /> : null}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </BottomSheet>
  );
}
