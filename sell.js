import { db } from "./firebase-config.js";
import {
  doc, getDoc, collection, getDocs, addDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { loadAndApplyTheme } from "./theme.js";
import { t } from "./lang.js";

// --- INIT ---
async function init() {
  const storeSnap = await getDoc(doc(db, "stores", storeId));
  if (!storeSnap.exists()) {
    alert("ไม่พบข้อมูลร้านค้า");
    window.location.href = "home.html";
    return;
  }
  currentStore = storeSnap.data();

  // โหลดธีม
  if (currentStore.ownerUid) {
    await loadAndApplyTheme(currentStore.ownerUid);
  }

  // เช็คสถานะร้าน
  if (!currentStore.isOpen) {
    alert("ร้านยังไม่ได้เปิด กรุณากดเปิดร้านก่อนที่หน้า Home");
    window.location.href = "home.html";
    return;
  }

  storeNameTitle.textContent = currentStore.name || "ร้านค้า";
  storeCoverImg.src = currentStore.coverImage || currentStore.logoUrl || currentStore.photoURL || "";

  creatorsList = currentStore.creators || [];
  promotionsList = currentStore.promotions || [];

  // ดึงข้อมูลสินค้าจาก Sub-collection "items"
  const itemsSnap = await getDocs(collection(db, "stores", storeId, "items"));
  itemsList = [];
  itemsSnap.forEach(d => {
    itemsList.push({ id: d.id, ...d.data() });
  });

  renderCreatorTabs();
  renderItemsGrid();

  // ฟังการเปลี่ยนแปลงสถานะร้านค้าแบบเรียลไทม์
  onSnapshot(doc(db, "stores", storeId), (snap) => {
    const data = snap.data();
    if (data && data.isOpen === false) {
      alert("ร้านถูกปิดแล้ว กำลังพากลับไปหน้าแรก");
      window.location.href = "home.html";
    }
  });
}

const urlParams = new URLSearchParams(window.location.search);
const storeId = urlParams.get("storeId");

if (!storeId) {
  alert("ไม่พบร้านค้าที่ระบุ");
  window.location.href = "home.html";
}

let currentStore = null;
let itemsList = [];
let creatorsList = [];
let promotionsList = [];
let cart = []; // { itemId, name, creator, price, qty }
let activeCreatorFilter = "ALL";



// --- DOM refs ---
const storeCoverImg = document.getElementById("storeCoverImg");
const storeNameTitle = document.getElementById("storeNameTitle");
const backToHomeBtn = document.getElementById("backToHomeBtn");
const afterSellLinkBtn = document.getElementById("afterSellLinkBtn");
const creatorTabsBar = document.getElementById("creatorTabsBar");
const itemsGridContainer = document.getElementById("itemsGridContainer");

const cartFloatingBar = document.getElementById("cartFloatingBar");
const cartCountBadge = document.getElementById("cartCountBadge");
const cartTotalPreview = document.getElementById("cartTotalPreview");

const addToCartModal = document.getElementById("addToCartModal");
const cartModalItemName = document.getElementById("cartModalItemName");
const cartModalItemPrice = document.getElementById("cartModalItemPrice");
const cartQtyInput = document.getElementById("cartQtyInput");
const cartQtyMinus = document.getElementById("cartQtyMinus");
const cartQtyPlus = document.getElementById("cartQtyPlus");
const cancelAddToCartBtn = document.getElementById("cancelAddToCartBtn");
const confirmAddToCartBtn = document.getElementById("confirmAddToCartBtn");

const checkoutModal = document.getElementById("checkoutModal");
const checkoutItemList = document.getElementById("checkoutItemList");
const checkoutPromoApplied = document.getElementById("checkoutPromoApplied");
const checkoutTotalPrice = document.getElementById("checkoutTotalPrice");
const backToCartBtn = document.getElementById("backToCartBtn");
const confirmItemsBtn = document.getElementById("confirmItemsBtn");

const paymentModal = document.getElementById("paymentModal");
const paymentMethodSelect = document.getElementById("paymentMethodSelect");
const slipUploadContainer = document.getElementById("slipUploadContainer");
const slipFileInput = document.getElementById("slipFileInput");
const slipPreviewImg = document.getElementById("slipPreviewImg");
const backToCheckoutBtn = document.getElementById("backToCheckoutBtn");
const savePaymentBtn = document.getElementById("savePaymentBtn");

let selectedItemForCart = null;
let slipBase64 = "";
let lastComputedCheckout = null;

backToHomeBtn.addEventListener("click", () => window.location.href = "home.html");
afterSellLinkBtn.addEventListener("click", () => window.location.href = `aftersell.html?storeId=${storeId}`);



let viewMode = 1;

// --- View mode switch ---
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    viewMode = Number(btn.dataset.mode);
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderItemsGrid();
  });
});

