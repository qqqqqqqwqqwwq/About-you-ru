import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatRub, toRub } from "@/lib/pricing";
import ProductImage from "./ProductImage";

interface Props {
  product: Product;
  eurRate: number;
}

export default function ProductCard({ product, eurRate }: Props) {
  const rub = toRub(product.priceEur, eurRate);

  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
        <ProductImage
          src={product.imageUrl}
          alt={product.titleRu}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        {!product.inStock && (
          <span className="absolute left-2 top-2 rounded bg-neutral-800/80 px-2 py-0.5 text-xs text-white">
            Нет в наличии
          </span>
        )}
        <span className="absolute right-2 top-2 rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
          SALE
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          {product.brand}
        </p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-neutral-900">
          {product.titleRu}
        </h3>
        <p className="mt-auto pt-2 text-base font-semibold">{formatRub(rub)}</p>
      </div>
    </Link>
  );
}
