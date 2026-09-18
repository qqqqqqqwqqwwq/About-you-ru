"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
}

export default function AddToCartButton({ product }: Props) {
  const { addItem } = useCart();
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [added, setAdded] = useState(false);

  if (!product.inStock) {
    return (
      <p className="rounded-lg bg-neutral-100 px-4 py-3 text-center text-sm text-neutral-600">
        Товар временно недоступен
      </p>
    );
  }

  function handleAdd() {
    if (!size) return;
    addItem(product.id, size, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">
          Размер
        </label>
        <div className="flex flex-wrap gap-2">
          {product.sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`min-w-11 rounded-md border px-3 py-2 text-sm font-medium transition ${
                size === s
                  ? "border-black bg-black text-white"
                  : "border-neutral-300 hover:border-neutral-500"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!size}
        className="w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
      >
        {added ? "Добавлено в корзину ✓" : "В корзину"}
      </button>
    </div>
  );
}
