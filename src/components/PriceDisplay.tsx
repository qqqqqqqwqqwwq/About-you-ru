import { formatRub, toRub } from "@/lib/pricing";

interface Props {
  priceEur: number;
  priceEurWas?: number;
  eurRate: number;
  /** larger typography on product page */
  size?: "sm" | "lg";
}

export default function PriceDisplay({
  priceEur,
  priceEurWas,
  eurRate,
  size = "sm",
}: Props) {
  const rub = toRub(priceEur, eurRate);
  const hasWas =
    typeof priceEurWas === "number" &&
    priceEurWas > priceEur;

  const saleClass =
    size === "lg"
      ? "text-2xl font-bold"
      : "text-base font-semibold";
  const wasClass =
    size === "lg"
      ? "text-base text-neutral-400 line-through"
      : "text-sm text-neutral-400 line-through";

  if (!hasWas) {
    return <span className={saleClass}>{formatRub(rub)}</span>;
  }

  const wasRub = toRub(priceEurWas!, eurRate);
  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <span className={wasClass}>{formatRub(wasRub)}</span>
      <span className={saleClass}>{formatRub(rub)}</span>
    </span>
  );
}
