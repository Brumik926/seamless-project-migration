import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/bank/fields";
import { PageHeader } from "@/components/bank/PageHeader";
import { UnderlineTabs } from "@/components/bank/rows";
import { VegaMark } from "@/components/bank/Logo";
import { bankErrorMessage } from "@/lib/errors";

type Mode = "login" | "register" | "forgot";

type AuthSearch = { mode?: Mode; redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => {
    const out: AuthSearch = {};
    if (s["mode"] === "login" || s["mode"] === "register" || s["mode"] === "forgot") out.mode = s["mode"];
    if (typeof s["redirect"] === "string" && s["redirect"].startsWith("/") && !s["redirect"].startsWith("//"))
      out.redirect = s["redirect"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Prihlásenie – Tatra banka" },
      { name: "description", content: "Prihláste sa alebo si vytvorte demo účet v aplikácii Tatra banka." },
      { property: "og:title", content: "Prihlásenie – Tatra banka" },
      { property: "og:description", content: "Prihlásenie a registrácia do simulovaného bankovníctva Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("Zadajte platný e-mail").max(255),
  password: z.string().min(6, "Heslo musí mať aspoň 6 znakov").max(72),
});
const registerSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Zadajte meno a priezvisko").max(100),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(search.mode ?? "login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<{ email: string; kind: "confirm" | "reset" } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    if (mode === "forgot") {
      const parsed = z.string().trim().email("Zadajte platný e-mail").safeParse(email);
      if (!parsed.success) return setErrors({ email: parsed.error.issues[0]?.message ?? "" });
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setBusy(false);
      if (error) return toast.error(bankErrorMessage(error));
      return setSentTo({ email: parsed.data, kind: "reset" });
    }
    const schema = mode === "register" ? registerSchema : loginSchema;
    const parsed = schema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
      return setErrors(errs);
    }
    setBusy(true);
    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName.trim() },
        },
      });
      setBusy(false);
      if (error) return toast.error(bankErrorMessage(error));
      if (data.session) return navigate({ to: "/domov", replace: true });
      return setSentTo({ email: parsed.data.email, kind: "confirm" });
    }
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    setBusy(false);
    if (error) return toast.error(bankErrorMessage(error));
    navigate({ to: search.redirect ?? "/domov", replace: true });
  }

  if (sentTo) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
        <PageHeader title={sentTo.kind === "confirm" ? "Potvrďte e-mail" : "Obnova hesla"} back="/" />
        <div className="flex flex-1 flex-col items-center px-6 pt-12 text-center animate-page-in">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-accent text-primary animate-pop-in">
            <MailCheck className="h-10 w-10" strokeWidth={1.5} />
          </span>
          <h2 className="mt-6 text-2xl font-extrabold">Skontrolujte svoju schránku</h2>
          <p className="mt-3 text-muted-foreground">
            {sentTo.kind === "confirm"
              ? "Na adresu "
              : "Odkaz na nastavenie nového hesla sme poslali na "}
            <strong className="text-foreground">{sentTo.email}</strong>
            {sentTo.kind === "confirm" ? " sme poslali odkaz na potvrdenie registrácie. Po potvrdení sa môžete prihlásiť." : "."}
          </p>
          <Button
            variant="bank"
            size="xl"
            className="mt-10"
            onClick={() => {
              setSentTo(null);
              setMode("login");
            }}
          >
            Späť na prihlásenie
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <PageHeader title={mode === "forgot" ? "Zabudnuté heslo" : mode === "register" ? "Registrácia" : "Prihlásenie"} back="/" />
      {mode !== "forgot" ? (
        <UnderlineTabs
          tabs={[
            { value: "login", label: "Prihlásiť sa" },
            { value: "register", label: "Nový klient" },
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v);
            setErrors({});
          }}
        />
      ) : null}
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4 px-5 pt-8 pb-8 animate-page-in">
        <div className="mb-4 flex items-center gap-3 text-muted-foreground">
          <VegaMark className="h-8 w-8 text-foreground" />
          <p className="text-sm">
            {mode === "register"
              ? "Vytvorte si demo účet. Dostanete fiktívny zostatok, karty a históriu."
              : mode === "forgot"
                ? "Pošleme vám odkaz na nastavenie nového hesla."
                : "Prihláste sa svojím e-mailom a heslom."}
          </p>
        </div>
        {mode === "register" ? (
          <TextField
            id="fullName"
            label="Meno a priezvisko"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors["fullName"]}
          />
        ) : null}
        <TextField
          id="email"
          label="E-mail"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors["email"]}
        />
        {mode !== "forgot" ? (
          <TextField
            id="password"
            label="Heslo"
            type="password"
            required
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors["password"]}
          />
        ) : null}
        {mode === "login" ? (
          <button type="button" onClick={() => setMode("forgot")} className="self-end text-[0.95rem] font-medium text-link">
            Zabudli ste heslo?
          </button>
        ) : null}
        <div className="mt-auto flex flex-col gap-3 pt-8">
          <Button type="submit" variant="bank" size="xl" disabled={busy}>
            {busy ? "Prosím čakajte…" : mode === "register" ? "Vytvoriť účet" : mode === "forgot" ? "Poslať odkaz" : "Prihlásiť sa"}
          </Button>
          {mode === "forgot" ? (
            <Button type="button" variant="bankOutline" size="xl" onClick={() => setMode("login")}>
              Späť na prihlásenie
            </Button>
          ) : null}
          <p className="text-center text-xs text-muted-foreground">
            Toto je simulácia. Nezadávajte údaje zo svojej skutočnej banky. <Link to="/kontakty" className="text-link">Pomoc</Link>
          </p>
        </div>
      </form>
    </main>
  );
}
