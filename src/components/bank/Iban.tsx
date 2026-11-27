import { ibanGroups } from "@/lib/iban";
import { cn } from "@/lib/utils";

/** IBAN in blocks of four; the bank-identifying blocks are emphasized like on the reference screens. */
export function Iban({ value, className }: { value: string | null | undefined; className?: string }) {
  const groups = ibanGroups(value);
  return (
    <span className={cn("tabular-nums tracking-wide", className)}>
      {groups.map((g, i) => (
        <span key={i} className={i === 1 || i >= 4 ? "font-bold" : undefined}>
          {g}
          {i < groups.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
