import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/bank/PageHeader";
import { TextField, SelectField } from "@/components/bank/fields";
import { EXCHANGE_RATES, convertFromEur } from "@/lib/rates";
import { parseAmount } from "@/lib/payment-schema";
import { formatAmount } from "@/lib/format";

export const Route = createFileRoute("/kurzy")({
  head: () => ({
    meta: [
      { title: "Kurzový lístok – Tatra banka" },
      { name: "description", content: "Orientačné kurzy mien a prepočet z EUR." },
      { property: "og:title", content: "Kurzový lístok – Tatra banka" },
      { property: "og:description", content: "Orientačné kurzy mien v aplikácii Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Rates,
});

function Rates() {
  const [amount, setAmount] = useState("100");
  const [code, setCode] = useState<string>("CZK");
  const rate = EXCHANGE_RATES.find((r) => r.code === code) ?? EXCHANGE_RATES[0];
  const n = parseAmount(amount || "0");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 bg-canvas">
      <PageHeader title="Kurzový lístok" back />
      <section className="bank-section flex flex-col gap-4">
        <h2 className="text-xl font-extrabold">Prepočet</h2>
        <TextField id="conv-amount" label="Suma v EUR" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <SelectField id="conv-code" label="Mena" value={code} onChange={(e) => setCode(e.target.value)} options={EXCHANGE_RATES.map((r) => ({ value: r.code, label: `${r.code} – ${r.country}` }))} />
        <p className="text-center text-2xl font-bold">
          {Number.isFinite(n) ? formatAmount(convertFromEur(n, rate.buy)) : "—"} {rate.code}
        </p>
      </section>
      <section className="bank-section px-0">
        <div className="mx-5 grid grid-cols-[2rem_minmax(0,1fr)_auto_auto] gap-4 pb-3 text-sm text-muted-foreground">
          <span /> <span>Krajina</span> <span>Nákup</span> <span>Predaj</span>
        </div>
        {EXCHANGE_RATES.map((r) => (
          <div key={r.code} className="mx-5 grid grid-cols-[2rem_minmax(0,1fr)_auto_auto] items-center gap-4 border-t border-border py-4">
            <span className="text-2xl" aria-hidden="true">{r.flag}</span>
            <span className="truncate">{r.country} <span className="text-muted-foreground">{r.code}</span></span>
            <span className="tabular-nums">{String(r.buy).replace(".", ",")}</span>
            <span className="tabular-nums">{String(r.sell).replace(".", ",")}</span>
          </div>
        ))}
        <p className="mx-5 pt-4 text-xs text-muted-foreground">Kurzy sú fiktívne a orientačné, nie sú to trhové údaje.</p>
      </section>
    </main>
  );
}
