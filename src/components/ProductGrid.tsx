import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

interface Props {
  products: Product[];
  eurRate: number;
  emptyText?: string;
}

export default function ProductGrid({
  products,
  eurRate,
  emptyText = "Товары не найдены",
}: Props) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-neutral-500">{emptyText}</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} eurRate={eurRate} />
      ))}
    </div>
  );
}
