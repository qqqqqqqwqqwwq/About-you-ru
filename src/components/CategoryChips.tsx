import Link from "next/link";
import type { Category, CategoryMeta } from "@/lib/types";

interface Props {
  category: Category;
  subcategories: CategoryMeta[];
  activeSlug?: string;
}

export default function CategoryChips({
  category,
  subcategories,
  activeSlug,
}: Props) {
  const base = category === "women" ? "/women" : "/men";

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <Link
        href={base}
        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
          !activeSlug
            ? "bg-black text-white"
            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
        }`}
      >
        Все
      </Link>
      {subcategories.map((c) => (
        <Link
          key={c.slug}
          href={`${base}/${c.slug}`}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            activeSlug === c.slug
              ? "bg-black text-white"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          }`}
        >
          {c.nameRu}
        </Link>
      ))}
    </div>
  );
}
