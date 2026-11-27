import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Phone, PhoneIncoming, CalendarDays, Mail, MonitorUp, ChevronDown, AudioLines } from "lucide-react";
import { PageHeader } from "@/components/bank/PageHeader";
import { BottomSheet } from "@/components/bank/BottomSheet";
import { FieldShell, SelectField, TextField } from "@/components/bank/fields";
import { DetailRow } from "@/components/bank/rows";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { createSupportRequest } from "@/services/bank";
import { bankErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/kontakty")({
  head: () => ({
    meta: [
      { title: "Kontakty a podpora – Tatra banka" },
      { name: "description", content: "Zavolajte nám, požiadajte o spätné zavolanie alebo si dohodnite stretnutie." },
      { property: "og:title", content: "Kontakty a podpora – Tatra banka" },
      { property: "og:description", content: "Kontakty a podpora aplikácie Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Contacts,
});

const PHONE = "0800 123 456";

function Contacts() {
  const { session } = useSession();
  const [kind, setKind] = useState<"callback" | "meeting" | null>(null);
  const [phone, setPhone] = useState("");
  const [when, setWhen] = useState("");
  const [topic, setTopic] = useState("ine");
  const [busy, setBusy] = useState(false);
  const [showMore, setShowMore] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!kind) return;
    if (!/^\+?[0-9 ]{6,20}$/.test(phone.trim())) return void toast.error("Zadajte platné telefónne číslo");
    const at = new Date(when);
    if (!when || Number.isNaN(at.getTime()) || at < new Date()) return void toast.error("Zvoľte budúci termín");
    setBusy(true);
    try {
      await createSupportRequest({ kind, phone: phone.trim(), preferred_at: at.toISOString(), topic });
      toast.success(kind === "callback" ? "Zavoláme vám v zvolenom čase" : "Stretnutie sme zaznamenali");
      setKind(null);
    } catch (err) {
      toast.error(bankErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const tile = "flex min-w-0 flex-col items-center gap-2 text-center text-sm transition-transform active:scale-[0.97]";
  const box = "grid aspect-square w-full place-items-center rounded-2xl border border-border/60 bg-background text-primary shadow-tile";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-canvas">
      <PageHeader title="Kontakt" back />
      <section className="border-b border-border/60 bg-background px-5 py-6">
        <div className="flex items-center gap-2 text-2xl font-extrabold tracking-wide">
          <span>DIALOG</span>
          <span className="flex items-center gap-1 font-medium italic"><AudioLines className="h-7 w-7" strokeWidth={1.8} />Live</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Ukážkové kontaktné centrum školského simulátora</p>
      </section>
      <section className="border-b border-border/60 bg-canvas px-5 py-6">
        <div className="grid grid-cols-4 gap-3">
          <a href={`tel:${PHONE.replace(/\s/g, "")}`} className={tile}><span className={box}><Phone className="h-8 w-8" strokeWidth={1.4} /></span>Zavolať</a>
          <button type="button" className={tile} onClick={() => setKind("callback")}><span className={box}><PhoneIncoming className="h-8 w-8" strokeWidth={1.4} /></span>Zavolajte mi</button>
          <button type="button" className={tile} onClick={() => setKind("meeting")}><span className={box}><CalendarDays className="h-8 w-8" strokeWidth={1.4} /></span>Dohodnúť stretnutie</button>
          <button type="button" className={tile} onClick={() => toast.info("Zdieľanie obrazovky nie je v školskom prototype dostupné.")}><span className={box}><MonitorUp className="h-8 w-8" strokeWidth={1.4} /></span>Zdieľať obrazovku</button>
        </div>
        <button type="button" onClick={() => setShowMore((value) => !value)} aria-expanded={showMore} className="mx-auto mt-6 flex items-center gap-2 text-lg font-medium text-link">
          Viac možností <ChevronDown className={`h-6 w-6 transition-transform ${showMore ? "rotate-180" : ""}`} />
        </button>
        {showMore ? (
          <a href="mailto:podpora@simulator.example" className="mt-5 flex items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-4 font-medium">
            <Mail className="h-6 w-6 text-primary" /> Napísať e-mail
          </a>
        ) : null}
      </section>
      <section className="bank-section">
        <h2 className="mb-2 text-[1.45rem] font-extrabold">Kontakt</h2>
        <DetailRow label="DIALOG Live" value={<a href={`tel:${PHONE.replace(/\s/g, "")}`}>{PHONE}</a>} />
        <DetailRow label="Pevná linka" value={<a href={`tel:${PHONE.replace(/\s/g, "")}`}>{PHONE}</a>} />
        <DetailRow label="Zo zahraničia" value={<a href="tel:+421200000000">+421 2 0000 0000</a>} />
        <DetailRow label="E-mail" value="podpora@simulator.example" />
        <p className="mt-4 rounded-lg bg-card px-3 py-3 text-xs leading-5 text-muted-foreground">Kontaktné centrum DIALOG Live je vám k dispozícii 24 hodín denne, 7 dní v týždni.</p>
      </section>
      <BottomSheet open={kind !== null} onOpenChange={(v) => !v && setKind(null)} title={kind === "meeting" ? "Dohodnúť stretnutie" : "Zavolajte mi"}>
        {session ? (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <TextField id="sr-phone" label="Telefón" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+421 900 000 000" />
            <FieldShell label="Termín" htmlFor="sr-when">
              <input id="sr-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="relative w-full bg-transparent text-[1.05rem] outline-none" />
            </FieldShell>
            <SelectField id="sr-topic" label="Téma" value={topic} onChange={(e) => setTopic(e.target.value)} options={[
              { value: "ucty", label: "Účty" }, { value: "karty", label: "Karty" }, { value: "platby", label: "Platby" }, { value: "uvery", label: "Úvery" }, { value: "ine", label: "Iné" },
            ]} />
            <Button type="submit" variant="bank" size="xl" disabled={busy}>{busy ? "Odosielam…" : "Odoslať žiadosť"}</Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground">Na odoslanie žiadosti sa prihláste.</p>
            <Button asChild variant="bank" size="xl"><Link to="/auth" search={{ mode: "login", redirect: "/kontakty" }}>Prihlásiť sa</Link></Button>
          </div>
        )}
      </BottomSheet>
    </main>
  );
}
