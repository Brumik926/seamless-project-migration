import { useEffect, useRef } from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, type NavItemKey } from "@/components/bank/BottomNav";
import { BalanceVisibilityContext } from "@/components/bank/BalanceVisibility";
import { settingsQuery, useInvalidateMoney } from "@/hooks/use-bank";
import { processDueItems } from "@/services/bank";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { mode: "login", redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function applyTheme(theme: string) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem("vega-theme", theme);
  } catch {
    // Storage may be unavailable (private mode); the theme still applies for this session.
  }
}

function AuthenticatedLayout() {
  const { data: settings } = useQuery(settingsQuery);
  const invalidateMoney = useInvalidateMoney();
  const processed = useRef(false);

  useEffect(() => {
    if (!settings) return;
    applyTheme(settings.theme);
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings]);

  // Executes due scheduled payments and standing orders once per app session.
  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    processDueItems()
      .then((n) => {
        if (n > 0) {
          toast.info(n === 1 ? "Spracovali sme 1 naplánovanú platbu" : `Spracovali sme ${n} naplánované platby`);
          void invalidateMoney();
        }
      })
      .catch(() => {
        // Non-blocking: the next app start retries.
      });
  }, [invalidateMoney]);

  return (
    <BalanceVisibilityContext.Provider value={settings?.hide_balances ?? false}>
      <div className="mx-auto min-h-dvh max-w-md bg-canvas pb-nav">
        <Outlet />
      </div>
      <BottomNav navItem={(settings?.nav_item as NavItemKey | undefined) ?? "karty"} />
    </BalanceVisibilityContext.Provider>
  );
}