document.getElementById("allTabBtn").addEventListener("click", () => {
  activeCreatorFilter = "ALL";
  document.querySelectorAll(".tab-item").forEach(b => b.classList.remove("active"));
  document.getElementById("allTabBtn").classList.add("active");
  renderItemsGrid();
});

// --- แทนที่ renderCreatorTabs เดิม ---
function renderCreatorTabs() {
  const tier2Nav = document.getElementById("tier2Nav");
  // ลบปุ่ม creator เก่า (เก็บปุ่ม All ไว้)
  tier2Nav.querySelectorAll(".creator-tab-item").forEach(el => el.remove());

  creatorsList.forEach(creator => {
    const btn = document.createElement("button");
    btn.className = "tab-item creator-tab-item";
    btn.textContent = creator;
    btn.addEventListener("click", () => {
      activeCreatorFilter = creator;
      document.querySelectorAll(".tab-item").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderItemsGrid();
    });
    tier2Nav.appendChild(btn);
  });
}

// --- แทนที่ renderItemsGrid เดิม ให้จัดกลุ่มตาม Creator เหมือน item.html ---
function renderItemsGrid() {
  const itemMainContainer = document.getElementById("itemMainContainer");
  itemMainContainer.innerHTML = "";

  const groupedCreators = activeCreatorFilter === "ALL" ? creatorsList : [activeCreatorFilter];

  groupedCreators.forEach(creator => {
    const creatorItems = itemsList.filter(i => i.creator === creator);
    if (creatorItems.length === 0) return;

    const section = document.createElement("div");
    section.className = "creator-section";
    section.innerHTML = `<div class="creator-section-title">👤 ${escapeHtml(creator)}</div>`;

    const grid = document.createElement("div");
    grid.className = `items-grid mode-${viewMode}`;

    creatorItems.forEach(item => {
      const card = document.createElement("div");
      card.className = "item-card";
      card.innerHTML = `
        <div class="item-img-container">
          <img class="item-card-img" src="${item.imageUrl || item.photoURL || item.image || ''}" alt="${escapeHtml(item.name)}">
          <div class="add-cart-badge">+</div>
        </div>
        <div class="item-card-info">
          <div class="item-card-name">${escapeHtml(item.name)}</div>
          <div class="item-card-creator">👤 ${escapeHtml(item.creator)}</div>
          <div class="item-card-price">${item.price} ${item.currency || 'THB'}</div>
        </div>
      `;
      card.addEventListener("click", () => openAddToCartModal(item));
      grid.appendChild(card);
    });

    section.appendChild(grid);
    itemMainContainer.appendChild(section);
  });

  if (itemMainContainer.innerHTML === "") {
    itemMainContainer.innerHTML = `<div class="muted-text" style="text-align:center; padding:30px;">ไม่มีสินค้าในหมวดนี้</div>`;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// --- ADD TO CART MODAL ---
function openAddToCartModal(item) {
  selectedItemForCart = item;
  cartModalItemName.textContent = item.name;
  cartModalItemPrice.textContent = `ราคา ${item.price} ${item.currency || 'THB'} ต่อชิ้น`;
  cartQtyInput.value = 1;
  addToCartModal.classList.remove("hidden");
}

cartQtyMinus.addEventListener("click", () => {
  const v = parseInt(cartQtyInput.value) || 1;
  if (v > 1) cartQtyInput.value = v - 1;
});
cartQtyPlus.addEventListener("click", () => {
  const v = parseInt(cartQtyInput.value) || 1;
  cartQtyInput.value = v + 1;
});
cancelAddToCartBtn.addEventListener("click", () => addToCartModal.classList.add("hidden"));

confirmAddToCartBtn.addEventListener("click", () => {
  if (!selectedItemForCart) return;
  const qty = parseInt(cartQtyInput.value) || 1;
  const existing = cart.find(c => c.itemId === selectedItemForCart.id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      itemId: selectedItemForCart.id,
      name: selectedItemForCart.name,
      creator: selectedItemForCart.creator || "-",
      price: Number(selectedItemForCart.price),
      qty
    });
  }
  updateCartBadge();
  addToCartModal.classList.add("hidden");
});

