import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Moon, Sun, Smartphone, LogOut, User } from "lucide-react";
import { qk, settingsQuery, useBankMutation } from "@/hooks/use-bank";
import { PageHeader } from "@/components/bank/PageHeader";
import { Section } from "@/components/bank/Section";
import { ToggleRow, NavRow } from "@/components/bank/rows";
import { NAV_CHOICES, type NavItemKey } from "@/components/bank/BottomNav";
import { Button } from "@/components/ui/button";
import { updateSettings, type SettingsPatch } from "@/services/bank";
import { bankErrorMessage } from "@/lib/errors";
import { useSignOut } from "@/hooks/use-sign-out";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/nastavenia")({
  head: () => ({
    meta: [
      { title: "Nastavenia – Tatra banka" },
      { name: "description", content: "Vzhľad aplikácie, súkromie, notifikácie a domovská obrazovka." },
      { property: "og:title", content: "Nastavenia – Tatra banka" },
      { property: "og:description", content: "Nastavenia aplikácie Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(settingsQuery),
  component: SettingsPage,
});

const THEMES = [
  { value: "dark", label: "Tmavý", icon: Moon },
  { value: "light", label: "Svetlý", icon: Sun },
  { value: "system", label: "Podľa systému", icon: Smartphone },
] as const;

function SettingsPage() {
  const { data: s } = useSuspenseQuery(settingsQuery);
  const signOut = useSignOut();
  const save = useBankMutation((p: SettingsPatch) => updateSettings(p), [qk.settings]);
  const apply = (p: SettingsPatch, msg?: string) =>
    save.mutate(p, { onSuccess: () => msg && toast.success(msg), onError: (e) => toast.error(bankErrorMessage(e)) });

  return (
    <div className="flex flex-col gap-3 animate-page-in">
      <PageHeader title="Nastavenia" back />

      <Section title="Vzhľad">
        <div role="radiogroup" aria-label="Téma" className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={s.theme === t.value}
              onClick={() => apply({ theme: t.value })}
              className={cn(
                "bank-field flex flex-col items-center gap-2 px-2 py-4 text-sm font-semibold transition-colors",
                s.theme === t.value ? "ring-2 ring-primary" : "hover:bg-muted",
              )}
            >
              <t.icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Súkromie">
        <ToggleRow id="hide" label="Skryť zostatky" description="Sumy na účtoch a kartách sa zobrazia ako •••" checked={s.hide_balances} onCheckedChange={(v) => apply({ hide_balances: v })} />
      </Section>

      <Section title="Notifikácie">
        <ToggleRow id="n-pay" label="Platby a trvalé príkazy" checked={s.notify_payments} onCheckedChange={(v) => apply({ notify_payments: v })} />
        <ToggleRow id="n-card" label="Karty a limity" checked={s.notify_cards} onCheckedChange={(v) => apply({ notify_cards: v })} />
        <ToggleRow id="n-mkt" label="Marketingové ponuky" checked={s.notify_marketing} onCheckedChange={(v) => apply({ notify_marketing: v })} />
      </Section>

      <Section title="Domovská obrazovka">
        <ToggleRow id="h-cards" label="Karty" checked={s.show_cards} onCheckedChange={(v) => apply({ show_cards: v })} />
        <ToggleRow id="h-sav" label="Sporenia" checked={s.show_savings} onCheckedChange={(v) => apply({ show_savings: v })} />
        <ToggleRow id="h-quick" label="Rýchla platba" checked={s.show_quick_payment} onCheckedChange={(v) => apply({ show_quick_payment: v })} />
        <ToggleRow id="h-spend" label="Prehľad výdavkov" checked={s.show_spending} onCheckedChange={(v) => apply({ show_spending: v })} />
        <ToggleRow id="h-rates" label="Kurzový lístok" checked={s.show_rates} onCheckedChange={(v) => apply({ show_rates: v })} />
      </Section>

      <Section title="Položka v spodnom menu">
        <div role="radiogroup" className="grid grid-cols-2 gap-3">
          {(Object.keys(NAV_CHOICES) as NavItemKey[]).map((k) => {
            const c = NAV_CHOICES[k];
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={s.nav_item === k}
                onClick={() => apply({ nav_item: k }, `V spodnom menu: ${c.label}`)}
                className={cn("bank-field flex items-center gap-3 px-4 py-4 text-left font-semibold", s.nav_item === k ? "ring-2 ring-primary" : "hover:bg-muted")}
              >
                <c.icon className="h-6 w-6 text-primary" strokeWidth={1.5} /> {c.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Účet">
        <NavRow icon={<User className="h-6 w-6" strokeWidth={1.5} />} label="Profil a zmena hesla" to="/profil" />
        <Button variant="bankDanger" size="xl" className="mt-4" onClick={signOut}>
          <LogOut /> Odhlásiť sa
        </Button>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Tatra banka 1.0 · simulované bankovníctvo s fiktívnymi údajmi. <Link to="/kontakty" className="text-link">Podpora</Link>
        </p>
      </Section>
    </div>
  );
}
