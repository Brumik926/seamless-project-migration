import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean;
};

/** Full-bleed content block separated from neighbours by the canvas gap. */
export function Section({ title, action, children, className, flush }: Props) {
  return (
    <section className={cn("bank-section", flush && "px-0", className)}>
      {title || action ? (
        <div className={cn("mb-4 flex items-center justify-between gap-3", flush && "px-5")}>
          {title ? <h2 className="text-[1.25rem] font-bold tracking-tight">{title}</h2> : <span />}
          {action ? <div className="shrink-0 text-[0.875rem] font-semibold text-link">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SectionStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-3", className)}>{children}</div>;
}