function updateCartBadge() {
  const count = cart.reduce((s, c) => s + c.qty, 0);
  cartCountBadge.textContent = count;
  if (count > 0) {
    cartFloatingBar.classList.remove("hidden");
    const { totalRevenue } = computeCheckout();
    cartTotalPreview.textContent = totalRevenue.toFixed(2);
  } else {
    cartFloatingBar.classList.add("hidden");
  }
}

cartFloatingBar.addEventListener("click", () => openCheckoutModal());

// --- PROMOTION ENGINE ---
function computeCheckout() {
  let working = cart.map(c => ({ ...c, remainingQty: c.qty }));
  const findWorking = (id) => working.find(w => w.itemId === id);
  let lineItems = [];
  let promoTitles = [];

  // 1. BOGO
  promotionsList.filter(p => p.mode === "bogo").forEach(promo => {
    const buyW = findWorking(promo.buyId);
    if (buyW && buyW.remainingQty >= promo.buyQty) {
      const applications = Math.floor(buyW.remainingQty / promo.buyQty);
      const getW = findWorking(promo.getId);
      if (applications > 0 && getW) {
        const freeWanted = applications * promo.getQty;
        const freeActual = Math.min(freeWanted, getW.remainingQty);
        if (freeActual > 0) {
          getW.remainingQty -= freeActual;
          lineItems.push({
            name: `${getW.name} (แถม)`, creator: getW.creator,
            qty: freeActual, revenue: 0, isPromo: true, promoTitle: promo.title
          });
          promoTitles.push(promo.title);
        }
      }
    }
  });

  // 2. SET
  promotionsList.filter(p => p.mode === "set").forEach(promo => {
    let maxSets = Infinity;
    promo.items.forEach(ri => {
      const w = findWorking(ri.id);
      const avail = w ? w.remainingQty : 0;
      maxSets = Math.min(maxSets, Math.floor(avail / ri.qty));
    });
    if (maxSets > 0 && isFinite(maxSets)) {
      const normalSetTotal = promo.items.reduce((s, ri) => s + ri.price * ri.qty, 0);
      promo.items.forEach(ri => {
        const w = findWorking(ri.id);
        const consumeQty = ri.qty * maxSets;
        w.remainingQty -= consumeQty;
        const contribution = ri.price * ri.qty * maxSets;
        const revenueShare = (contribution / (normalSetTotal * maxSets)) * (promo.setPrice * maxSets);
        lineItems.push({
          name: `${w.name} (เซต: ${promo.title})`, creator: w.creator,
          qty: consumeQty, revenue: Math.round(revenueShare * 100) / 100,
          isPromo: true, promoTitle: promo.title
        });
      });
      promoTitles.push(promo.title);
    }
  });

  // 3. DISCOUNT
  promotionsList.filter(p => p.mode === "discount").forEach(promo => {
    const w = findWorking(promo.itemId);
    if (w && w.remainingQty > 0) {
      lineItems.push({
        name: `${w.name} (ลดราคา: ${promo.title})`, creator: w.creator,
        qty: w.remainingQty, revenue: promo.summaryPrice * w.remainingQty,
        isPromo: true, promoTitle: promo.title
      });
      promoTitles.push(promo.title);
      w.remainingQty = 0;
    }
  });

  // 4. NORMAL PRICE (remaining)
  working.forEach(w => {
    if (w.remainingQty > 0) {
      lineItems.push({
        name: w.name, creator: w.creator, qty: w.remainingQty,
        revenue: w.price * w.remainingQty, isPromo: false, promoTitle: ""
      });
    }
  });

  const totalRevenue = lineItems.reduce((s, l) => s + l.revenue, 0);
  return { lineItems, totalRevenue, promoTitles: [...new Set(promoTitles)] };
}

