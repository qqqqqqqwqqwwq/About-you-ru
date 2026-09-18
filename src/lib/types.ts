export type Category = "women" | "men";

export interface Product {
  id: string;
  titleRu: string;
  brand: string;
  category: Category;
  /** Current / sale price in EUR */
  priceEur: number;
  /** Original price in EUR before discount (optional) */
  priceEurWas?: number;
  sizes: string[];
  /** All product photos; first is primary */
  imageUrls: string[];
  /** First image — kept for backward compatibility with cards/cart */
  imageUrl: string;
  inStock: boolean;
}

export interface CartItem {
  productId: string;
  size: string;
  qty: number;
}

export interface OrderPayload {
  name: string;
  phone: string;
  email: string;
  address: string;
  comment?: string;
  items: Array<{
    productId: string;
    titleRu: string;
    brand: string;
    size: string;
    qty: number;
    priceEur: number;
    priceRub: number;
  }>;
  totalRub: number;
  eurRate: number;
}
