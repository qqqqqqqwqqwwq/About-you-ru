import productsData from "../../data/products.json";
import type { Category, Product } from "./types";

type RawProduct = Omit<Product, "imageUrl" | "imageUrls"> & {
  imageUrls?: string[];
  imageUrl?: string;
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

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
