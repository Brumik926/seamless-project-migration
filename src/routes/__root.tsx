import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-extrabold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-bold text-foreground">Stránka neexistuje</h2>
        <p className="mt-2 text-sm text-muted-foreground">Stránku, ktorú hľadáte, sme nenašli.</p>
        <Button asChild variant="bank" size="xl" className="mt-6">
          <Link to="/">Späť na úvod</Link>
        </Button>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-bold text-foreground">Stránku sa nepodarilo načítať</h1>
        <p className="mt-2 text-sm text-muted-foreground">Niečo sa pokazilo. Skúste to znova.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="bank"
            size="xl"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Skúsiť znova
          </Button>
          <Button asChild variant="bankOutline" size="xl">
            <a href="/">Späť na úvod</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Applies the cached theme before paint so the dark/light choice never flashes.
const themeInit = `(function(){try{var t=localStorage.getItem('vega-theme')||'dark';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1c1e24" },
      { title: "Tatra banka – simulované mobilné bankovníctvo" },
      { name: "description", content: "Neoficiálny školský simulátor mobilného bankovníctva s fiktívnymi údajmi a platbami, ktoré prebiehajú iba v simulátore." },
      { name: "author", content: "Školský projekt – neoficiálny simulátor" },
      { property: "og:title", content: "Tatra banka – simulované mobilné bankovníctvo" },
      { property: "og:description", content: "Neoficiálny školský simulátor mobilného bankovníctva s fiktívnymi údajmi a platbami, ktoré prebiehajú iba v simulátore." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
    scripts: [{ children: themeInit }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="sk" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" closeButton />
    </QueryClientProvider>
  );
}
