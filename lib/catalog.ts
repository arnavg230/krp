export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  image_url: string;
  price: number | null;
  pack_label: string;
  stock_quantity: number;
  is_active: boolean;
};

export const demoProducts: Product[] = [
  { id: "figs", slug: "dried-figs", name: "Dried Figs (Anjeer)", category: "Figs", description: "Soft, naturally sweet figs for your everyday table.", image_url: "/assets/dried-figs.png", price: null, pack_label: "250 g", stock_quantity: 18, is_active: true },
  { id: "walnuts", slug: "walnut-kernels", name: "Walnut Kernels (Akhrot)", category: "Walnuts", description: "Selected walnut kernels, ready for a little crunch.", image_url: "/assets/walnut-kernels.png", price: null, pack_label: "250 g", stock_quantity: 12, is_active: true },
  { id: "almonds-1", slug: "almonds-selection-one", name: "Almonds — Selection 1", category: "Almonds", description: "Our first almond selection. Ask about the variety and pack sizes.", image_url: "/assets/almonds-selection-1.png", price: null, pack_label: "250 g", stock_quantity: 20, is_active: true },
  { id: "almonds-2", slug: "almonds-selection-two", name: "Almonds — Selection 2", category: "Almonds", description: "Our second almond selection. Ask about the variety and pack sizes.", image_url: "/assets/almonds-selection-2.png", price: null, pack_label: "250 g", stock_quantity: 16, is_active: true },
  { id: "raisins", slug: "golden-raisins", name: "Golden Raisins (Kishmish)", category: "Raisins", description: "Golden raisins, lovely by the handful or in a recipe.", image_url: "/assets/golden-raisins.png", price: null, pack_label: "250 g", stock_quantity: 25, is_active: true },
];

export function formatPrice(price: number | null) {
  if (price === null || Number.isNaN(price)) return "Price on request";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);
}
