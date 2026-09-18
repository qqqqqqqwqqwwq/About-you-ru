"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import ProductGrid from "./ProductGrid";
import { toRub } from "@/lib/pricing";

type SortKey = "price-asc" | "price-desc" | "brand-asc";

interface Props {
  products: Product[];
  eurRate: number;
}

export default function CatalogClient({ products, eurRate }: Props) {
  const [sort, setSort] = useState<SortKey>("price-asc");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [material, setMaterial] = useState("");
  const [minRub, setMinRub] = useState("");
  const [maxRub, setMaxRub] = useState("");

  const brands = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.brand))).sort((a, b) =>
        a.localeCompare(b, "ru")
      ),
    [products]
  );

  const sizes = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => p.sizes.forEach((x) => s.add(x)));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  }, [products]);

  const materials = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => {
      if (p.material) s.add(p.material);
      p.materials?.forEach((m) => s.add(m));
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "ru"));
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (brand) list = list.filter((p) => p.brand === brand);
    if (size) list = list.filter((p) => p.sizes.includes(size));
    if (material) {
      list = list.filter(
        (p) =>
          p.material === material ||
          p.materials?.includes(material)
      );
    }
    const min = minRub ? Number(minRub) : null;
    const max = maxRub ? Number(maxRub) : null;
    if (min != null && Number.isFinite(min)) {
      list = list.filter((p) => toRub(p.priceEur, eurRate) >= min);
    }
    if (max != null && Number.isFinite(max)) {
      list = list.filter((p) => toRub(p.priceEur, eurRate) <= max);
    }
    list.sort((a, b) => {
      if (sort === "brand-asc") return a.brand.localeCompare(b.brand, "ru");
      const pa = toRub(a.priceEur, eurRate);
      const pb = toRub(b.priceEur, eurRate);
      return sort === "price-desc" ? pb - pa : pa - pb;
    });
    return list;
  }, [products, brand, size, material, minRub, maxRub, sort, eurRate]);

  const selectCls =
    "rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-black";

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Сортировка
            <select
              className={selectCls}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="price-asc">Цена ↑</option>
              <option value="price-desc">Цена ↓</option>
              <option value="brand-asc">Бренд A–Z</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Бренд
            <select
              className={selectCls}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            >
              <option value="">Все</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Размер
            <select
              className={selectCls}
              value={size}
              onChange={(e) => setSize(e.target.value)}
            >
              <option value="">Все</option>
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {materials.length > 0 && (
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              Материал
              <select
                className={`${selectCls} max-w-[200px]`}
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              >
                <option value="">Все</option>
                {materials.map((m) => (
                  <option key={m} value={m}>
                    {m.length > 40 ? m.slice(0, 40) + "…" : m}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Цена от ₽
            <input
              type="number"
              inputMode="numeric"
              className={`${selectCls} w-28`}
              value={minRub}
              onChange={(e) => setMinRub(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Цена до ₽
            <input
              type="number"
              inputMode="numeric"
              className={`${selectCls} w-28`}
              value={maxRub}
              onChange={(e) => setMaxRub(e.target.value)}
              placeholder="∞"
            />
          </label>
        </div>
        <p className="text-xs text-neutral-500">
          Показано {filtered.length} из {products.length}
        </p>
      </div>
      <ProductGrid products={filtered} eurRate={eurRate} />
    </div>
  );
}
