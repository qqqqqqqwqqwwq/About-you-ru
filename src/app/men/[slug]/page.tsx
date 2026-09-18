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
  return getSubcategories("men").map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: Props) {
  const sub = getSubcategories("men").find((c) => c.slug === params.slug);
  return {
    title: sub
      ? `${sub.nameRu} — Мужчинам — Распродажа`
      : "Мужчинам — Распродажа",
  };
}

export default async function MenCategoryPage({ params }: Props) {
  const subcategories = getSubcategories("men");
  const meta = subcategories.find((c) => c.slug === params.slug);
  if (!meta) notFound();

  const { rate } = await getEurRubRate();
  const products = getProductsByCategorySlug("men", params.slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Мужчинам — {meta.nameRu}</h1>
      <p className="mb-4 text-sm text-neutral-500">
        {products.length} товар(ов) · цены в ₽
      </p>
      <CategoryChips
        category="men"
        subcategories={subcategories}
        activeSlug={params.slug}
      />
      <CatalogClient products={products} eurRate={rate} />
    </div>
  );
}
