import Link from "next/link";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin-dashboard";
import { demoProducts } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";
import type { StoreOrder } from "@/lib/store-types";
import { isAdmin } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const demoOrders: StoreOrder[] = [
  { id: "demo-order-1", order_number: "DEMO-0042", customer_name: "Priya Sharma", phone: "919876543210", email: "priya@example.com", delivery_address: "Model Town, Patiala", note: "Please call before delivery", status: "pending", payment_status: "not_started", total: null, created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(), order_items: [{ product_name: "Golden Raisins (Kishmish)", pack_label: "250 g", quantity: 2 }, { product_name: "Walnut Kernels (Akhrot)", pack_label: "250 g", quantity: 1 }] },
  { id: "demo-order-2", order_number: "DEMO-0041", customer_name: "Aman Kaur", phone: "919812345678", email: "", delivery_address: "Urban Estate, Patiala", note: "Gift pack if available", status: "confirmed", payment_status: "not_started", total: null, created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), order_items: [{ product_name: "Dried Figs (Anjeer)", pack_label: "250 g", quantity: 1 }] },
];

export default async function AdminPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project"));
  if (configured && !(await isAdmin())) redirect("/admin/login");
  let products: Product[] = demoProducts, orders: StoreOrder[] = demoOrders;
  if (configured) {
    const supabase = createSupabaseAdminClient();
    if (supabase) {
      const [{ data: productRows }, { data: orderRows }] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(100),
      ]);
      if (productRows) products = productRows as unknown as Product[];
      if (orderRows) orders = orderRows as unknown as StoreOrder[];
    }
  }
  return <><header className="admin-topbar"><Link className="brand" href="/"><span className="brand-mark">K</span><span><b>KRP Dry Fruits</b><small>SHOP OWNER DASHBOARD</small></span></Link><div><span className="admin-online-dot"/> Store management <Link href="/" className="admin-view-link">View store ↗</Link></div></header><AdminDashboard products={products} orders={orders} demo={!configured}/></>;
}
