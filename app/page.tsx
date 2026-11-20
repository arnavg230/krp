import Storefront from "@/components/storefront";
import { demoProducts, type Product } from "@/lib/catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  let products: Product[] = demoProducts;
  let catalogReady = false;
  let reviewRows: Array<{ product_id: string; rating: number }> = [];
  if (supabase) {
    const [{ data: rows, error: productError }, { data: reviews }] = await Promise.all([
      supabase.from("products").select("id,slug,name,category,description,image_url,price,pack_label,stock_quantity,is_active").eq("is_active", true).order("created_at"),
      supabase.from("reviews").select("product_id,rating"),
    ]);
    if (!productError && rows?.length) { products = rows as Product[]; catalogReady = true; }
    if (reviews) reviewRows = reviews as typeof reviewRows;
  }
  const summaries = Object.fromEntries(products.map((product) => {
    const ratings = reviewRows.filter((review) => review.product_id === product.id).map((review) => review.rating);
    return [product.id, { count: ratings.length, average: ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0 }];
  }));
  const demo = !supabase || !catalogReady;
  return <Storefront products={products} reviewSummaries={summaries} demo={demo} />;
}
