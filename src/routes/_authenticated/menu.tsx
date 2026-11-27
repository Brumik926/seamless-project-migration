import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, User, Bell, Phone, BarChart3, CreditCard, PieChart, LineChart, Settings, LogOut, Search, Tag, Briefcase, Landmark, Store, PiggyBank, Shield, Baby } from "lucide-react";
import { notificationsQuery, profileQuery } from "@/hooks/use-bank";
import { NavRow } from "@/components/bank/rows";
import { useSignOut } from "@/hooks/use-sign-out";

export const Route = createFileRoute("/_authenticated/menu")({
  head: () => ({
    meta: [
      { title: "Menu – Tatra banka" },
      { name: "description", content: "Hlavné menu aplikácie Tatra banka." },
      { property: "og:title", content: "Menu – Tatra banka" },
      { property: "og:description", content: "Hlavné menu aplikácie Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MenuPage,
});

function Group({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <NavRow icon={icon} label={label} onClick={() => setOpen(!open)} right={<ChevronDown className={`h-6 w-6 text-primary transition-transform ${open ? "rotate-180" : ""}`} />} />
      {open ? <div className="pb-2 pl-14">{children}</div> : null}
    </div>
  );
}

function MenuPage() {
  const { data: profile } = useQuery(profileQuery);
  const { data: notifications } = useQuery(notificationsQuery);
  const unread = notifications?.filter((n) => !n.is_read).length ?? 0;
  const signOut = useSignOut();
  const ic = "h-7 w-7";
  return (
    <div className="min-h-dvh bg-background animate-page-in">
      <header className="sticky top-0 z-30 grid grid-cols-3 items-center bg-background px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
        <Search className="h-7 w-7 text-primary" strokeWidth={1.5} aria-hidden="true" />
        <h1 className="text-center text-[1.6rem] font-extrabold">Menu</h1>
        <button type="button" onClick={signOut} className="justify-self-end font-medium text-link">Odhlásiť sa</button>
      </header>
      <nav className="px-5">
        <NavRow icon={<User className={ic} strokeWidth={1.4} />} label={profile?.full_name || "Profil"} description="Profil" to="/profil" className="border-b border-border" />
        <NavRow icon={<Tag className={ic} strokeWidth={1.4} />} label="Ponuky" to="/ponuky" className="border-b border-border" />
        <NavRow icon={<Bell className={ic} strokeWidth={1.4} />} label={unread ? `Notifikácie (${unread})` : "Notifikácie"} to="/notifikacie" className="border-b border-border" />
        <NavRow icon={<Phone className={ic} strokeWidth={1.4} />} label="Kontakty" to="/kontakty" className="border-b border-border" />
        <Group icon={<BarChart3 className={ic} strokeWidth={1.4} />} label="Účty a platby">
          <NavRow label="Pohyby" to="/pohyby" />
          <NavRow label="Nová platba" to="/platba" />
          <NavRow label="Príjemcovia" to="/prijemcovia" />
          <NavRow label="Šablóny" to="/sablony" />
          <NavRow label="Trvalé príkazy" to="/trvale-prikazy" />
        </Group>
        <NavRow icon={<CreditCard className={ic} strokeWidth={1.4} />} label="Karty" to="/karty" className="border-b border-border" />
        <Group icon={<Briefcase className={ic} strokeWidth={1.4} />} label="Moja firma">
          <NavRow label="Firemné financie" to="/ponuky" />
        </Group>
        <Group icon={<Landmark className={ic} strokeWidth={1.4} />} label="Úvery">
          <NavRow label="Ponuka úverov" to="/ponuky" />
        </Group>
        <Group icon={<Store className={ic} strokeWidth={1.4} />} label="Služby pre podnikateľov">
          <NavRow label="Podnikateľské účty" to="/ponuky" />
        </Group>
        <Group icon={<PieChart className={ic} strokeWidth={1.4} />} label="MaFIN">
          <NavRow label="Prehľad príjmov a výdavkov" to="/mafin" />
        </Group>
        <NavRow icon={<PiggyBank className={ic} strokeWidth={1.4} />} label="DDS dôchodok" to="/ponuky" className="border-b border-border" />
        <NavRow icon={<Shield className={ic} strokeWidth={1.4} />} label="Poistné produkty" to="/ponuky" className="border-b border-border" />
        <NavRow icon={<Baby className={ic} strokeWidth={1.4} />} label="Rodičovská zóna" to="/ponuky" className="border-b border-border" />
        <NavRow icon={<LineChart className={ic} strokeWidth={1.4} />} label="Kurzový lístok" to="/kurzy" className="border-b border-border" />
        <NavRow icon={<Settings className={ic} strokeWidth={1.4} />} label="Nastavenia" to="/nastavenia" className="border-b border-border" />
        <NavRow icon={<LogOut className={ic} strokeWidth={1.4} />} label="Odhlásiť sa" onClick={signOut} />
      </nav>
    </div>
  );
}
