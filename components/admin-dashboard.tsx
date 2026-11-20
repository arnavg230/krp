"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/catalog";
import type { StoreOrder } from "@/lib/store-types";

type Order = StoreOrder;
type Draft = Omit<Product, "id" | "slug"> & { id?: string; slug?: string; price: number | null };
const statuses = ["pending", "confirmed", "packed", "dispatched", "delivered", "cancelled"];
const blank: Draft = { name: "", category: "", description: "", image_url: "/assets/", price: null, pack_label: "250 g", stock_quantity: 0, is_active: true };
const priceText = (price: number | null) => price == null ? "On enquiry" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);

export default function AdminDashboard({ products: initialProducts, orders: initialOrders, demo }: { products: Product[]; orders: Order[]; demo: boolean }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState("pending");
  const [draft, setDraft] = useState<Draft>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  // Read browser-only preview records after hydration to avoid a server/client mismatch.
  useEffect(() => {
    if (!demo) return;
    try {
      const localOrders = JSON.parse(localStorage.getItem("krp-demo-orders") || "[]") as Order[];
      const localProducts = JSON.parse(localStorage.getItem("krp-demo-products") || "null") as Product[] | null;
      if (localOrders.length) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOrders((current) => [...localOrders, ...current]);
      }
      if (localProducts) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProducts(localProducts);
      }
    } catch { /* Keep the sample data if browser storage is not available. */ }
  }, [demo]);

  const pendingCount = orders.filter((order) => order.status === "pending").length;
  const confirmedCount = orders.filter((order) => ["confirmed", "packed", "dispatched"].includes(order.status)).length;
  const lowStockCount = products.filter((product) => product.stock_quantity <= 5).length;
  const filteredOrders = useMemo(() => filter === "all" ? orders : orders.filter((order) => order.status === filter), [orders, filter]);

  async function saveOrderStatus(order: Order, status: string) {
    setMessage("");
    if (demo) { const next = orders.map((item) => item.id === order.id ? { ...item, status } : item); setOrders(next); localStorage.setItem("krp-demo-orders", JSON.stringify(next.filter((item) => item.id.startsWith("DEMO-NEW")))); return; }
    const response = await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.id, status }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not update order."); return; }
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
  }

  function startEdit(product: Product) { setEditing(product.id); setDraft({ ...product }); setShowProductForm(true); }
  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const values = { ...draft, price: draft.price === null || Number.isNaN(Number(draft.price)) ? null : Number(draft.price), stock_quantity: Number(draft.stock_quantity) };
    if (demo) {
      const next = editing ? products.map((product) => product.id === editing ? { ...product, ...values } : product) : [...products, { ...values, id: `demo-${Date.now()}`, slug: values.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") } as Product];
      setProducts(next); localStorage.setItem("krp-demo-products", JSON.stringify(next)); setMessage(photo ? "Product saved in this preview. Photo uploads need Supabase." : "Saved in this browser’s preview only."); setShowProductForm(false); setEditing(null); setDraft(blank); setPhoto(null); setSaving(false); return;
    }
    const form = new FormData();
    Object.entries({ ...values, id: editing || "" }).forEach(([key, value]) => form.set(key, value === null ? "" : String(value)));
    if (photo) form.set("photo", photo);
    const response = await fetch("/api/admin/products", { method: editing ? "PATCH" : "POST", body: form });
    const result = await response.json();
    if (!response.ok) setMessage(result.error || "Could not save product.");
    else {
      if (editing) setProducts((current) => current.map((product) => product.id === editing ? result.product : product));
      else setProducts((current) => [result.product, ...current]);
      setMessage(editing ? "Product updated." : "Product added."); setShowProductForm(false); setEditing(null); setDraft(blank); setPhoto(null);
    }
    setSaving(false);
  }

  async function logout() {
    if (demo) { router.push("/"); return; }
    await fetch("/api/admin/auth", { method: "POST" }); router.push("/admin/login"); router.refresh();
  }

  return <main className="admin-shell">
    <div className="admin-welcome"><div><span className="eyebrow">YOUR SHOP, AT A GLANCE</span><h1>Good morning, <em>Mom.</em></h1><p>Here’s what’s happening with KRP today.</p></div><button className="admin-signout" onClick={logout}>Sign out ↗</button></div>
    {demo && <div className="demo-admin-notice"><b>PREVIEW MODE</b><span>These sample orders and product edits are saved only in this browser. Connect Supabase before using this for real customers.</span></div>}
    <section className="admin-stats"><article><span>Needs attention</span><b>{pendingCount}</b><small>pending orders</small></article><article><span>In progress</span><b>{confirmedCount}</b><small>confirmed to deliver</small></article><article><span>Keep an eye on</span><b>{lowStockCount}</b><small>low stock items</small></article><article><span>In the pantry</span><b>{products.length}</b><small>products listed</small></article></section>

    <section className="admin-panel"><div className="admin-panel-head"><div><span className="eyebrow">CUSTOMER ENQUIRIES</span><h2>Orders</h2></div><div className="order-filter">{["pending", "confirmed", "packed", "dispatched", "delivered", "all"].map((status) => <button className={filter === status ? "active" : ""} key={status} onClick={() => setFilter(status)}>{status === "all" ? "All orders" : status}</button>)}</div></div>
      {message && <p className="admin-message" role="status">{message}</p>}
      {filteredOrders.length ? <div className="orders-list">{filteredOrders.map((order) => <article className="order-card" key={order.id}><div className="order-card-top"><div><span className="order-id">{order.order_number}</span><time>{new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time></div><label className={`status-pill status-${order.status}`}><span className="sr-only">Order status</span><select aria-label={`Update status for ${order.order_number}`} value={order.status} onChange={(event) => saveOrderStatus(order, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label></div><div className="order-card-body"><div className="customer-block"><b>{order.customer_name}</b><a href={`tel:${order.phone}`}>{order.phone}</a>{order.email && <a href={`mailto:${order.email}`}>{order.email}</a>}<p>{order.delivery_address}</p>{order.note && <small>Note: {order.note}</small>}</div><div className="ordered-items"><b>Selection</b>{order.order_items?.map((item, index) => <span key={index}>{item.product_name} · {item.pack_label} <strong>× {item.quantity}</strong></span>)}<small>{priceText(order.total)}</small></div></div></article>)}</div> : <div className="admin-empty"><span>✳</span><b>No {filter === "all" ? "" : filter} orders right now.</b><p>New customer enquiries will appear here.</p></div>}
    </section>

    <section className="admin-panel products-admin"><div className="admin-panel-head"><div><span className="eyebrow">YOUR CATALOG</span><h2>Products</h2></div><button className="admin-add-button" onClick={() => { setDraft(blank); setEditing(null); setShowProductForm((open) => !open); }}>{showProductForm ? "Close" : "+ Add product"}</button></div>
      <p className="admin-panel-subtitle">Change a price, adjust stock, or hide an item from the shop.</p>
      {showProductForm && <form className="product-edit-form" onSubmit={saveProduct}><h3>{editing ? "Edit product" : "Add a product"}</h3><div className="product-form-grid"><label>Product name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label><label>Category<input required value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}/></label><label>Pack size<input required value={draft.pack_label} onChange={(event) => setDraft({ ...draft, pack_label: event.target.value })}/></label><label>Price in rupees<input type="number" min="0" step="1" placeholder="Leave blank for price on request" value={draft.price ?? ""} onChange={(event) => setDraft({ ...draft, price: event.target.value === "" ? null : Number(event.target.value) })}/></label><label>Stock quantity<input type="number" min="0" step="1" required value={draft.stock_quantity} onChange={(event) => setDraft({ ...draft, stock_quantity: Number(event.target.value) })}/></label><label>Photo path or URL<input required value={draft.image_url} onChange={(event) => setDraft({ ...draft, image_url: event.target.value })}/></label><label className="wide-field">Upload photo (JPG, PNG, WebP; up to 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)}/></label><label className="wide-field">Description<textarea rows={2} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })}/></label><label className="toggle-field"><input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })}/> Show on storefront</label></div><div className="product-form-actions"><button type="button" className="admin-cancel" onClick={() => { setShowProductForm(false); setEditing(null); setPhoto(null); }}>Cancel</button><button className="admin-add-button" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add product"}</button></div></form>}
      <div className="admin-product-list">{products.map((product) => <article className="admin-product-row" key={product.id}><img src={product.image_url} alt=""/><div className="admin-product-info"><b>{product.name}</b><span>{product.category} · {product.pack_label}</span></div><div className="admin-product-stock"><b>{priceText(product.price)}</b><span className={product.stock_quantity <= 5 ? "low-stock" : ""}>{product.stock_quantity} in stock</span></div><span className={`visibility-tag ${product.is_active ? "is-live" : "is-hidden"}`}>{product.is_active ? "Live" : "Hidden"}</span><button className="edit-product" onClick={() => startEdit(product)}>Edit</button></article>)}</div>
    </section>
    <p className="admin-footer-note">KRP shop desk · Keep the goodness moving ♡</p>
  </main>;
}
