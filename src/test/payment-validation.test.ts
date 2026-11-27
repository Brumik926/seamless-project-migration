import { describe, it, expect } from "vitest";
import { isValidIban, normalizeIban, formatIban } from "@/lib/iban";
import { parseAmount, paymentFormSchema, checkSufficientFunds } from "@/lib/payment-schema";

describe("Platby a IBAN validácia (Etapa 3)", () => {
  it("správne normalizuje a formátuje IBAN", () => {
    const raw = "sk31 1100 0000 0026 1234 5678";
    const normalized = normalizeIban(raw);
    expect(normalized).toBe("SK3111000000002612345678");
    expect(formatIban(normalized)).toBe("SK31 1100 0000 0026 1234 5678");
  });

  it("správne overuje platný kontrolný súčet IBAN modulo 97", () => {
    // Platný fiktívny IBAN s kontrolnou cifrou 24 (SK24 1100 0000 0026 1234 5678)
    expect(isValidIban("SK2411000000002612345678")).toBe(true);
    // Neplatný kontrolný súčet
    expect(isValidIban("SK0011000000002612345678")).toBe(false);
    // Príliš krátky alebo s neplatnou dĺžkou pre SK
    expect(isValidIban("SK241100")).toBe(false);
  });

  it("správne parsuje sumu v rôznych slovenských formátoch", () => {
    expect(parseAmount("1 234,56")).toBe(1234.56);
    expect(parseAmount("50,00")).toBe(50);
    expect(parseAmount("15.5")).toBe(15.5);
    expect(Number.isNaN(parseAmount("abc"))).toBe(true);
    expect(Number.isNaN(parseAmount("-20"))).toBe(true);
  });

  it("validuje kompletný formulár platby", () => {
    const valid = {
      accountId: "11111111-1111-1111-1111-111111111111",
      recipientName: "Ján Novák",
      iban: "SK24 1100 0000 0026 1234 5678",
      amount: 150.25,
      currency: "EUR",
      executionDate: "2026-11-22",
      variableSymbol: "123456",
      constantSymbol: "0308",
      specificSymbol: "",
      message: "Platba za faktúru",
      category: "prevody",
    };
    const parsed = paymentFormSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("odmietne neplatný symbol alebo zápornú sumu", () => {
    const invalid = {
      accountId: "11111111-1111-1111-1111-111111111111",
      recipientName: "Ján Novák",
      iban: "SK3111000000002612345678",
      amount: -10,
      currency: "EUR",
      executionDate: "2026-11-22",
      variableSymbol: "1234567890123", // viac ako 10 číslic
    };
    const parsed = paymentFormSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("správne overí dostatočný zostatok účtu", () => {
    expect(checkSufficientFunds(500, 200, "2026-11-24", "2026-11-24")).toBe(true);
    expect(checkSufficientFunds(50, 100, "2026-11-24", "2026-11-24")).toBe(false);
    expect(checkSufficientFunds(50, 100, "2026-11-30", "2026-11-24")).toBe(true);
  });
});
