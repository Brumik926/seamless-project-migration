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
      { name: "description", content: "Prehľad osobných a firemných finančných produktov Tatra banky." },
      { property: "og:title", content: "Ponuky – Tatra banka" },
      { property: "og:description", content: "Prehľad osobných a firemných financií." },
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
  "Osobné účty": "Prehľad bežných a sporiacich účtov pre každodenné financie.",
  "Úvery": "Bezúčelový úver a spotrebné financovanie s rýchlym vybavením online.",
  "Sporenia a vklady": "Pravidelné sporenie a termínované vklady s výhodným úročením.",
  "Kreditné karty": "Prehľad kreditných kariet s cestovným poistením a programom odmien.",
  "Poistenia": "Cestovné poistenie, poistenie nehnuteľnosti a poistenie splácania úveru.",
  "Investície": "Prehľad investičných možností a podielových fondov.",
  "Podnikateľské účty": "Podnikateľské účty a balíky služieb pre živnostníkov a firmy.",
  "Párovanie platieb": "Informačný prehľad možností párovania platieb.",
  "Termínované vklady": "Zhodnotenie voľných firemných prostriedkov na termínovanom vklade.",
  "Financovanie": "Informačný prehľad firemného financovania.",
  "Platobné nástroje": "POS terminály, platobná brána TatraPay+ a firemné platobné karty.",
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
              {expanded ? <p className="pb-5 pr-4 text-sm leading-6 text-muted-foreground">{DETAILS[item] ?? `Kompletný prehľad a správa pre sekciu ${item.toLowerCase()}.`}</p> : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}
