/**
 * RUB = priceEur × CBR EUR rate × 1.5, rounded to whole rubles.
 */
export function toRub(priceEur: number, eurRate: number): number {
  return Math.round(priceEur * eurRate * 1.5);
}

export function formatRub(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}
