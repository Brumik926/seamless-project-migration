import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { LogOut } from "lucide-react";
import { profileQuery, qk, settingsQuery, useBankMutation } from "@/hooks/use-bank";
import { PageHeader } from "@/components/bank/PageHeader";
import { NavRow, ToggleRow, DetailRow } from "@/components/bank/rows";
import { BottomSheet } from "@/components/bank/BottomSheet";
import { FieldShell, TextField } from "@/components/bank/fields";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { updateProfile, updateSettings, type ProfilePatch } from "@/services/bank";
import { bankErrorMessage } from "@/lib/errors";
import { formatShortDate } from "@/lib/format";
import { zodErrors } from "@/lib/forms";
import { useSignOut } from "@/hooks/use-sign-out";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Profil – Tatra banka" },
      { name: "description", content: "Osobné a kontaktné údaje, adresa a zmena hesla." },
      { property: "og:title", content: "Profil – Tatra banka" },
      { property: "og:description", content: "Osobný profil klienta aplikácie Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([queryClient.ensureQueryData(profileQuery), queryClient.ensureQueryData(settingsQuery)]),
  component: ProfilePage,
});

const personalSchema = z.object({
  full_name: z.string().trim().min(2, "Zadajte meno a priezvisko").max(100),
  birth_date: z
    .string()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || (/^\d{4}-\d{2}-\d{2}$/.test(v) && v < new Date().toISOString().slice(0, 10)), "Neplatný dátum narodenia"),
});
const contactSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\+?[0-9 ]{6,20}$/.test(v), "Zadajte platné telefónne číslo"),
});
const addressSchema = z.object({
  street: z.string().trim().max(120).transform((v) => (v ? v : null)),
  city: z.string().trim().max(80).transform((v) => (v ? v : null)),
  zip: z
    .string()
    .trim()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\d{3}\s?\d{2}$/.test(v), "PSČ má tvar 040 01"),
});

type Sheet = "personal" | "contact" | "address" | "password" | null;

