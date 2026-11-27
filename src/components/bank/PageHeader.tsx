import type { ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  back?: boolean | string;
  right?: ReactNode;
  className?: string;
  children?: ReactNode;
};

/** Sticky screen header: optional back arrow, bold title and right-side actions. */
export function PageHeader({ title, back, right, className, children }: Props) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/60 bg-background/95 px-5 pt-[calc(env(safe-area-inset-top)+0.9rem)] pb-3 backdrop-blur supports-[backdrop-filter]:bg-background/85",
        className,
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-4">
          {back ? (
            typeof back === "string" ? (
              <Link to={back} aria-label="Späť" className="-ml-1 shrink-0 p-1 text-primary">
                <ArrowLeft className="h-7 w-7" strokeWidth={1.6} />
              </Link>
            ) : (
              <button
                type="button"
                aria-label="Späť"
                onClick={() => router.history.back()}
                className="-ml-1 shrink-0 p-1 text-primary"
              >
                <ArrowLeft className="h-7 w-7" strokeWidth={1.6} />
              </button>
            )
          ) : null}
          <h1 className="truncate text-[1.45rem] font-bold tracking-tight">{title}</h1>
        </div>
        {right ? <div className="flex shrink-0 items-center gap-3">{right}</div> : null}
      </div>
      {children}
    </header>
  );
}

export function HeaderIconButton({
  label,
  onClick,
  children,
  badge,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  badge?: number;
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="relative p-1 text-primary">
      {children}
      {badge ? (
        <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-primary bg-background px-1 text-[0.65rem] font-bold text-foreground">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}
