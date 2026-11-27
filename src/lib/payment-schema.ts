import { z } from "zod";
import { isValidIban, normalizeIban } from "./iban";
import { PAYMENT_CATEGORIES } from "./categories";

export const MAX_PAYMENT_AMOUNT = 100000;

/** Parses "1 234,56" or "1234.56" into a number; returns NaN when malformed. */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}

const optionalDigits = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} môže mať najviac ${max} číslic`)
    .regex(/^\d*$/, `${label} môže obsahovať iba číslice`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const paymentFormSchema = z.object({
  accountId: z.string().uuid("Vyberte účet platiteľa"),
  recipientName: z
    .string()
    .trim()
    .min(1, "Zadajte názov príjemcu")
    .max(70, "Názov príjemcu môže mať najviac 70 znakov"),
  iban: z
    .string()
    .transform(normalizeIban)
    .refine((v) => v.length > 0, "Zadajte IBAN príjemcu")
    .refine((v) => v.length === 0 || isValidIban(v), "IBAN nie je platný"),
  amount: z
    .number({ invalid_type_error: "Zadajte platnú sumu" })
    .refine((v) => Number.isFinite(v), "Zadajte platnú sumu")
    .refine((v) => v > 0, "Suma musí byť väčšia ako 0")
    .refine((v) => v <= MAX_PAYMENT_AMOUNT, "Maximálna suma jednej platby je 100 000 EUR")
    .refine((v) => Math.round(v * 100) / 100 === v, "Suma môže mať najviac 2 desatinné miesta"),
  currency: z.literal("EUR"),
  executionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Zadajte dátum splatnosti"),
  variableSymbol: optionalDigits(10, "Variabilný symbol"),
  constantSymbol: optionalDigits(4, "Konštantný symbol"),
  specificSymbol: optionalDigits(10, "Špecifický symbol"),
  message: z
    .string()
    .trim()
    .max(140, "Správa pre príjemcu môže mať najviac 140 znakov")
    .optional()
    .transform((v) => (v ? v : undefined)),
  payerReference: z
    .string()
    .trim()
    .max(35, "Referencia platiteľa môže mať najviac 35 znakov")
    .optional()
    .transform((v) => (v ? v : undefined)),
  category: z.enum(PAYMENT_CATEGORIES as unknown as [string, ...string[]]).default("prevody"),
});

export type PaymentFormInput = z.input<typeof paymentFormSchema>;
export type PaymentForm = z.output<typeof paymentFormSchema>;

/** Payload sent to the server: the validated form plus an idempotency key. */
export const executePaymentSchema = paymentFormSchema.extend({
  idempotencyKey: z.string().uuid(),
});

export type ExecutePaymentInput = z.input<typeof executePaymentSchema>;

/** A payment can be executed now only when the date is today and funds cover it. */
export function checkSufficientFunds(balance: number, amount: number, executionDate: string, today: string): boolean {
  if (executionDate > today) return true;
  return balance >= amount;
}
