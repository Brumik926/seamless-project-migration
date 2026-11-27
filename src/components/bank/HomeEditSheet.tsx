import { useState } from "react";
import { toast } from "sonner";
import { Home, Star } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { NavRow, ToggleRow } from "./rows";
import { NAV_CHOICES, type NavItemKey } from "./BottomNav";
import { qk, useBankMutation } from "@/hooks/use-bank";
import { updateSettings, type SettingsPatch, type UserSettings } from "@/services/bank";
import { bankErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

const SECTIONS: { key: keyof Pick<UserSettings, "show_cards" | "show_savings" | "show_quick_payment" | "show_spending" | "show_rates">; label: string }[] = [
  { key: "show_cards", label: "Karty" },
  { key: "show_savings", label: "Sporenia" },
  { key: "show_quick_payment", label: "Rýchla platba" },
  { key: "show_spending", label: "Prehľad výdavkov" },
  { key: "show_rates", label: "Kurzový lístok" },
];

type EditSection = "main" | "home" | "navigation";

/** Two-step "Upraviť zobrazenie" sheet matching the reference interaction. */
export function HomeEditSheet({
  open,
  onOpenChange,
  settings,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  settings: UserSettings;
}) {
  const [section, setSection] = useState<EditSection>("main");
  const save = useBankMutation((patch: SettingsPatch) => updateSettings(patch), [qk.settings]);
  const apply = (patch: SettingsPatch, label?: string) =>
    save.mutate(patch, {
      onSuccess: () => label && toast.success(label),
      onError: (e) => toast.error(bankErrorMessage(e)),
    });
  const handleOpenChange = (value: boolean) => {
    if (!value) setSection("main");
    onOpenChange(value);
  };

  return (
    <BottomSheet open={open} onOpenChange={handleOpenChange} title="Upraviť zobrazenie">
      {section === "main" ? (
        <div className="-mt-2">
          <NavRow
            icon={<Home className="h-7 w-7" strokeWidth={1.5} />}
            label="Domovská obrazovka"
            description="Pridajte a usporiadajte si jednotlivé widgety podľa toho, ako ich používate."
            onClick={() => setSection("home")}
            className="border-b border-border"
          />
          <NavRow
            icon={<Star className="h-7 w-7" strokeWidth={1.5} />}
            label="Položka v spodnom menu"
            description="Vyberte si štvrtú položku spodnej navigácie podľa vašich preferencií."
            onClick={() => setSection("navigation")}
          />
        </div>
      ) : (
        <>
          <button type="button" onClick={() => setSection("main")} className="mb-4 font-medium text-link">← Späť</button>
          {section === "home" ? (
            <>
              <h3 className="text-lg font-extrabold">Domovská obrazovka</h3>
              <p className="mb-2 text-sm text-muted-foreground">Vyberte, ktoré časti sa zobrazia na domovskej obrazovke.</p>
              <div>
                {SECTIONS.map((item) => (
                  <ToggleRow
                    key={item.key}
                    id={`home-${item.key}`}
                    label={item.label}
                    checked={settings[item.key]}
                    disabled={save.isPending}
                    onCheckedChange={(value) => apply({ [item.key]: value })}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-extrabold">Položka v spodnom menu</h3>
              <p className="mb-3 text-sm text-muted-foreground">Vyberte štvrtú položku spodnej navigácie.</p>
              <div role="radiogroup" className="grid grid-cols-2 gap-3">
                {(Object.keys(NAV_CHOICES) as NavItemKey[]).map((key) => {
                  const choice = NAV_CHOICES[key];
                  const Icon = choice.icon;
                  const active = settings.nav_item === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={save.isPending}
                      onClick={() => apply({ nav_item: key }, `V spodnom menu: ${choice.label}`)}
                      className={cn(
                        "bank-field flex items-center gap-3 px-4 py-4 text-left transition-colors disabled:opacity-50",
                        active ? "ring-2 ring-primary" : "hover:bg-muted",
                      )}
                    >
                      <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                      <span className="font-semibold">{choice.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </BottomSheet>
  );
}
