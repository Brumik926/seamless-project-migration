import { cn } from "@/lib/utils";

export const BANK_NAME = "Tatra banka";

/** Three-bar mark traced from the user-provided reference image. */
export function BankMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 112 88" fill="none" aria-hidden="true" className={cn("h-10 w-auto", className)}>
      <path d="M4 11H46M66 11H108M4 11V83H108V11" stroke="currentColor" strokeWidth="2.6" />
      <path d="M13 73L34 33H49L28 73H13Z" fill="currentColor" />
      <path d="M36 73L66 11H81L51 73H36Z" fill="currentColor" />
      <path d="M59 73L83 23H98L74 73H59Z" fill="currentColor" />
    </svg>
  );
}

export function BankWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 text-foreground", className)}>
      <BankMark className="h-24 w-32" />
      <span className="text-2xl font-bold tracking-wide uppercase">{BANK_NAME}</span>
    </div>
  );
}

// Backwards-compatible names used by existing screens.
export const VegaMark = BankMark;
export const VegaWordmark = BankWordmark;
