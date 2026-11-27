import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import * as bank from "@/services/bank";

export const qk = {
  accounts: ["accounts"] as const,
  transactions: ["transactions"] as const,
  transaction: (id: string) => ["transactions", id] as const,
  recipients: ["recipients"] as const,
  templates: ["templates"] as const,
  standingOrders: ["standing-orders"] as const,
  cards: ["cards"] as const,
  cardLimits: (id: string) => ["card-limits", id] as const,
  notifications: ["notifications"] as const,
  settings: ["settings"] as const,
  profile: ["profile"] as const,
  support: ["support-requests"] as const,
};

export const accountsQuery = queryOptions({ queryKey: qk.accounts, queryFn: bank.fetchAccounts });
export const transactionsQuery = queryOptions({ queryKey: qk.transactions, queryFn: bank.fetchTransactions });
export const transactionQuery = (id: string) =>
  queryOptions({ queryKey: qk.transaction(id), queryFn: () => bank.fetchTransaction(id) });
export const recipientsQuery = queryOptions({ queryKey: qk.recipients, queryFn: bank.fetchRecipients });
export const templatesQuery = queryOptions({ queryKey: qk.templates, queryFn: bank.fetchTemplates });
export const standingOrdersQuery = queryOptions({ queryKey: qk.standingOrders, queryFn: bank.fetchStandingOrders });
export const cardsQuery = queryOptions({ queryKey: qk.cards, queryFn: bank.fetchCards });
export const cardLimitsQuery = (id: string) =>
  queryOptions({ queryKey: qk.cardLimits(id), queryFn: () => bank.fetchCardLimits(id) });
export const notificationsQuery = queryOptions({ queryKey: qk.notifications, queryFn: bank.fetchNotifications });
export const settingsQuery = queryOptions({ queryKey: qk.settings, queryFn: bank.fetchSettings });
export const supportRequestsQuery = queryOptions({ queryKey: qk.support, queryFn: bank.fetchSupportRequests });
export const profileQuery = queryOptions({ queryKey: qk.profile, queryFn: bank.fetchProfile });

/** Refreshes everything a money movement can touch: balances, history, MaFin, notifications. */
export function useInvalidateMoney() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.accounts }),
      qc.invalidateQueries({ queryKey: qk.transactions }),
      qc.invalidateQueries({ queryKey: qk.notifications }),
      qc.invalidateQueries({ queryKey: qk.standingOrders }),
      qc.invalidateQueries({ queryKey: qk.cards }),
    ]);
}

/** Generic mutation helper that invalidates the given keys on success. */
export function useBankMutation<TVars, TResult = void>(
  fn: (vars: TVars) => Promise<TResult>,
  invalidate: readonly (readonly string[])[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all(invalidate.map((key) => qc.invalidateQueries({ queryKey: key })));
    },
  });
}
