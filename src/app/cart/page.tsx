"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/cart";
import { getAllProducts } from "@/lib/products";
import { FALLBACK_EUR_RATE } from "@/lib/cbr";
import { formatRub, toRub } from "@/lib/pricing";
import ProductImage from "@/components/ProductImage";

const products = getAllProducts();

export default function CartPage() {
  const { items, ready, removeItem, setQty } = useCart();
  const [eurRate, setEurRate] = useState(FALLBACK_EUR_RATE);

  useEffect(() => {
    fetch("/api/rate")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.rate === "number") setEurRate(d.rate);
      })
      .catch(() => {});
  }, []);

  const lines = useMemo(() => {
    return items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const unitRub = toRub(product.priceEur, eurRate);
        return {
          ...item,
          product,
          unitRub,
          lineRub: unitRub * item.qty,
        };
      })
      .filter(Boolean) as Array<{
      productId: string;
      size: string;
      qty: number;
      product: (typeof products)[0];
      unitRub: number;
      lineRub: number;
    }>;
  }, [items, eurRate]);

  const totalRub = lines.reduce((s, l) => s + l.lineRub, 0);

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-neutral-500">
        Загрузка корзины…
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Корзина пуста</h1>
        <p className="mt-2 text-neutral-500">Добавьте товары из каталога</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/women"
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white"
          >
            Женщинам
          </Link>
          <Link
            href="/men"
            className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium"
          >
            Мужчинам
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Корзина</h1>

      <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
        {lines.map((line) => (
          <li
            key={`${line.productId}-${line.size}`}
            className="flex gap-3 p-4 sm:gap-4"
          >
            <div className="h-24 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100 sm:h-28 sm:w-20">
              <ProductImage
                src={line.product.imageUrl}
                alt={line.product.titleRu}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-xs text-neutral-500">{line.product.brand}</p>
              <Link
                href={`/product/${line.productId}`}
                className="truncate font-medium hover:underline"
              >
                {line.product.titleRu}
              </Link>
              <p className="text-sm text-neutral-600">Размер: {line.size}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Уменьшить"
                    className="flex h-8 w-8 items-center justify-center rounded border border-neutral-300 text-lg leading-none"
                    onClick={() =>
                      setQty(line.productId, line.size, line.qty - 1)
                    }
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium">
                    {line.qty}
                  </span>
                  <button
                    type="button"
                    aria-label="Увеличить"
                    className="flex h-8 w-8 items-center justify-center rounded border border-neutral-300 text-lg leading-none"
                    onClick={() =>
                      setQty(line.productId, line.size, line.qty + 1)
                    }
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    {formatRub(line.lineRub)}
                  </span>
                  <button
                    type="button"
                    className="text-sm text-red-600 hover:underline"
                    onClick={() => removeItem(line.productId, line.size)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-neutral-500">Итого</p>
          <p className="text-2xl font-bold">{formatRub(totalRub)}</p>
        </div>
        <Link
          href="/checkout"
          className="rounded-lg bg-black px-6 py-3 text-center text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Оформить заказ
        </Link>
      </div>
    </div>
  );
}
