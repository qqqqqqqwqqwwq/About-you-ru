import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllProducts, getProductById } from "@/lib/products";
import { getEurRubRate } from "@/lib/cbr";
import { formatRub, toRub } from "@/lib/pricing";
import ProductImage from "@/components/ProductImage";
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
  const rub = toRub(product.priceEur, rate);
  const catLabel = product.category === "women" ? "Женщинам" : "Мужчинам";
  const catHref = product.category === "women" ? "/women" : "/men";

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
        <span className="text-neutral-800">{product.titleRu}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-[3/4] overflow-hidden rounded-xl bg-neutral-100">
          <ProductImage
            src={product.imageUrl}
            alt={product.titleRu}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col">
          <p className="text-sm uppercase tracking-wide text-neutral-500">
            {product.brand}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {product.titleRu}
          </h1>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-semibold">{formatRub(rub)}</span>
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              SALE
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            ≈ €{product.priceEur.toFixed(2)} · курс {rate.toFixed(2)} × 1,5
          </p>

          <div className="mt-8">
            <AddToCartButton product={product} />
          </div>

          <ul className="mt-8 space-y-2 border-t border-neutral-200 pt-6 text-sm text-neutral-600">
            <li>• Доставка по России (условия уточняются при заказе)</li>
            <li>• Оплата после подтверждения менеджером</li>
            <li>• Без регистрации и скидочных аккаунтов</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
