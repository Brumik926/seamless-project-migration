import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { executePaymentSchema } from "./payment-schema";
import { bankErrorMessage } from "./errors";

export type ExecutePaymentResult =
  | { ok: true; transactionId: string; status: string; duplicate: boolean; balance: number | null }
  | { ok: false; error: string };

/**
 * Executes a simulated transfer. Validation runs here and again inside the
 * `execute_payment` database function, which locks the payer account, checks
 * funds and writes the balance + transaction atomically. The idempotency key
 * makes a repeated submit return the original transaction instead of paying twice.
 * Nothing is ever sent to a real banking system.
 */
export const executePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => executePaymentSchema.parse(data))
  .handler(async ({ data, context }): Promise<ExecutePaymentResult> => {
    const args: {
      p_account_id: string;
      p_recipient_name: string;
      p_iban: string;
      p_amount: number;
      p_execution_date: string;
      p_idempotency_key: string;
      p_category: string;
      p_variable_symbol?: string;
      p_constant_symbol?: string;
      p_specific_symbol?: string;
      p_message?: string;
      p_payer_reference?: string;
    } = {
      p_account_id: data.accountId,
      p_recipient_name: data.recipientName,
      p_iban: data.iban,
      p_amount: data.amount,
      p_execution_date: data.executionDate,
      p_idempotency_key: data.idempotencyKey,
      p_category: data.category,
    };
    if (data.variableSymbol) args.p_variable_symbol = data.variableSymbol;
    if (data.constantSymbol) args.p_constant_symbol = data.constantSymbol;
    if (data.specificSymbol) args.p_specific_symbol = data.specificSymbol;
    if (data.message) args.p_message = data.message;
    if (data.payerReference) args.p_payer_reference = data.payerReference;

    const { data: result, error } = await context.supabase.rpc("execute_payment", args);
    if (error) {
      console.error("execute_payment failed", error.code, error.message);
      return { ok: false, error: bankErrorMessage(error) };
    }
    const r = (result ?? {}) as {
      transaction_id?: string;
      status?: string;
      duplicate?: boolean;
      balance?: number | null;
    };
    if (!r.transaction_id) return { ok: false, error: "Platbu sa nepodarilo vykonať." };
    return {
      ok: true,
      transactionId: r.transaction_id,
      status: r.status ?? "completed",
      duplicate: Boolean(r.duplicate),
      balance: r.balance ?? null,
    };
  });
