import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllProducts, getProductById } from "@/lib/products";
import { getEurRubRate } from "@/lib/cbr";
import { DELIVERY_RUB, formatRub } from "@/lib/pricing";
import ProductGallery from "@/components/ProductGallery";
import PriceDisplay from "@/components/PriceDisplay";
import AddToCartButton from "@/components/AddToCartButton";

interface Props {
  params: { id: string };
}

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ id: p.id }));
}

export function generateMetadata({ params }: Props) {
  const product = getProductById(params.id);
  if (!product) return { title: "Товар не найден" };
  return { title: `${product.titleRu} — Распродажа` };
}

export default async function ProductPage({ params }: Props) {
  const product = getProductById(params.id);
  if (!product) notFound();

  const { rate } = await getEurRubRate();
  const catLabel = product.category === "women" ? "Женщинам" : "Мужчинам";
  const catHref = product.category === "women" ? "/women" : "/men";
  const subHref = `${catHref}/${product.categorySlug}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">
          Главная
        </Link>
        <span className="mx-2">/</span>
        <Link href={catHref} className="hover:text-black">
          {catLabel}
        </Link>
        <span className="mx-2">/</span>
        <Link href={subHref} className="hover:text-black">
          {product.categoryNameRu}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-800">{product.titleRu}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.imageUrls} alt={product.titleRu} />

        <div className="flex flex-col">
          <p className="text-sm uppercase tracking-wide text-neutral-500">
            {product.brand}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {product.titleRu}
          </h1>
          <div className="mt-4 flex items-baseline gap-3">
            <PriceDisplay
              priceEur={product.priceEur}
              priceEurWas={product.priceEurWas}
              eurRate={rate}
              size="lg"
            />
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              SALE
            </span>
          </div>

          {product.material && (
            <p className="mt-3 text-sm text-neutral-600">
              <span className="font-medium text-neutral-800">Материал:</span>{" "}
              {product.material}
            </p>
          )}

          <div className="mt-8">
            <AddToCartButton product={product} />
          </div>

          {product.descriptionRu && (
            <div className="mt-8 border-t border-neutral-200 pt-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Описание
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                {product.descriptionRu}
              </p>
            </div>
          )}

          <ul className="mt-8 space-y-2 border-t border-neutral-200 pt-6 text-sm text-neutral-600">
            <li>• Доставка: {formatRub(DELIVERY_RUB)} (фиксированная)</li>
            <li>• Оплата после подтверждения менеджером</li>
            <li>• Без регистрации</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
