import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Share2, HandCoins, ArrowLeftRight, Send, CalendarClock, FileText, ChevronRight } from "lucide-react";
import { accountsQuery, qk, recipientsQuery, standingOrdersQuery, transactionsQuery, useBankMutation } from "@/hooks/use-bank";
import { PageHeader } from "@/components/bank/PageHeader";
import { Section } from "@/components/bank/Section";
import { Money } from "@/components/bank/Money";
import { Iban } from "@/components/bank/Iban";
import { DetailRow } from "@/components/bank/rows";
import { BalanceChart } from "@/components/bank/BalanceChart";
import { RecipientAvatar } from "@/components/bank/Avatar";
import { BottomSheet } from "@/components/bank/BottomSheet";
import { TextField } from "@/components/bank/fields";
import { VegaMark } from "@/components/bank/Logo";
import { Button } from "@/components/ui/button";
import { balanceHistory } from "@/lib/stats";
import { formatAmount, formatShortDate, formatTime } from "@/lib/format";
import { formatIban } from "@/lib/iban";
import { parseAmount } from "@/lib/payment-schema";
import { bankErrorMessage } from "@/lib/errors";
import { renameAccount } from "@/services/bank";

export const Route = createFileRoute("/_authenticated/ucet/$id")({
  head: () => ({
    meta: [
      { title: "Detail účtu – Tatra banka" },
      { name: "description", content: "Zostatok, IBAN, vývoj zostatkov a informácie o účte." },
      { property: "og:title", content: "Detail účtu – Tatra banka" },
      { property: "og:description", content: "Detail účtu v aplikácii Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(accountsQuery),
      queryClient.ensureQueryData(transactionsQuery),
      queryClient.ensureQueryData(recipientsQuery),
      queryClient.ensureQueryData(standingOrdersQuery),
    ]),
  component: AccountDetail,
});

async function shareText(title: string, text: string, copied: string) {
  try {
    if (navigator.share) await navigator.share({ title, text });
    else {
      await navigator.clipboard.writeText(text);
      toast.success(copied);
    }
  } catch {
    // Share dialog dismissed.
  }
}

function ActionTile({ icon: Icon }: { icon: typeof Send }) {
  return (
    <span className="grid aspect-square w-full place-items-center rounded-2xl border border-border/70 bg-card text-primary shadow-tile">
      <Icon className="h-8 w-8" strokeWidth={1.4} />
    </span>
  );
}

function AccountDetail() {
  const { id } = Route.useParams();
  const { data: accounts } = useSuspenseQuery(accountsQuery);
  const { data: transactions } = useSuspenseQuery(transactionsQuery);
  const { data: recipients } = useSuspenseQuery(recipientsQuery);
  const { data: orders } = useSuspenseQuery(standingOrdersQuery);
  const account = accounts.find((a) => a.id === id);
  const [renameOpen, setRenameOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [planetTab, setPlanetTab] = useState<"benefit" | "carbon">("benefit");
  const [name, setName] = useState(account?.name ?? "");
  const [reqAmount, setReqAmount] = useState("");
  const [reqMessage, setReqMessage] = useState("");
  const rename = useBankMutation((n: string) => renameAccount(id, n), [qk.accounts]);
  const history = useMemo(
    () => (account ? balanceHistory(Number(account.balance), transactions, account.id, 30) : []),
    [account, transactions],
  );

  if (!account) {
    return (
      <div>
        <PageHeader title="Detail účtu" back="/domov" />
        <p className="bank-section text-muted-foreground">Účet sa nenašiel.</p>
      </div>
    );
  }

  const savings = accounts.filter((a) => a.account_type === "savings" && a.id !== account.id);
  const savingsTotal = savings.reduce((s, a) => s + Number(a.balance), 0);
  const held = transactions
    .filter((t) => t.account_id === account.id && t.status === "scheduled")
    .reduce((s, t) => s + Number(t.amount), 0);
  const favorites = recipients.filter((r) => r.is_favorite);
  const accountNumber = account.iban.slice(-10).replace(/^0+/, "");
  const now = new Date();
  const ordersCount = orders.filter((o) => o.account_id === account.id && o.is_active).length;

  return (
    <div className="flex flex-col gap-3 animate-page-in">
      <PageHeader title="Detail účtu" back />
      <section className="bank-section">
        <div className="bank-tile relative overflow-hidden px-6 py-7 text-center">
          <VegaMark className="pointer-events-none absolute -right-6 -bottom-8 h-32 w-40 text-foreground/5" />
          <button type="button" aria-label="Premenovať účet" onClick={() => setRenameOpen(true)} className="absolute top-5 right-5 text-primary">
            <Pencil className="h-6 w-6" strokeWidth={1.5} />
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{account.account_type === "savings" ? "Sporiaci účet" : "Bežný účet"}</p>
          <h2 className="mt-1 text-xl font-bold">{account.name}</h2>
          <Iban value={account.iban} className="mt-2 block text-[1.05rem] text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Aktuálny zostatok</p>
          <Money value={account.balance} sensitive className="mt-1 block text-[2.4rem] font-medium" />
          <p className="mt-3 text-sm text-muted-foreground">
            Zostatok platný k {formatShortDate(now)} {formatTime(now)}
          </p>
        </div>
        {savings.length > 0 ? (
          <Link
            to="/ucet/$id"
            params={{ id: savings[0]!.id }}
            className="mt-4 flex items-center justify-between gap-3 border-b border-border py-4"
          >
            <span className="text-[1.05rem] text-muted-foreground">Sporenia k účtu</span>
            <span className="flex items-center gap-2">
              <Money value={savingsTotal} sensitive className="text-[1.2rem] font-bold" />
              <ChevronRight className="h-6 w-6 text-primary" />
            </span>
          </Link>
        ) : null}
        <div className="mt-2 grid grid-cols-2 divide-x divide-border">
          <button
            type="button"
            onClick={() =>
              shareText("Môj IBAN", `${account.name}\nIBAN: ${formatIban(account.iban)}\nBIC: TATRSKBX\n(Tatra banka)`, "IBAN skopírovaný do schránky")
            }
            className="flex items-center justify-center gap-3 py-4 text-[1.05rem]"
          >
            <Share2 className="h-6 w-6 text-primary" strokeWidth={1.5} /> Zdieľať IBAN
          </button>
          <button type="button" onClick={() => setRequestOpen(true)} className="flex items-center justify-center gap-3 py-4 text-[1.05rem]">
            <HandCoins className="h-6 w-6 text-primary" strokeWidth={1.5} /> Vyžiadať platbu
          </button>
        </div>
      </section>

      <Section title="Rýchla platba" action={<Link to="/prijemcovia">Zoznam príjemcov</Link>}>
        {favorites.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">Nemáte žiadnych príjemcov pre rýchlu platbu.</p>
        ) : (
          <div className="no-scrollbar -mx-5 flex gap-5 overflow-x-auto px-5">
            {favorites.map((r) => (
              <Link key={r.id} to="/platba" search={{ recipientId: r.id, accountId: account.id }} className="flex w-20 shrink-0 flex-col items-center gap-2 text-center">
                <RecipientAvatar name={r.name} />
                <span className="line-clamp-2 text-sm">{r.name}</span>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <section className="bg-canvas px-5 py-6">
        <div className="grid grid-cols-4 gap-3">
          <Link to="/pohyby" search={{ account: account.id }} className="flex flex-col items-center gap-2 text-center transition-transform active:scale-95">
            <ActionTile icon={ArrowLeftRight} />
            <span className="text-sm">Pohyby</span>
          </Link>
          <Link to="/platba" search={{ accountId: account.id }} className="flex flex-col items-center gap-2 text-center">
            <ActionTile icon={Send} />
            <span className="text-sm">Platba</span>
          </Link>
          <Link to="/trvale-prikazy" className="flex flex-col items-center gap-2 text-center">
            <ActionTile icon={CalendarClock} />
            <span className="text-sm">Trvalé príkazy{ordersCount ? ` (${ordersCount})` : ""}</span>
          </Link>
          <Link to="/prijemcovia" search={{ tab: "sablony" }} className="flex flex-col items-center gap-2 text-center">
            <ActionTile icon={FileText} />
            <span className="text-sm">Šablóny</span>
          </Link>
        </div>
      </section>

      <section className="bank-section">
        <h2 className="mb-5 text-xl font-extrabold">Program odmeňovania</h2>
        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-5 border-t border-border pt-6">
          <div className="relative grid aspect-square place-items-center rounded-full border-[6px] border-l-muted border-b-primary border-r-primary border-t-muted text-center">
            <span><strong className="text-3xl">3</strong><span className="ml-1 text-sm">EUR</span></span>
          </div>
          <div>
            <p className="text-lg leading-7">Získajte ďalšiu zľavu z <strong>poplatku</strong> za vedenie účtu.</p>
            <button type="button" onClick={() => toast.info("Program odmeňovania je v tomto prototype iba ukážkový.")} className="mt-4 font-medium text-link">Chcem väčšiu zľavu</button>
          </div>
          <p className="col-span-2 -mt-2 text-center text-sm text-muted-foreground">Za vedenie účtu platíte · ukážkový údaj</p>
        </div>
      </section>

      <section className="bank-section">
        <h2 className="mb-4 text-xl font-extrabold">Účet pre modrú planétu</h2>
        <div role="tablist" aria-label="Prehľad účtu pre modrú planétu" className="-mx-5 grid grid-cols-2 border-y border-border">
          <button type="button" role="tab" aria-selected={planetTab === "benefit"} onClick={() => setPlanetTab("benefit")} className={`border-b-[3px] py-4 text-base ${planetTab === "benefit" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>My Benefit</button>
          <button type="button" role="tab" aria-selected={planetTab === "carbon"} onClick={() => setPlanetTab("carbon")} className={`border-b-[3px] py-4 text-base ${planetTab === "carbon" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>Uhlíková stopa</button>
        </div>
        {planetTab === "benefit" ? (
          <div className="py-6">
            <h3 className="text-lg font-bold">Aktivujte a objavujte</h3>
            <p className="mt-2 text-muted-foreground">Aktivujte si program My Benefit a objavujte množstvo zliav.</p>
            <button type="button" onClick={() => toast.info("Aktivácia My Benefit nie je v školskom simulátore dostupná.")} className="mt-5 font-semibold text-link">＋ Aktivovať My Benefit</button>
          </div>
        ) : (
          <div className="py-6">
            <h3 className="text-lg font-bold">Uhlíková stopa</h3>
            <p className="mt-2 text-muted-foreground">Prehľad uhlíkovej stopy nie je v tomto prototype napojený na transakčné dáta.</p>
          </div>
        )}
      </section>

      <Section
        title="Vývoj zostatkov"
        action={<span className="text-sm text-muted-foreground">{history[0] ? formatShortDate(history[0].day) : ""} – {formatShortDate(now)}</span>}
      >
        <BalanceChart data={history} />
      </Section>

      <Section title="Viac informácií" className="pb-8">
        <DetailRow label="Účtovný zostatok" value={<Money value={account.balance} sensitive />} />
        <DetailRow label="Disponibilný zostatok" value={<Money value={Math.max(0, Number(account.balance) - held)} sensitive />} />
        <DetailRow label="Naplánované platby" value={<Money value={held} />} />
        <DetailRow label="Číslo účtu" value={<strong>{accountNumber}</strong>} />
        <DetailRow label="Mena" value={account.currency} />
        <DetailRow label="Typ účtu" value={account.account_type === "savings" ? "Sporiaci účet" : "Bežný účet"} />
        <DetailRow label="SWIFT kód (BIC)" value="TATRSKBX" />
      </Section>

      <BottomSheet open={renameOpen} onOpenChange={setRenameOpen} title="Premenovať účet">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (n.length < 1 || n.length > 60) return void toast.error("Názov musí mať 1 až 60 znakov");
            rename.mutate(n, {
              onSuccess: () => {
                toast.success("Účet premenovaný");
                setRenameOpen(false);
              },
              onError: (err) => toast.error(bankErrorMessage(err)),
            });
          }}
          className="flex flex-col gap-4"
        >
          <TextField id="acc-name" label="Názov účtu" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="bank" size="xl" disabled={rename.isPending}>
            Uložiť
          </Button>
        </form>
      </BottomSheet>

      <BottomSheet open={requestOpen} onOpenChange={setRequestOpen} title="Vyžiadať platbu" description="Pošlite platobné údaje cez správu alebo e-mail.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const amount = reqAmount ? parseAmount(reqAmount) : null;
            if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) return void toast.error("Zadajte platnú sumu");
            const text = [
              "Prosím o platbu:",
              `Príjemca: ${account.name}`,
              `IBAN: ${formatIban(account.iban)}`,
              amount ? `Suma: ${formatAmount(amount)} EUR` : "",
              reqMessage.trim() ? `Správa: ${reqMessage.trim().slice(0, 140)}` : "",
              "(Tatra banka)" ,
            ]
              .filter(Boolean)
              .join("\n");
            void shareText("Žiadosť o platbu", text, "Žiadosť skopírovaná do schránky").then(() => setRequestOpen(false));
          }}
          className="flex flex-col gap-4"
        >
          <TextField id="req-amount" label="Suma (EUR)" inputMode="decimal" placeholder="0,00" value={reqAmount} onChange={(e) => setReqAmount(e.target.value)} />
          <TextField id="req-msg" label="Správa pre platiteľa" maxLength={140} value={reqMessage} onChange={(e) => setReqMessage(e.target.value)} />
          <Button type="submit" variant="bank" size="xl">
            Zdieľať žiadosť
          </Button>
        </form>
      </BottomSheet>
    </div>
  );
}
