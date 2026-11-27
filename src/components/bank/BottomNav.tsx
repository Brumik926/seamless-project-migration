import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ArrowLeftRight, ShoppingCart, Menu, Send, PieChart, Users, CalendarClock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItemKey = "karty" | "mafin" | "prijemcovia" | "trvale-prikazy";

/** Choices for the user-configurable fourth tab ("Položka v spodnom menu"). The persisted legacy key `karty` maps to the reference default `Ponuky` without a database migration. */
export const NAV_CHOICES: Record<NavItemKey, { to: string; label: string; icon: LucideIcon }> = {
  karty: { to: "/ponuky", label: "Ponuky", icon: ShoppingCart },
  mafin: { to: "/mafin", label: "MaFin", icon: PieChart },
  prijemcovia: { to: "/prijemcovia", label: "Príjemcovia", icon: Users },
  "trvale-prikazy": { to: "/trvale-prikazy", label: "Príkazy", icon: CalendarClock },
};

type Item = { to: string; label: string; icon: LucideIcon; match: string[]; center?: boolean };

/** Fixed mobile tab bar; the active tab is tinted with the primary blue. */
export function BottomNav({ navItem = "karty" }: { navItem?: NavItemKey }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fourth = NAV_CHOICES[navItem] ?? NAV_CHOICES.karty;
  const items: Item[] = [
    { to: "/domov", label: "Domov", icon: Home, match: ["/domov"] },
    { to: "/pohyby", label: "Pohyby", icon: ArrowLeftRight, match: ["/pohyby", "/transakcia"] },
    { to: "/platba", label: "Platba", icon: Send, match: ["/platba"], center: true },
    { to: fourth.to, label: fourth.label, icon: fourth.icon, match: [fourth.to] },
    { to: "/menu", label: "Viac", icon: Menu, match: ["/menu"] },
  ];
  const activeIndex = items.findIndex((it) => it.match.some((m) => pathname === m || pathname.startsWith(m + "/")));
  return (
    <nav
      aria-label="Hlavná navigácia"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-border/80 bg-nav/95 shadow-[0_-6px_24px_-20px_rgba(0,0,0,0.35)] backdrop-blur safe-bottom"
    >
      <ul className="grid h-[4.75rem] grid-cols-5 items-end">
        {items.map((item, i) => {
          const active = i === activeIndex;
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex h-full justify-center">
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex w-full flex-col items-center justify-end gap-1 pb-2.5 text-[0.72rem] font-semibold transition-colors",
                  active ? "text-primary" : "text-foreground/90 hover:text-foreground",
                )}
              >
                {item.center ? (
                  <span
                    aria-hidden="true"
                    className="absolute -top-[1.15rem] left-1/2 flex h-[3.35rem] w-[3.35rem] -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_rgba(0,0,0,0.55)]"
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.7} />
                  </span>
                ) : (
                  <Icon className="relative h-6 w-6" strokeWidth={1.7} />
                )}
                <span className="relative max-w-full truncate px-1">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
