import { getProductsByCategory } from "@/lib/products";
import { getEurRubRate } from "@/lib/cbr";
import ProductGrid from "@/components/ProductGrid";

export const metadata = {
  title: "Мужчинам — Распродажа",
};

export default async function MenPage() {
  const { rate } = await getEurRubRate();
  const products = getProductsByCategory("men");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Мужчинам</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {products.length} товар(ов) · цены в ₽
      </p>
      <ProductGrid products={products} eurRate={rate} />
    </div>
  );
}
