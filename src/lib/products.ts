import productsData from "../../data/products.json";
import type { Category, Product } from "./types";

const products = productsData as Product[];

export function getAllProducts(): Product[] {
  return products;
}

export function getProductsByCategory(category: Category): Product[] {
  return products.filter((p) => p.category === category);
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
