import { Link } from "@tanstack/react-router";
import { Cloud, Clock, XCircle } from "lucide-react";
import { txTypeLabel } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Money } from "./Money";
import type { Transaction } from "@/services/bank";

/** One movement in the history list: +/− marker, counterparty, type and coloured amount. */
export function TransactionRow({ tx }: { tx: Transaction }) {
  const incoming = tx.direction === "in";
  const pending = tx.status === "scheduled";
  const failed = tx.status === "failed" || tx.status === "cancelled";
  return (
    <Link
      to="/transakcia/$id"
      params={{ id: tx.id }}
      className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-4 border-t border-border py-5 pr-5 transition-colors hover:bg-card/60 active:bg-card"
    >
      <span
        aria-hidden="true"
        className={cn("text-3xl leading-none font-light", incoming ? "text-positive" : "text-negative", (pending || failed) && "text-muted-foreground")}
      >
        {incoming ? "+" : "—"}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[1.05rem]">{tx.counterparty_name || "Bez názvu"}</span>
        <span className="mt-1 flex items-center gap-1.5 text-[0.95rem] text-muted-foreground">
          {pending ? <Clock className="h-4 w-4 text-warning" /> : failed ? <XCircle className="h-4 w-4 text-negative" /> : null}
          {pending ? "Naplánovaná" : tx.status === "failed" ? "Zlyhala" : tx.status === "cancelled" ? "Zrušená" : txTypeLabel(tx.tx_type, tx.direction)}
        </span>
      </span>
      <span className="text-right">
        <Money
          value={tx.amount}
          className={cn(
            "text-[1.2rem] font-medium",
            incoming ? "text-positive" : "text-negative",
            (pending || failed) && "text-muted-foreground",
            failed && "line-through",
          )}
        />
        {tx.co2_kg ? (
          <span className="mt-1 flex items-center justify-end gap-1.5 text-[0.9rem] text-muted-foreground">
            <Cloud className="h-4 w-4" />
            {String(tx.co2_kg).replace(".", ",")} kg CO<sub>2</sub>e
          </span>
        ) : null}
      </span>
    </Link>
  );
}
