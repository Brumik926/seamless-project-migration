import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, CreditCard, ShieldCheck, Send, CalendarClock, X, CheckCheck } from "lucide-react";
import { notificationsQuery, qk, useBankMutation } from "@/hooks/use-bank";
import { PageHeader } from "@/components/bank/PageHeader";
import { EmptyState } from "@/components/bank/rows";
import { deleteNotification, markAllNotificationsRead, markNotificationRead, type Notification } from "@/services/bank";
import { formatShortDate, formatTime } from "@/lib/format";
import { bankErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notifikacie")({
  head: () => ({
    meta: [
      { title: "Notifikácie – Tatra banka" },
      { name: "description", content: "Správy o platbách, kartách a bezpečnosti." },
      { property: "og:title", content: "Notifikácie – Tatra banka" },
      { property: "og:description", content: "Správy a notifikácie v mobilnom bankovníctve Tatra banka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(notificationsQuery),
  component: Notifications,
});

const ICONS: Record<string, typeof Bell> = {
  payment: Send,
  card: CreditCard,
  security: ShieldCheck,
  standing_order: CalendarClock,
  info: Bell,
};

function Notifications() {
  const router = useRouter();
  const { data: items } = useSuspenseQuery(notificationsQuery);
  const markAll = useBankMutation(() => markAllNotificationsRead(), [qk.notifications]);
  const markOne = useBankMutation((n: Notification) => markNotificationRead(n.id, true), [qk.notifications]);
  const remove = useBankMutation((id: string) => deleteNotification(id), [qk.notifications]);
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="flex min-h-dvh flex-col animate-page-in">
      <PageHeader
        title="Notifikácie"
        back
        right={
          unread > 0 ? (
            <Button
              variant="bankGhost"
              size="icon"
              aria-label="Prečítať všetko"
              title="Prečítať všetko"
              onClick={() => markAll.mutate(undefined, { onSuccess: () => toast.success("Všetko označené ako prečítané"), onError: (e) => toast.error(bankErrorMessage(e)) })}
            >
              <CheckCheck className="h-6 w-6" />
            </Button>
          ) : null
        }
      />
      <section className="bank-section flex-1 px-0 pt-0">
        {items.length === 0 ? <EmptyState title="Nemáte žiadne notifikácie." /> : null}
        <ul>
          {items.map((n) => {
            const Icon = ICONS[n.kind] ?? Bell;
            return (
              <li key={n.id} className="relative border-t border-border first:border-t-0">
                <button
                  type="button"
                  onClick={() => {
                    if (!n.is_read) markOne.mutate(n);
                    if (n.link && n.link.startsWith("/")) router.history.push(n.link);
                  }}
                  className={cn("flex w-full items-start gap-4 px-5 py-4 pr-14 text-left transition-colors hover:bg-card/50", !n.is_read && "bg-accent/40")}
                >
                  <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card text-primary">
                    <Icon className="h-5 w-5" strokeWidth={1.6} />
                    {!n.is_read ? <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-primary" aria-label="Neprečítané" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block break-words", !n.is_read && "font-bold")}>{n.title.replace(/Vega banke/gi, "aplikácii")}</span>
                    <span className="mt-0.5 block break-words text-[0.95rem] text-muted-foreground">{n.body.replace(/Vega banka/gi, "Aplikácia")}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatShortDate(n.created_at)} {formatTime(n.created_at)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Odstrániť notifikáciu"
                  onClick={() => remove.mutate(n.id, { onError: (e) => toast.error(bankErrorMessage(e)) })}
                  className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
