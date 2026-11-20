"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { formatPrice, type Product } from "@/lib/catalog";

type Summary = { average: number; count: number };
type Basket = Record<string, number>;
type Customer = { name: string; phone: string; email: string; address: string; note: string };

export default function Storefront({ products, reviewSummaries, demo }: { products: Product[]; reviewSummaries: Record<string, Summary>; demo: boolean }) {
  const [cart, setCart] = useState<Basket>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<Product | null>(null);
  const [reviews, setReviews] = useState(reviewSummaries);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [stars, setStars] = useState(0);
  const [customer, setCustomer] = useState<Customer>({ name: "", phone: "", email: "", address: "", note: "" });
  const categories = ["All", ...new Set(products.map((product) => product.category))];
  const visibleProducts = useMemo(() => products.filter((product) => product.is_active && (category === "All" || product.category === category) && `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query.toLowerCase())), [products, category, query]);
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const cartProducts = products.filter((product) => cart[product.id]);
  const total = cartProducts.reduce((sum, product) => sum + (product.price || 0) * cart[product.id], 0);
  const hasRequestPrice = cartProducts.some((product) => product.price === null);

  // Load the browser-only basket and preview ratings after hydration.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("krp-basket");
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCart(JSON.parse(saved) as Basket);
      }
      if (demo) {
        const localReviews = JSON.parse(localStorage.getItem("krp-demo-reviews") || "{}");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReviews((current) => ({ ...current, ...localReviews }));
      }
    } catch { /* Start with an empty basket if browser storage is unavailable. */ }
  }, [demo]);
  useEffect(() => { try { localStorage.setItem("krp-basket", JSON.stringify(cart)); } catch { /* Basket remains available for this visit. */ } }, [cart]);

  function changeQuantity(id: string, amount: number) {
    setCart((current) => {
      const quantity = Math.max(0, (current[id] || 0) + amount);
      const next = { ...current };
      if (quantity) next[id] = quantity; else delete next[id];
      return next;
    });
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cartCount) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer, items: cartProducts.map((product) => ({ productId: product.id, quantity: cart[product.id] })) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn't place the order. Please try again.");
      setOrderNumber(result.orderNumber);
      if (result.demo) {
        const saved = JSON.parse(localStorage.getItem("krp-demo-orders") || "[]");
        saved.unshift({ id: `DEMO-NEW-${result.orderNumber}`, order_number: result.orderNumber, customer_name: customer.name, phone: customer.phone, email: customer.email, delivery_address: customer.address, note: customer.note, status: "pending", total: null, created_at: new Date().toISOString(), order_items: cartProducts.map((product) => ({ product_name: product.name, pack_label: product.pack_label, quantity: cart[product.id] })) });
        localStorage.setItem("krp-demo-orders", JSON.stringify(saved));
      }
      setCart({});
    } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewTarget || stars < 1) return;
    const form = new FormData(event.currentTarget);
    const payload = { productId: reviewTarget.id, rating: stars, orderNumber: String(form.get("review-order") || "").trim(), phone: String(form.get("review-phone") || "").trim() };
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn't save that review.");
      setReviews((current) => ({ ...current, [reviewTarget.id]: result.summary }));
      if (result.demo) {
        const local = JSON.parse(localStorage.getItem("krp-demo-reviews") || "{}");
        local[reviewTarget.id] = result.summary;
        localStorage.setItem("krp-demo-reviews", JSON.stringify(local));
      }
      setReviewTarget(null); setStars(0); setNotice("Thanks for sharing your rating.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  return <>
    <div className="announcement">SMALL SHOP, GOOD THINGS <span>✳</span> THOUGHTFULLY CHOSEN DRY FRUITS</div>
    {demo && <div className="demo-banner"><b>PREVIEW STORE</b><span>Sample catalog only. Orders and reviews here are for demonstration and won’t reach the shop.</span></div>}
    <header className="site-header">
      <a className="brand" href="#top" aria-label="KRP Dry Fruits home"><span className="brand-mark">K</span><span><b>KRP Dry Fruits</b><small>GOODNESS, THOUGHTFULLY PICKED</small></span></a>
      <form className="search" role="search" onSubmit={(event) => { event.preventDefault(); document.querySelector("#shop")?.scrollIntoView({ behavior: "smooth" }); }}><input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search dry fruits…" aria-label="Search products"/><button aria-label="Search">⌕</button></form>
      <div className="header-actions"><a className="account-link" href="#about">Our story</a><button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`Open bag with ${cartCount} items`}>Bag <span>{cartCount}</span></button></div>
    </header>
    <main id="top">
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow"><i/> A LITTLE SOMETHING GOOD</span><h1>Nature&apos;s finest,<br/><em>made for sharing.</em></h1><p>Thoughtfully picked dry fruits for slow mornings, little cravings, and the people you love.</p><a className="primary-button" href="#shop">Find your favourite <span>→</span></a><div className="hero-note"><span className="tiny-flower">✿</span> A family business, with care in every choice</div></div>
        <div className="hero-art" aria-label="A close-up of KRP walnuts"><div className="hero-image"/><div className="art-sticker">GOOD<br/>FOOD<br/><b>GOOD MOOD ✳</b></div><div className="art-caption"><b>Everyday goodness</b><span>From KRP to your home</span></div></div>
      </section>
      <section className="trust-row"><div><span>✳</span><b>Picked with care</b><small>Good things, chosen thoughtfully</small></div><div><span>♡</span><b>Family-run goodness</b><small>A small shop with a big heart</small></div><div><span>↗</span><b>Here to help</b><small>Ask us about packs and prices</small></div></section>
      <section className="shop-section" id="shop"><div className="section-heading"><div><span className="eyebrow">THE KRP PANTRY</span><h2>Little everyday <em>luxuries.</em></h2><p>Good snacks start with good ingredients. Find something lovely.</p></div><a href="#shop" className="text-link" onClick={(event) => { event.preventDefault(); setCategory("All"); setQuery(""); }}>See everything <span>→</span></a></div>
        <nav className="filters" aria-label="Product categories">{categories.map((item) => <button key={item} className={`filter-chip${item === category ? " active" : ""}`} onClick={() => setCategory(item)}>{item === "All" ? "All dry fruits" : item}</button>)}</nav>
        <div className="product-grid" aria-live="polite">{visibleProducts.map((product) => {
          const summary = reviews[product.id] || { count: 0, average: 0 };
          return <article className="product-card" key={product.id}><div className="product-image"><img src={product.image_url} alt={product.name} loading="lazy"/><span className="badge">KRP PICK</span><button className="quick-add" disabled={product.stock_quantity < 1} onClick={() => changeQuantity(product.id, 1)} aria-label={`Add ${product.name} to bag`}>{product.stock_quantity < 1 ? "–" : "+"}</button></div><div className="product-meta"><span className="product-category">{product.category}</span><h3 className="product-name">{product.name}</h3><div className="product-bottom"><span className="price">{formatPrice(product.price)}</span><span className="pack-size">{product.pack_label}</span></div><div className="rating-row"><span className="review-stars" aria-label={`${summary.average.toFixed(1)} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <span className={index < Math.round(summary.average) ? "filled" : ""} key={index}>★</span>)}</span><span className="rating-count">{summary.count ? `${summary.average.toFixed(1)} · ${summary.count} rating${summary.count === 1 ? "" : "s"}` : "No ratings yet"}</span><button type="button" className="rate-link" onClick={() => { setReviewTarget(product); setStars(0); setNotice(""); }}>{summary.count ? "Rate" : "Review"}</button></div></div></article>;
        })}</div>
        {!visibleProducts.length && <div className="empty-state"><span>✿</span><h3>No matches just yet</h3><p>Try another search or browse all our finds.</p></div>}
      </section>
      <section className="story" id="about"><div className="story-symbol">✿</div><div><span className="eyebrow">A NOTE FROM OUR FAMILY</span><h2>Good food brings<br/>us a little <em>closer.</em></h2><p>KRP is a family-run dry fruit business. We believe the little things matter: choosing well, sharing generously, and making everyday moments feel special.</p><a href="#shop" className="text-link">Get to know our picks <span>→</span></a></div><div className="story-seal">KRP<br/>DRY FRUITS<br/><b>WITH LOVE</b></div></section>
    </main>
    <footer><a className="brand footer-brand" href="#top"><span className="brand-mark">K</span><span><b>KRP Dry Fruits</b><small>GOODNESS, THOUGHTFULLY PICKED</small></span></a><span>Goodness, thoughtfully picked. <span className="heart">♥</span></span><span>Questions? Ask us about availability and pricing.</span><a className="admin-footer-link" href="/admin">Shop owner</a></footer>

    {cartOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}><aside className="cart-drawer open" role="dialog" aria-modal="true" aria-labelledby="bag-title"><div className="drawer-head"><div><span className="eyebrow">YOUR SELECTION</span><h2 id="bag-title">Your bag <span>({cartCount})</span></h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Close bag">×</button></div>{cartProducts.length ? <><div className="cart-items">{cartProducts.map((product) => <div className="cart-row" key={product.id}><img src={product.image_url} alt=""/><div><h3>{product.name}</h3><span className="unit-price">{product.pack_label} · {formatPrice(product.price)}</span><div className="qty-controls"><button onClick={() => changeQuantity(product.id, -1)} aria-label={`Remove one ${product.name}`}>−</button><span>{cart[product.id]}</span><button onClick={() => changeQuantity(product.id, 1)} aria-label={`Add one ${product.name}`}>+</button></div></div></div>)}</div><div className="cart-bottom"><div className="subtotal"><span>Items</span><b>{cartCount}</b></div><p>We&apos;ll confirm final prices, pack sizes, and delivery before your order is confirmed.</p><button className="checkout-button" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>Continue to enquiry <span>→</span></button></div></> : <div className="cart-empty"><span>♡</span><b>Your bag is ready for some goodness.</b><button className="text-link" onClick={() => setCartOpen(false)}>Keep browsing →</button></div>}</aside></div>}

    {checkoutOpen && <div className="modal-backdrop"><section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><button className="icon-button modal-close" onClick={() => { setCheckoutOpen(false); setOrderNumber(""); }} aria-label="Close checkout">×</button>{orderNumber ? <div className="order-success"><span className="success-mark">✓</span><span className="eyebrow">ENQUIRY RECEIVED</span><h2>Thank you, {customer.name.split(" ")[0]}.</h2><p>Your reference is <b>{orderNumber}</b>. {demo ? "This was a preview order and has not been sent to the shop." : "KRP will contact you to confirm price, availability, and delivery."}</p><button className="checkout-button" onClick={() => { setCheckoutOpen(false); setOrderNumber(""); }}>Back to the shop</button></div> : <><span className="eyebrow">A FEW DETAILS</span><h2 id="checkout-title">Send an order enquiry</h2><p className="modal-intro">No payment now. KRP will confirm your pack sizes, total, and delivery with you.</p><div className="order-summary">{cartProducts.map((product) => <span key={product.id}>{product.name} · {product.pack_label} <b>× {cart[product.id]}</b></span>)}<strong>{!hasRequestPrice && total ? `Indicative total ${formatPrice(total)}` : "Final prices confirmed by KRP"}</strong></div><form className="checkout-form" onSubmit={submitOrder}><label>Your name<input required autoComplete="name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })}/></label><label>Mobile number<input required autoComplete="tel" inputMode="tel" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })}/></label><label>Email <span>(optional)</span><input type="email" autoComplete="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })}/></label><label>Delivery address<textarea required autoComplete="street-address" rows={2} value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })}/></label><label>Anything else? <span>(optional)</span><textarea rows={2} value={customer.note} onChange={(event) => setCustomer({ ...customer, note: event.target.value })}/></label>{notice && <p className="form-error" role="alert">{notice}</p>}<button className="checkout-button" disabled={busy}>{busy ? "Sending…" : "Send enquiry"}<span>→</span></button><small>Your details are used only to respond to this enquiry.</small></form></>}</section></div>}

    {reviewTarget && <div className="modal-backdrop"><section className="checkout-modal review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><button className="icon-button modal-close" onClick={() => setReviewTarget(null)} aria-label="Close rating form">×</button><span className="eyebrow">YOUR EXPERIENCE</span><h2 id="review-title">Review {reviewTarget.name}</h2><p className="modal-intro">Share a rating after your KRP order has been delivered.</p><form className="checkout-form" onSubmit={submitReview}><label>Order reference<input name="review-order" required placeholder="e.g. KRP-2026-0042"/></label><label>Mobile number used for the order<input name="review-phone" required inputMode="tel"/></label><fieldset className="star-field"><legend>Your rating</legend><div className="rating-picker">{[1, 2, 3, 4, 5].map((value) => <button type="button" className={value <= stars ? "selected" : ""} aria-label={`${value} stars`} aria-pressed={value === stars} key={value} onClick={() => setStars(value)}>★</button>)}</div>{stars ? <small>{stars} out of 5 stars</small> : null}</fieldset>{notice && <p className="form-error" role="alert">{notice}</p>}<button className="checkout-button" disabled={busy || !stars}>{busy ? "Saving…" : "Submit rating"}<span>→</span></button></form></section></div>}
    {notice && !checkoutOpen && !reviewTarget && <div className="toast visible" role="status">{notice}</div>}
  </>;
}
