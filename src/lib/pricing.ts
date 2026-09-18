/**
 * RUB = priceEur × CBR EUR rate × 2.0, rounded to whole rubles.
 * Customer UI must show only ₽ — never the formula, EUR, or rate.
 */
export const PRICE_MULTIPLIER = 2.0;

/** Flat delivery fee in RUB */
export const DELIVERY_RUB = 2990;

export function toRub(priceEur: number, eurRate: number): number {
  return Math.round(priceEur * eurRate * PRICE_MULTIPLIER);
}

export function formatRub(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}
