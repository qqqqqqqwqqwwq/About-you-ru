import productsData from "../../data/products.json";
import type { Category, CategoryMeta, Product } from "./types";

type RawProduct = Omit<Product, "imageUrl" | "imageUrls" | "descriptionRu"> & {
  imageUrls?: string[];
  imageUrl?: string;
  descriptionRu?: string;
  categorySlug?: string;
  categoryNameRu?: string;
};

function normalize(raw: RawProduct): Product {
  const imageUrls =
    raw.imageUrls && raw.imageUrls.length > 0
      ? raw.imageUrls
      : raw.imageUrl
        ? [raw.imageUrl]
        : [];
  return {
    ...raw,
    categorySlug: raw.categorySlug ?? "other",
    categoryNameRu: raw.categoryNameRu ?? "Другое",
    descriptionRu: raw.descriptionRu ?? "",
    imageUrls,
    imageUrl: imageUrls[0] ?? "",
  };
}

const products = (productsData as RawProduct[]).map(normalize);

export function getAllProducts(): Product[] {
  return products;
}

export function getProductsByCategory(category: Category): Product[] {
  return products.filter((p) => p.category === category);
}

export function getProductsByCategorySlug(
  category: Category,
  slug: string
): Product[] {
  return products.filter(
    (p) => p.category === category && p.categorySlug === slug
  );
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

/** Subcategories present in catalog for a gender, stable order by name */
export function getSubcategories(category: Category): CategoryMeta[] {
  const map = new Map<string, string>();
  for (const p of products) {
    if (p.category !== category) continue;
    if (!map.has(p.categorySlug)) {
      map.set(p.categorySlug, p.categoryNameRu);
    }
  }
  return Array.from(map.entries())
    .map(([slug, nameRu]) => ({ slug, nameRu }))
    .sort((a, b) => a.nameRu.localeCompare(b.nameRu, "ru"));
}
