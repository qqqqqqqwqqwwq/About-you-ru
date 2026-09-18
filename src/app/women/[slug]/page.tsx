import { notFound } from "next/navigation";
import {
  getProductsByCategorySlug,
  getSubcategories,
} from "@/lib/products";
import { getEurRubRate } from "@/lib/cbr";
import CategoryChips from "@/components/CategoryChips";
import CatalogClient from "@/components/CatalogClient";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getSubcategories("women").map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: Props) {
  const sub = getSubcategories("women").find((c) => c.slug === params.slug);
  return {
    title: sub
      ? `${sub.nameRu} — Женщинам — Распродажа`
      : "Женщинам — Распродажа",
  };
}

export default async function WomenCategoryPage({ params }: Props) {
  const subcategories = getSubcategories("women");
  const meta = subcategories.find((c) => c.slug === params.slug);
  if (!meta) notFound();

  const { rate } = await getEurRubRate();
  const products = getProductsByCategorySlug("women", params.slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Женщинам — {meta.nameRu}</h1>
      <p className="mb-4 text-sm text-neutral-500">
        {products.length} товар(ов) · цены в ₽
      </p>
      <CategoryChips
        category="women"
        subcategories={subcategories}
        activeSlug={params.slug}
      />
      <CatalogClient products={products} eurRate={rate} />
    </div>
  );
}
