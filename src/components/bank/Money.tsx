import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useHideBalances } from "./BalanceVisibility";

type Props = {
  value: number | string;
  currency?: string;
  /** Show a leading + / − sign. */
  signed?: "in" | "out";
  /** Balances are hidden when the user enables "Skryť zostatky". */
  sensitive?: boolean;
  className?: string;
  currencyClassName?: string;
};

export function Money({ value, currency = "EUR", signed, sensitive, className, currencyClassName }: Props) {
  const hide = useHideBalances() && sensitive;
  const sign = signed === "in" ? "+" : signed === "out" ? "−" : "";
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>
      {hide ? "••• •••" : `${sign ? sign + " " : ""}${formatAmount(value)}`}{" "}
      <span className={cn("text-[0.62em] font-semibold uppercase", currencyClassName)}>{currency}</span>
    </span>
  );
}