// --- CHECKOUT MODAL ---
function openCheckoutModal() {
  if (cart.length === 0) { alert("ยังไม่มีสินค้าในตะกร้า"); return; }
  lastComputedCheckout = computeCheckout();
  renderCheckoutSummary(lastComputedCheckout);
  checkoutModal.classList.remove("hidden");
}
backToCartBtn.addEventListener("click", () => checkoutModal.classList.add("hidden"));

function renderCheckoutSummary({ lineItems, totalRevenue, promoTitles }) {
  checkoutItemList.innerHTML = "";
  lineItems.forEach(li => {
    const row = document.createElement("div");
    row.className = `checkout-row ${li.isPromo ? "promo-row" : ""}`;
    row.innerHTML = `<span>${escapeHtml(li.name)} (x${li.qty})</span><span>${li.revenue.toFixed(2)} บาท</span>`;
    checkoutItemList.appendChild(row);
  });
  checkoutPromoApplied.textContent = promoTitles.length ? promoTitles.join(", ") : "ไม่มี";
  checkoutTotalPrice.textContent = totalRevenue.toFixed(2);
}

confirmItemsBtn.addEventListener("click", () => {
  checkoutModal.classList.add("hidden");
  paymentModal.classList.remove("hidden");
});

// --- PAYMENT MODAL ---
backToCheckoutBtn.addEventListener("click", () => {
  paymentModal.classList.add("hidden");
  checkoutModal.classList.remove("hidden");
});

paymentMethodSelect.addEventListener("change", (e) => {
  if (e.target.value === "transfer") {
    slipUploadContainer.classList.remove("hidden");
  } else {
    slipUploadContainer.classList.add("hidden");
    slipBase64 = "";
    slipPreviewImg.classList.add("hidden");
    slipFileInput.value = "";
  }
});

slipFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    slipBase64 = ev.target.result;
    slipPreviewImg.src = slipBase64;
    slipPreviewImg.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

savePaymentBtn.addEventListener("click", async () => {
  const paymentMethod = paymentMethodSelect.value;
  if (paymentMethod === "transfer" && !slipBase64) {
    alert("กรุณาแนบรูปสลิปโอนเงินก่อนบันทึก");
    return;
  }

  const { lineItems, totalRevenue, promoTitles } = lastComputedCheckout || computeCheckout();
  const now = new Date();

  const saleRecord = {
    date: now.toLocaleDateString("th-TH"),
    time: now.toLocaleTimeString("th-TH"),
    timestamp: serverTimestamp(),
    items: lineItems.map(li => ({
      name: li.name, creator: li.creator, qty: li.qty, revenue: li.revenue, isPromo: li.isPromo
    })),
    totalRevenue,
    paymentMethod,
    slipURL: paymentMethod === "transfer" ? slipBase64 : "",
    promoInfo: promoTitles.length ? promoTitles.join(", ") : "ไม่มี"
  };

  savePaymentBtn.disabled = true;
  try {
    await addDoc(collection(db, "stores", storeId, "sales"), saleRecord);
    alert("บันทึกการขายสำเร็จ!");
    resetAfterSale();
  } catch (err) {
    console.error(err);
    alert("บันทึกไม่สำเร็จ กรุณาลองใหม่");
  } finally {
    savePaymentBtn.disabled = false;
  }
});

function resetAfterSale() {
  cart = [];
  updateCartBadge();
  slipBase64 = "";
  slipPreviewImg.classList.add("hidden");
  slipFileInput.value = "";
  paymentMethodSelect.value = "cash";
  slipUploadContainer.classList.add("hidden");
  paymentModal.classList.add("hidden");
  checkoutModal.classList.add("hidden");
  // กลับมาที่หน้าสินค้าพร้อมรับลูกค้าคนถัดไป
  renderItemsGrid();
}



init();