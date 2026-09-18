import Link from "next/link";
import { getAllProducts } from "@/lib/products";
import { getEurRubRate } from "@/lib/cbr";
import ProductGrid from "@/components/ProductGrid";

export default async function HomePage() {
  const { rate } = await getEurRubRate();
  const products = getAllProducts().filter((p) => p.inStock).slice(0, 8);

  return (
    <div>
      <section className="bg-neutral-900 px-4 py-14 text-center text-white sm:py-20">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
          SALE
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
          Распродажа
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-neutral-300 sm:text-base">
          Женская и мужская одежда. Цены в рублях. Без регистрации.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/women"
            className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black hover:bg-neutral-200"
          >
            Женщинам
          </Link>
          <Link
            href="/men"
            className="rounded-full border border-white/40 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            Мужчинам
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6">
          <h2 className="text-xl font-bold">Популярное</h2>
        </div>
        <ProductGrid products={products} eurRate={rate} />
      </section>
    </div>
  );
}
