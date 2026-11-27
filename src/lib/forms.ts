import { z } from "zod";
import { isValidIban, normalizeIban } from "./iban";
import { parseAmount } from "./payment-schema";

export const ibanField = z
  .string()
  .transform(normalizeIban)
  .refine((v) => v.length > 0, "Zadajte IBAN")
  .refine((v) => v.length === 0 || isValidIban(v), "IBAN nie je platný");

const digits = (max: number, label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d*$/, `${label} môže obsahovať iba číslice`)
    .max(max, `${label} môže mať najviac ${max} číslic`)
    .transform((v) => (v ? v : null));

export const recipientSchema = z.object({
  name: z.string().trim().min(1, "Zadajte názov príjemcu").max(70, "Najviac 70 znakov"),
  iban: ibanField,
  note: z
    .string()
    .trim()
    .max(140, "Najviac 140 znakov")
    .transform((v) => (v ? v : null)),
  is_favorite: z.boolean(),
});

const optionalAmount = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = parseAmount(v);
    if (!Number.isFinite(n) || n <= 0 || n > 100000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Zadajte platnú sumu (0,01 – 100 000)" });
      return z.NEVER;
    }
    return n;
  });

const requiredAmount = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = parseAmount(v);
    if (!v || !Number.isFinite(n) || n <= 0 || n > 100000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Zadajte platnú sumu (0,01 – 100 000)" });
      return z.NEVER;
    }
    return n;
  });

export const templateSchema = z.object({
  name: z.string().trim().min(1, "Zadajte názov šablóny").max(60, "Najviac 60 znakov"),
  recipient_name: z.string().trim().min(1, "Zadajte názov príjemcu").max(70, "Najviac 70 znakov"),
  iban: ibanField,
  amount: optionalAmount,
  variable_symbol: digits(10, "VS"),
  specific_symbol: digits(10, "ŠS"),
  constant_symbol: digits(4, "KS"),
  message: z
    .string()
    .trim()
    .max(140, "Najviac 140 znakov")
    .transform((v) => (v ? v : null)),
});

export const FREQUENCIES = [
  { value: "weekly", label: "Týždenne" },
  { value: "monthly", label: "Mesačne" },
  { value: "quarterly", label: "Štvrťročne" },
  { value: "yearly", label: "Ročne" },
] as const;

export const standingOrderSchema = z
  .object({
    account_id: z.string().uuid("Vyberte účet"),
    name: z.string().trim().min(1, "Zadajte názov príkazu").max(60, "Najviac 60 znakov"),
    recipient_name: z.string().trim().min(1, "Zadajte názov príjemcu").max(70, "Najviac 70 znakov"),
    iban: ibanField,
    amount: requiredAmount,
    frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
    next_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Zadajte dátum prvej platby"),
    end_date: z
      .string()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Neplatný dátum"),
    variable_symbol: digits(10, "VS"),
    specific_symbol: digits(10, "ŠS"),
    constant_symbol: digits(4, "KS"),
    message: z
      .string()
      .trim()
      .max(140, "Najviac 140 znakov")
      .transform((v) => (v ? v : null)),
  })
  .refine((v) => v.end_date === null || v.end_date >= v.next_date, {
    message: "Dátum ukončenia musí byť po prvej platbe",
    path: ["end_date"],
  });

export function zodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
