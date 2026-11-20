/* QUICK SETUP: add the shop's WhatsApp number before launch.
   Use digits only, including country code (example: 919876543210). */
const SHOP = { name: "KRP Dry Fruits", whatsapp: "", currency: "INR", locale: "en-IN" };
const PRODUCTS = [
  { id: "figs", name: "Dried Figs (Anjeer)", category: "Figs", price: null, badge: "DRIED FRUIT", image: "assets/dried-figs.png", description: "Soft, naturally sweet dried figs. Ask us about available pack sizes." },
  { id: "walnuts", name: "Walnut Kernels (Akhrot)", category: "Walnuts", price: null, badge: "DRIED FRUIT", image: "assets/walnut-kernels.png", description: "Selected walnut kernels. Ask us about available pack sizes." },
  { id: "almonds-1", name: "Almonds — Selection 1", category: "Almonds", price: null, badge: "DRIED FRUIT", image: "assets/almonds-selection-1.png", description: "Almonds from the first photo. Please ask us for the variety and pack size." },
  { id: "almonds-2", name: "Almonds — Selection 2", category: "Almonds", price: null, badge: "DRIED FRUIT", image: "assets/almonds-selection-2.png", description: "Almonds from the second photo. Please ask us for the variety and pack size." },
  { id: "raisins", name: "Golden Raisins (Kishmish)", category: "Raisins", price: null, badge: "DRIED FRUIT", image: "assets/golden-raisins.png", description: "Golden raisins. Ask us about available pack sizes." }
];

const $ = (s) => document.querySelector(s);
const grid = $("#product-grid"), filters = $("#filters"), searchInput = $("#search-input");
const money = (n) => n == null ? "Price on request" : new Intl.NumberFormat(SHOP.locale, { style: "currency", currency: SHOP.currency, maximumFractionDigits: 0 }).format(n);
let activeCategory = "All dry fruits", query = "", cart = readCart(), reviews = readReviews(), toastTimer, reviewProductId = "", selectedRating = 0;

