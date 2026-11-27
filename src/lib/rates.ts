/** Indicative, fictional exchange rates (1 EUR = rate × currency). Not live market data. */
export const EXCHANGE_RATES = [
  { code: "CZK", country: "Česká republika", flag: "🇨🇿", buy: 24.467, sell: 25.712 },
  { code: "GBP", country: "Veľká Británia", flag: "🇬🇧", buy: 0.8377, sell: 0.8803 },
  { code: "USD", country: "USA", flag: "🇺🇸", buy: 1.0914, sell: 1.1468 },
  { code: "CHF", country: "Švajčiarsko", flag: "🇨🇭", buy: 0.9412, sell: 0.9891 },
  { code: "HUF", country: "Maďarsko", flag: "🇭🇺", buy: 389.12, sell: 408.9 },
  { code: "PLN", country: "Poľsko", flag: "🇵🇱", buy: 4.2671, sell: 4.4842 },
  { code: "JPY", country: "Japonsko", flag: "🇯🇵", buy: 163.21, sell: 171.51 },
] as const;

export function convertFromEur(amountEur: number, rate: number): number {
  return Math.round(amountEur * rate * 100) / 100;
}