function ProfilePage() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const signOut = useSignOut();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = useBankMutation((p: ProfilePatch) => updateProfile(p), [qk.profile]);
  const marketing = useBankMutation((v: boolean) => updateSettings({ notify_marketing: v }), [qk.settings]);

  function open(s: Exclude<Sheet, null>) {
    setErrors({});
    setForm({
      full_name: profile.full_name,
      birth_date: profile.birth_date ?? "",
      phone: profile.phone ?? "",
      street: profile.street ?? "",
      city: profile.city ?? "",
      zip: profile.zip ?? "",
      current: "",
      next: "",
      confirm: "",
    });
    setSheet(s);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const schema = sheet === "personal" ? personalSchema : sheet === "contact" ? contactSchema : addressSchema;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return setErrors(zodErrors(parsed.error));
    save.mutate(parsed.data as ProfilePatch, {
      onSuccess: () => {
        toast.success("Údaje boli uložené");
        setSheet(null);
      },
      onError: (err) => toast.error(bankErrorMessage(err)),
    });
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const next = form["next"] ?? "";
    if ((form["current"] ?? "").length < 1) return setErrors({ current: "Zadajte súčasné heslo" });
    if (next.length < 6) return setErrors({ next: "Nové heslo musí mať aspoň 6 znakov" });
    if (next !== form["confirm"]) return setErrors({ confirm: "Heslá sa nezhodujú" });
    setBusy(true);
    try {
      const email = profile.email ?? "";
      const { error: verifyErr } = await supabase.auth.signInWithPassword({ email, password: form["current"] ?? "" });
      if (verifyErr) {
        setErrors({ current: "Súčasné heslo nie je správne" });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success("Heslo bolo zmenené");
      setSheet(null);
    } catch (err) {
      toast.error(bankErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const f = (k: string) => ({ value: form[k] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value }), error: errors[k] });

  return (
    <div className="flex flex-col gap-4 px-5 pb-8 animate-page-in">
      <PageHeader title="Profil" back className="-mx-5" />
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-background px-5 shadow-tile">
        <h2 className="border-b border-border py-5 text-xl font-bold">{profile.full_name || "Klient"}</h2>
        <DetailRow className="border-t-0" label="PID – osobné identifikačné číslo" value={profile.client_number} />
        <DetailRow label="E-mail" value={profile.email ?? "—"} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-background px-5 shadow-tile">
        <h2 className="border-b border-border py-5 text-xl font-bold">Osobné a klientske údaje</h2>
        <NavRow label="Identifikačné a osobné údaje" description={profile.birth_date ? `Dátum narodenia ${formatShortDate(profile.birth_date)}` : "Meno a dátum narodenia"} onClick={() => open("personal")} className="border-b border-border" />
        <NavRow label="Kontaktné údaje" description={profile.phone ?? "Telefónne číslo"} onClick={() => open("contact")} className="border-b border-border" />
        <NavRow label="Adresa trvalého pobytu" description={[profile.street, profile.zip, profile.city].filter(Boolean).join(", ") || "Ulica, mesto a PSČ"} onClick={() => open("address")} className="border-b border-border" />
        <NavRow label="Zmena hesla" onClick={() => open("password")} />
      </section>

      <section className="rounded-xl bg-background px-5 shadow-tile">
        <h2 className="border-b border-border py-5 text-xl font-bold">Povolenia</h2>
        <ToggleRow
          id="marketing"
          label="Marketingové notifikácie"
          description="Ponuky a novinky aplikácie Tatra banka"
          checked={settings.notify_marketing}
          disabled={marketing.isPending}
          onCheckedChange={(v) => marketing.mutate(v, { onSuccess: () => toast.success("Uložené"), onError: (e) => toast.error(bankErrorMessage(e)) })}
        />
      </section>

      <Button variant="bankDanger" size="xl" className="mt-3" onClick={signOut}>
        <LogOut /> Odhlásiť sa
      </Button>

      <BottomSheet open={sheet !== null && sheet !== "password"} onOpenChange={(v) => !v && setSheet(null)} title={sheet === "personal" ? "Osobné údaje" : sheet === "contact" ? "Kontaktné údaje" : "Adresa"}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {sheet === "personal" ? (
            <>
              <TextField id="p-name" label="Meno a priezvisko" maxLength={100} {...f("full_name")} />
              <FieldShell label="Dátum narodenia" htmlFor="p-birth" error={errors["birth_date"]}>
                <input id="p-birth" type="date" value={form["birth_date"] ?? ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="relative w-full bg-transparent text-[1.05rem] outline-none" />
              </FieldShell>
            </>
          ) : null}
          {sheet === "contact" ? (
            <>
              <TextField id="p-phone" label="Telefón" type="tel" autoComplete="tel" placeholder="+421 900 000 000" {...f("phone")} />
              <p className="text-sm text-muted-foreground">E-mail {profile.email} slúži na prihlásenie a nedá sa tu zmeniť.</p>
            </>
          ) : null}
          {sheet === "address" ? (
            <>
              <TextField id="p-street" label="Ulica a číslo" maxLength={120} autoComplete="street-address" {...f("street")} />
              <TextField id="p-city" label="Mesto" maxLength={80} autoComplete="address-level2" {...f("city")} />
              <TextField id="p-zip" label="PSČ" maxLength={6} inputMode="numeric" autoComplete="postal-code" {...f("zip")} />
            </>
          ) : null}
          <Button type="submit" variant="bank" size="xl" disabled={save.isPending}>
            {save.isPending ? "Ukladám…" : "Uložiť"}
          </Button>
        </form>
      </BottomSheet>

      <BottomSheet open={sheet === "password"} onOpenChange={(v) => !v && setSheet(null)} title="Zmena hesla">
        <form onSubmit={changePassword} noValidate className="flex flex-col gap-4">
          <TextField id="pw-cur" label="Súčasné heslo" type="password" autoComplete="current-password" {...f("current")} />
          <TextField id="pw-new" label="Nové heslo" type="password" autoComplete="new-password" {...f("next")} />
          <TextField id="pw-conf" label="Zopakujte nové heslo" type="password" autoComplete="new-password" {...f("confirm")} />
          <Button type="submit" variant="bank" size="xl" disabled={busy}>
            {busy ? "Mením…" : "Zmeniť heslo"}
          </Button>
        </form>
      </BottomSheet>
    </div>
  );
}