function readCart() { try { return JSON.parse(localStorage.getItem("krp-dry-fruits-cart") || "{}"); } catch { return {}; } }
function saveCart() { localStorage.setItem("krp-dry-fruits-cart", JSON.stringify(cart)); }
function readReviews() {
  try {
    const saved = JSON.parse(localStorage.getItem("krp-dry-fruits-reviews") || "{}");
    return Object.fromEntries(Object.entries(saved).filter(([id, rating]) => PRODUCTS.some(p => p.id === id) && Number.isInteger(rating) && rating >= 1 && rating <= 5));
  } catch { return {}; }
}
function saveReviews() { localStorage.setItem("krp-dry-fruits-reviews", JSON.stringify(reviews)); }
function getReviewSummary(productId) {
  const rating = reviews[productId] || 0;
  const stars = Array.from({ length: 5 }, (_, index) => `<span${index < Math.round(rating) ? ' class="filled"' : ""} aria-hidden="true">★</span>`).join("");
  const label = rating ? `1 customer rating · ${rating.toFixed(1)}` : "No ratings yet";
  return { stars, label, rating };
}
function renderFilters() {
  const categories = ["All dry fruits", ...new Set(PRODUCTS.map(p => p.category))];
  filters.innerHTML = categories.map(c => `<button class="filter-chip${c === activeCategory ? " active" : ""}" data-category="${c}">${c}</button>`).join("");
  filters.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { activeCategory = b.dataset.category; renderFilters(); renderProducts(); }));
}
function renderProducts() {
  const found = PRODUCTS.filter(p => (activeCategory === "All dry fruits" || p.category === activeCategory) && `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(query.toLowerCase()));
  $("#empty-state").hidden = found.length !== 0;
  grid.innerHTML = found.map(p => {
    const summary = getReviewSummary(p.id);
    const reviewLabel = summary.rating ? "Update rating" : "Rate product";
    return `<article class="product-card"><div class="product-image"><img src="${p.image}" alt="${p.name}" loading="lazy"><span class="badge">${p.badge}</span><button class="quick-add" data-add="${p.id}" aria-label="Add ${p.name} to bag">+</button></div><div class="product-meta"><span class="product-category">${p.category}</span><h3 class="product-name">${p.name}</h3><div class="product-bottom"><span class="price">${money(p.price)}</span></div><div class="rating-row"><span class="review-stars" aria-label="${summary.rating || 0} out of 5 stars">${summary.stars}</span><span class="rating-count">${summary.label}</span><button type="button" class="rate-link" data-review="${p.id}" aria-label="${reviewLabel} for ${p.name}">${reviewLabel}</button></div></div></article>`;
  }).join("");
  grid.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => addItem(b.dataset.add)));
  grid.querySelectorAll("[data-review]").forEach(b => b.addEventListener("click", () => openReview(b.dataset.review)));
}
function addItem(id) { cart[id] = (cart[id] || 0) + 1; saveCart(); renderCart(); showToast("Added to your bag ♡"); }
function setQty(id, delta) { cart[id] = (cart[id] || 0) + delta; if (cart[id] <= 0) delete cart[id]; saveCart(); renderCart(); }
function renderCart() {
  const entries = Object.entries(cart).filter(([id, qty]) => PRODUCTS.some(p => p.id === id) && qty > 0);
  const count = entries.reduce((n, [, qty]) => n + qty, 0);
  $("#cart-count").textContent = count; $("#drawer-count").textContent = `(${count})`; $("#subtotal").textContent = count ? "On enquiry" : "—";
  $("#cart-empty").hidden = count !== 0; $("#cart-bottom").hidden = count === 0;
  $("#cart-items").innerHTML = entries.map(([id, qty]) => { const p = PRODUCTS.find(x => x.id === id); return `<div class="cart-row"><img src="${p.image}" alt=""><div><h3>${p.name}</h3><span class="unit-price">${money(p.price)} · ask for pack sizes</span><div class="qty-controls"><button data-qty="${id}" data-delta="-1" aria-label="Remove one ${p.name}">−</button><span>${qty}</span><button data-qty="${id}" data-delta="1" aria-label="Add one ${p.name}">+</button></div></div><span class="line-total">× ${qty}</span></div>`; }).join("");
  $("#cart-items").querySelectorAll("[data-qty]").forEach(b => b.addEventListener("click", () => setQty(b.dataset.qty, Number(b.dataset.delta))));
}
function openCart() { document.body.classList.add("cart-open"); $("#cart-drawer").setAttribute("aria-hidden", "false"); $("#close-cart").focus(); }
function closeCart() { document.body.classList.remove("cart-open"); $("#cart-drawer").setAttribute("aria-hidden", "true"); $("#open-cart").focus(); }
function showToast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("visible"); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("visible"), 2100); }
function setSelectedRating(value) {
  selectedRating = value;
  $("#rating-picker").querySelectorAll("[data-rating]").forEach(button => {
    const active = Number(button.dataset.rating) <= value;
    button.textContent = active ? "★" : "☆";
    button.classList.toggle("selected", active);
    button.setAttribute("aria-checked", Number(button.dataset.rating) === value ? "true" : "false");
  });
  $("#rating-choice").textContent = value ? `${value} out of 5 stars` : "Choose 1 to 5 stars";
}
function openReview(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  reviewProductId = productId;
  $("#review-product-name").textContent = product.name;
  $("#review-heading").textContent = reviews[productId] ? "Update your rating" : "Rate this product";
  setSelectedRating(reviews[productId] || 0);
  $("#review-dialog").showModal();
  $("#rating-picker").querySelector("[data-rating='1']").focus();
}
function saveReview() {
  if (!reviewProductId || selectedRating < 1 || selectedRating > 5) {
    showToast("Choose a star rating first");
    return;
  }
  reviews[reviewProductId] = selectedRating;
  saveReviews();
  $("#review-dialog").close();
  renderProducts();
  showToast("Your rating was saved on this device");
}
function checkout() {
  const entries = Object.entries(cart).filter(([id, qty]) => PRODUCTS.some(p => p.id === id) && qty > 0);
  if (!entries.length) return;
  if (!SHOP.whatsapp) { showToast("WhatsApp setup needed: add the shop number in app.js"); return; }
  const lines = entries.map(([id, qty]) => { const p = PRODUCTS.find(x => x.id === id); return `• ${p.name} × ${qty}`; });
  const message = `Hello ${SHOP.name}! I would like to enquire about:\n\n${lines.join("\n")}\n\nPlease share your prices, available pack sizes, and delivery options.`;
  window.open(`https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}
function setShopName() { document.querySelectorAll("[data-shop-name]").forEach(e => e.textContent = SHOP.name); document.title = `${SHOP.name} — Goodness, thoughtfully picked`; }

setShopName(); renderFilters(); renderProducts(); renderCart();
$("#search-form").addEventListener("submit", e => { e.preventDefault(); query = searchInput.value.trim(); renderProducts(); $("#shop").scrollIntoView({ behavior: "smooth" }); });
searchInput.addEventListener("input", () => { query = searchInput.value.trim(); renderProducts(); });
$("#view-all").addEventListener("click", e => { e.preventDefault(); activeCategory = "All dry fruits"; query = ""; searchInput.value = ""; renderFilters(); renderProducts(); });
$("#open-cart").addEventListener("click", openCart); $("#close-cart").addEventListener("click", closeCart); $("#scrim").addEventListener("click", closeCart);
$("#keep-shopping").addEventListener("click", closeCart); $("#checkout").addEventListener("click", checkout);
$("#rating-picker").querySelectorAll("[data-rating]").forEach(button => button.addEventListener("click", () => setSelectedRating(Number(button.dataset.rating))));
$("#submit-review").addEventListener("click", saveReview);
$("#close-review").addEventListener("click", () => $("#review-dialog").close());
document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("cart-open")) closeCart(); });
if (SHOP.whatsapp) $("#footer-contact").innerHTML = `<a class="text-link" href="https://wa.me/${SHOP.whatsapp}">Ask about prices on WhatsApp →</a>`;
