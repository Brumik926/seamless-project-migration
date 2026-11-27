/**
 * Data access layer. Every read/write goes through the browser client and is
 * scoped to the signed-in user by Row Level Security; money movements go
 * through the `executePayment` server function only.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Account = Tables<"accounts">;
export type Transaction = Tables<"transactions">;
export type Recipient = Tables<"recipients">;
export type PaymentTemplate = Tables<"payment_templates">;
export type StandingOrder = Tables<"standing_orders">;
export type Card = Tables<"cards">;
export type CardLimits = Tables<"card_limits">;
export type Notification = Tables<"notifications">;
export type UserSettings = Tables<"user_settings">;
export type Profile = Tables<"profiles">;

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null) throw new Error("NOT_FOUND");
  return res.data;
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("NOT_AUTHENTICATED");
  return id;
}

// ---------- Reads ----------
export async function fetchAccounts(): Promise<Account[]> {
  return unwrap(await supabase.from("accounts").select("*").order("is_primary", { ascending: false }).order("created_at"));
}

export async function fetchTransactions(): Promise<Transaction[]> {
  return unwrap(
    await supabase
      .from("transactions")
      .select("*")
      .order("booked_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000),
  );
}

export async function fetchTransaction(id: string): Promise<Transaction> {
  return unwrap(await supabase.from("transactions").select("*").eq("id", id).maybeSingle());
}

export async function fetchRecipients(): Promise<Recipient[]> {
  return unwrap(await supabase.from("recipients").select("*").order("name"));
}

export async function fetchTemplates(): Promise<PaymentTemplate[]> {
  return unwrap(await supabase.from("payment_templates").select("*").order("name"));
}

export async function fetchStandingOrders(): Promise<StandingOrder[]> {
  return unwrap(await supabase.from("standing_orders").select("*").order("next_date"));
}

export async function fetchCards(): Promise<Card[]> {
  return unwrap(await supabase.from("cards").select("*").order("created_at"));
}

export async function fetchCardLimits(cardId: string): Promise<CardLimits> {
  return unwrap(await supabase.from("card_limits").select("*").eq("card_id", cardId).maybeSingle());
}

export async function fetchNotifications(): Promise<Notification[]> {
  return unwrap(await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(200));
}

export async function fetchSettings(): Promise<UserSettings> {
  return unwrap(await supabase.from("user_settings").select("*").maybeSingle());
}

export async function fetchProfile(): Promise<Profile> {
  return unwrap(await supabase.from("profiles").select("*").maybeSingle());
}

// ---------- Writes ----------
export async function processDueItems(): Promise<number> {
  const { data, error } = await supabase.rpc("process_due_items");
  if (error) throw new Error(error.message);
  return data ?? 0;
}

export async function cancelScheduledPayment(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("cancel_scheduled_payment", { p_tx_id: id });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function updateTransactionCategory(id: string, category: string): Promise<void> {
  const { error } = await supabase.from("transactions").update({ category }).eq("id", id);
  if (error) throw new Error(error.message);
}

export type RecipientInput = Pick<TablesInsert<"recipients">, "name" | "iban"> & {
  note?: string | null;
  is_favorite?: boolean;
};

export async function createRecipient(input: RecipientInput): Promise<Recipient> {
  const user_id = await requireUserId();
  return unwrap(await supabase.from("recipients").insert({ ...input, user_id }).select("*").single());
}

export async function updateRecipient(id: string, patch: TablesUpdate<"recipients">): Promise<void> {
  const { error } = await supabase.from("recipients").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRecipient(id: string): Promise<void> {
  const { error } = await supabase.from("recipients").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type TemplateInput = Omit<TablesInsert<"payment_templates">, "id" | "user_id" | "created_at">;

export async function createTemplate(input: TemplateInput): Promise<PaymentTemplate> {
  const user_id = await requireUserId();
  return unwrap(await supabase.from("payment_templates").insert({ ...input, user_id }).select("*").single());
}

export async function updateTemplate(id: string, patch: TablesUpdate<"payment_templates">): Promise<void> {
  const { error } = await supabase.from("payment_templates").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("payment_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type StandingOrderInput = Omit<
  TablesInsert<"standing_orders">,
  "id" | "user_id" | "created_at" | "last_executed_at"
>;

export async function createStandingOrder(input: StandingOrderInput): Promise<StandingOrder> {
  const user_id = await requireUserId();
  return unwrap(await supabase.from("standing_orders").insert({ ...input, user_id }).select("*").single());
}

export async function updateStandingOrder(id: string, patch: TablesUpdate<"standing_orders">): Promise<void> {
  const { error } = await supabase.from("standing_orders").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteStandingOrder(id: string): Promise<void> {
  const { error } = await supabase.from("standing_orders").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateCard(
  id: string,
  patch: Pick<TablesUpdate<"cards">, "name" | "status" | "internet_payments" | "contactless">,
): Promise<void> {
  const { error } = await supabase.from("cards").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateCardLimits(
  cardId: string,
  patch: Pick<TablesUpdate<"card_limits">, "atm_daily" | "pos_daily" | "internet_daily">,
): Promise<void> {
  const { error } = await supabase.from("card_limits").update(patch).eq("card_id", cardId);
  if (error) throw new Error(error.message);
}

export async function markNotificationRead(id: string, isRead = true): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: isRead }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  if (error) throw new Error(error.message);
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type SettingsPatch = Omit<TablesUpdate<"user_settings">, "user_id" | "updated_at">;

export async function updateSettings(patch: SettingsPatch): Promise<void> {
  const user_id = await requireUserId();
  const { error } = await supabase.from("user_settings").update(patch).eq("user_id", user_id);
  if (error) throw new Error(error.message);
}

export type ProfilePatch = Pick<
  TablesUpdate<"profiles">,
  "full_name" | "phone" | "street" | "city" | "zip" | "birth_date"
>;

export async function updateProfile(patch: ProfilePatch): Promise<void> {
  const id = await requireUserId();
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export type SupportRequest = Tables<"support_requests">;

export async function fetchSupportRequests(): Promise<SupportRequest[]> {
  return unwrap(await supabase.from("support_requests").select("*").order("created_at", { ascending: false }));
}

export async function createSupportRequest(
  input: Pick<TablesInsert<"support_requests">, "kind" | "phone" | "preferred_at" | "topic"> & { note?: string | null },
): Promise<void> {
  const user_id = await requireUserId();
  const { error } = await supabase.from("support_requests").insert({ ...input, user_id });
  if (error) throw new Error(error.message);
}

export async function cancelSupportRequest(id: string): Promise<void> {
  const { error } = await supabase.from("support_requests").update({ status: "cancelled" }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function renameAccount(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("accounts").update({ name }).eq("id", id);
  if (error) throw new Error(error.message);
}
