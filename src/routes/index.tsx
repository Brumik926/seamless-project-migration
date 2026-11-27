import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleHelp, LineChart, Play, Compass, MessageCircle, Menu } from "lucide-react";
import art from "@/assets/welcome-cubist.jpg";
import { Button } from "@/components/ui/button";
import { VegaWordmark, BANK_NAME } from "@/components/bank/Logo";
import { useSession } from "@/hooks/use-session";
import { formatShortDate } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tatra banka – vitajte v simulovanom bankovníctve" },
      {
        name: "description",
        content: "Prihláste sa do mobilného bankovníctva Tatra banka: účty, karty, platby a prehľad výdavkov s fiktívnymi údajmi.",
      },
      { property: "og:title", content: "Tatra banka – vitajte v simulovanom bankovníctve" },
      {
        property: "og:description",
        content: "Demo mobilné bankovníctvo s fiktívnymi údajmi. Žiadne platby neodchádzajú do skutočných bánk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { session } = useSession();
  return (
    <div className="dark">
      <main className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden bg-canvas text-foreground">
        <img src={art} alt="" width={768} height={1536} className="absolute inset-y-0 right-0 h-full w-[85%] object-cover object-left opacity-90" />
        <div className="welcome-fade absolute inset-0" />

        <div className="relative flex justify-end px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
          <Link to="/kontakty" aria-label="Pomoc a kontakty" className="rounded-full p-1 text-primary">
            <CircleHelp className="h-11 w-11" strokeWidth={1.3} />
          </Link>
        </div>

        <div className="relative mt-[18dvh] flex justify-center animate-page-in">
          <VegaWordmark />
        </div>

        <div className="relative mt-auto px-6 pb-6">
          <h1 className="text-center text-[2rem] leading-tight font-normal">
            Vitajte vo svete <strong className="font-extrabold">inovatívneho bankovníctva</strong>
          </h1>
          <div className="mt-8 flex flex-col gap-4">
            {session ? (
              <Button asChild variant="bank" size="xl">
                <Link to="/domov">Pokračovať do aplikácie</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="bank" size="xl">
                  <Link to="/auth" search={{ mode: "login" }}>
                    Prihlásiť sa
                  </Link>
                </Button>
                <Button asChild variant="bankOutline" size="xl">
                  <Link to="/auth" search={{ mode: "register" }}>
                    Som tu prvýkrát
                  </Link>
                </Button>
              </>
            )}
          </div>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {BANK_NAME.toUpperCase()} 1.0 · žiadne skutočné platby
          </p>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Aktuálny bankový deň: {formatShortDate(new Date())}
          </p>
        </div>

        <nav aria-label="Rýchle odkazy" className="relative grid grid-cols-5 border-t border-border bg-canvas safe-bottom">
          <Link to="/auth" search={{ mode: "register" }} className="flex flex-col items-center gap-1 py-3 text-center text-xs leading-tight text-muted-foreground hover:text-foreground">
            <Play className="h-7 w-7 text-primary" strokeWidth={1.4} />
            <span>Vyskúšať<br /> </span>
          </Link>
          <Link to="/kontakty" className="flex flex-col items-center gap-1 py-3 text-center text-xs leading-tight text-muted-foreground hover:text-foreground">
            <Compass className="h-7 w-7 text-primary" strokeWidth={1.4} />
            <span>Pobočky<br />a bankomaty</span>
          </Link>
          <Link to="/kurzy" className="flex flex-col items-center gap-1 py-3 text-center text-xs leading-tight text-muted-foreground hover:text-foreground">
            <LineChart className="h-7 w-7 text-primary" strokeWidth={1.4} />
            <span>Kurzový<br />lístok</span>
          </Link>
          <Link to="/kontakty" className="flex flex-col items-center gap-1 py-3 text-center text-xs leading-tight text-muted-foreground hover:text-foreground">
            <MessageCircle className="h-7 w-7 text-primary" strokeWidth={1.4} />
            <span>Chatbot<br />Adam</span>
          </Link>
          <Link to="/kontakty" className="flex flex-col items-center gap-1 py-3 text-center text-xs leading-tight text-muted-foreground hover:text-foreground">
            <Menu className="h-7 w-7 text-primary" strokeWidth={1.4} />
            <span>Viac<br />možností</span>
          </Link>
        </nav>
      </main>
    </div>
  );
}
