import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/bank/PageHeader";
import { UnderlineTabs } from "@/components/bank/rows";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ponuky")({
  head: () => ({
    meta: [
      { title: "Ponuky – Tatra banka" },
      { name: "description", content: "Prehľad osobných a firemných finančných produktov v školskom simulátore." },
      { property: "og:title", content: "Ponuky – Tatra banka" },
      { property: "og:description", content: "Prehľad ukážkových osobných a firemných financií." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Ponuky,
});

const TABS = {
  osobne: { label: "Osobné financie", items: ["Osobné účty", "Úvery", "Sporenia a vklady", "Kreditné karty", "Poistenia", "Investície"] },
  firemne: { label: "Firemné financie", items: ["Podnikateľské účty", "Párovanie platieb", "Termínované vklady", "Financovanie", "Kreditné karty", "Poistenia", "Platobné nástroje"] },
} as const;

const DETAILS: Record<string, string> = {
  "Osobné účty": "Prehľad bežných a sporiacich účtov. V tomto prototype sa nezakladajú skutočné bankové produkty.",
  "Úvery": "Ukážková kategória úverových produktov. Nejde o ponuku ani predschválenie financovania.",
  "Sporenia a vklady": "Informácie o možnostiach sporenia a termínovaných vkladov v rámci ukážkového rozhrania.",
  "Kreditné karty": "Prehľad ukážkových možností kreditných kariet. Žiadosť o skutočnú kartu nie je dostupná.",
  "Poistenia": "Informačná kategória poistenia; simulátor neposkytuje poistné zmluvy.",
  "Investície": "Informačná kategória investovania bez skutočných investičných pokynov.",
  "Podnikateľské účty": "Ukážkový prehľad účtov pre podnikateľov.",
  "Párovanie platieb": "Informačný prehľad možností párovania platieb.",
  "Termínované vklady": "Ukážková kategória termínovaných vkladov.",
  "Financovanie": "Informačný prehľad firemného financovania.",
  "Platobné nástroje": "Ukážková kategória platobných nástrojov pre podnikateľov.",
};

function Ponuky() {
  const [tab, setTab] = useState<keyof typeof TABS>("osobne");
  const [open, setOpen] = useState<string | null>(null);
  const items = TABS[tab].items;
  return (
    <div className="flex flex-col gap-3 pb-8 animate-page-in">
      <PageHeader title="Ponuky" />
      <div className="-mt-2 bg-background">
        <UnderlineTabs
          tabs={[
            { value: "osobne", label: "Osobné financie" },
            { value: "firemne", label: "Firemné financie" },
          ]}
          value={tab}
          onChange={(value) => { setTab(value); setOpen(null); }}
        />
      </div>
      <section className="bank-section py-0">
        {items.map((item) => {
          const expanded = open === item;
          return (
            <div key={item} className="border-b border-border last:border-0">
              <button type="button" aria-expanded={expanded} onClick={() => setOpen(open === item ? null : item)} className="flex w-full items-center gap-3 py-5 text-left text-[1.1rem]">
                {item}
                {tab === "osobne" && item === "Úvery" ? <span className="rounded bg-primary px-1.5 text-xs font-bold text-primary-foreground">TOP</span> : null}
                <ChevronDown className={cn("ml-auto h-6 w-6 shrink-0 text-primary transition-transform", expanded && "rotate-180")} />
              </button>
              {expanded ? <p className="pb-5 pr-4 text-sm leading-6 text-muted-foreground">{DETAILS[item] ?? `Ukážkový informačný prehľad: ${item.toLowerCase()}. V simulátore sa nevykonávajú skutočné finančné operácie.`}</p> : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}
