import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** Label / value line used in detail screens. */
export function DetailRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-baseline gap-4 border-t border-border py-4", className)}>
      <span className="text-[0.95rem] text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-[1.05rem] break-words">{value}</span>
    </div>
  );
}

type NavRowProps = {
  icon?: ReactNode;
  label: string;
  description?: string;
  to?: string;
  onClick?: () => void;
  right?: ReactNode;
  className?: string;
};

/** Tappable list row with optional leading icon and trailing chevron. */
export function NavRow({ icon, label, description, to, onClick, right, className }: NavRowProps) {
  const body = (
    <>
      {icon ? <span className="grid w-10 shrink-0 place-items-center text-primary">{icon}</span> : null}
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[1.05rem]">{label}</span>
        {description ? <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span> : null}
      </span>
      {right ?? <ChevronRight className="h-6 w-6 shrink-0 text-primary" strokeWidth={1.8} />}
    </>
  );
  const cls = cn("flex w-full items-center gap-4 py-4 transition-colors hover:bg-card/50", className);
  if (to) {
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  id,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  id: string;
}) {
  return (
    <div className="flex items-center gap-4 border-t border-border py-4 first:border-t-0">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-[1.05rem]">{label}</span>
        {description ? <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span> : null}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-[1.05rem] text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

/** Underlined tabs like "Všetky / Príjemcovia / Šablóny". */
export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="grid border-b border-border" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "relative truncate px-2 py-4 text-[1.05rem] transition-colors",
            value === t.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          <span
            className={cn(
              "absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-primary transition-opacity",
              value === t.value ? "opacity-100" : "opacity-0",
            )}
          />
        </button>
      ))}
    </div>
  );
}
