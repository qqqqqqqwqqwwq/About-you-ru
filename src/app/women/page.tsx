import {
  getProductsByCategory,
  getProductsByCategorySlug,
  getSubcategories,
} from "@/lib/products";
import { getEurRubRate } from "@/lib/cbr";
import CategoryChips from "@/components/CategoryChips";
import CatalogClient from "@/components/CatalogClient";

export const metadata = {
  title: "Женщинам — Распродажа",
};

interface Props {
  searchParams?: { cat?: string };
}

export default async function WomenPage({ searchParams }: Props) {
  const { rate } = await getEurRubRate();
  const slug = searchParams?.cat?.trim() || undefined;
  const products = slug
    ? getProductsByCategorySlug("women", slug)
    : getProductsByCategory("women");
  const subcategories = getSubcategories("women");
  const activeName = slug
    ? subcategories.find((c) => c.slug === slug)?.nameRu
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">
        Женщинам{activeName ? ` — ${activeName}` : ""}
      </h1>
      <p className="mb-4 text-sm text-neutral-500">
        {products.length} товар(ов) · цены в ₽
      </p>
      <CategoryChips
        category="women"
        subcategories={subcategories}
        activeSlug={slug}
      />
      <CatalogClient products={products} eurRate={rate} />
    </div>
  );
}
