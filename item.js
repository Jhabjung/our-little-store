import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, collection, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, getDocs, serverTimestamp, arrayUnion, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { loadAndApplyTheme } from "./theme.js";
import { t } from "./lang.js"; 

const urlParams = new URLSearchParams(window.location.search);
const storeId = urlParams.get("storeId");

if (!storeId) {
  alert("ไม่พบรหัสร้านค้า");
  window.location.href = "home.html";
}

let currentUser = null;
let currentStore = null;
let creatorsList = []; // Array ชื่อ creator เรียง A-Z / ก-ฮ
let itemsList = [];     // Array สินค้าทั้งหมดในร้าน
let viewMode = 1;       // 1 = แนวตั้ง 1 คอลัมน์, 2 = แนวนอน/กริด, 3 = กำลังพัฒนา
let editingItemId = null; // ถ้านั่ง null คือสร้างใหม่, ถ้ามีค่าคือแก้ไขสินค้านั้น


// Elements
const homeBtn = document.getElementById("homeBtn");
const searchInput = document.getElementById("searchInput");
const viewModeBtn = document.getElementById("viewModeBtn");
const viewModeIconLbl = document.getElementById("viewModeIconLbl");
const dropdownToggleBtn = document.getElementById("dropdownToggleBtn");
const storeInfoPanel = document.getElementById("storeInfoPanel");
const panelStoreCode = document.getElementById("panelStoreCode");
const copyCodeBtn = document.getElementById("copyCodeBtn");
const tier2Nav = document.getElementById("tier2Nav");
const newItemBtn = document.getElementById("newItemBtn");
const itemMainContainer = document.getElementById("itemMainContainer");

// Item Modal
const itemModal = document.getElementById("itemModal");
const itemPhotoPreview = document.getElementById("itemPhotoPreview");
const itemPhotoEditBtn = document.getElementById("itemPhotoEditBtn");
const itemPhotoInput = document.getElementById("itemPhotoInput");
const itemNameInput = document.getElementById("itemNameInput");
const itemIdDisplay = document.getElementById("itemIdDisplay");
const creatorSelect = document.getElementById("creatorSelect");
const addCreatorPromptBtn = document.getElementById("addCreatorPromptBtn");
const itemPriceInput = document.getElementById("itemPriceInput");
const currencySelect = document.getElementById("currencySelect");
const itemModalError = document.getElementById("itemModalError");
const itemModalCancelBtn = document.getElementById("itemModalCancelBtn");
const itemModalSubmitBtn = document.getElementById("itemModalSubmitBtn");
let itemPhotoDataUrl = null;

// Creator Modal
const creatorModal = document.getElementById("creatorModal");
const newCreatorNameInput = document.getElementById("newCreatorNameInput");
const creatorModalError = document.getElementById("creatorModalError");
const creatorCancelBtn = document.getElementById("creatorCancelBtn");
const creatorSubmitBtn = document.getElementById("creatorSubmitBtn");

// =======================================================
// Auth & Initial Load
// =======================================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  await loadAndApplyTheme(user.uid);
  await loadStoreData();
  listenItems();
});

async function loadStoreData() {
  const storeRef = doc(db, "stores", storeId);
  const snap = await getDoc(storeRef);
  if (!snap.exists()) {
    alert("ไม่พบร้านค้านี้");
    window.location.href = "home.html";
    return;
  }
  currentStore = { id: snap.id, ...snap.data() };
  panelStoreCode.textContent = currentStore.code || "------";
  creatorsList = currentStore.creators || [];
  sortCreators();

  // เช็คถ้าเป็นหน้าจอแนวตั้ง (หรือง่ายๆ แสดงปุ่ม dropdown เสมอตามสเปก)
  dropdownToggleBtn.style.display = "inline-flex";
  renderTier2Nav();
}

function sortCreators() {
  creatorsList.sort((a, b) => a.localeCompare(b, 'th'));
}

// =======================================================
// Realtime Items Listener
// =======================================================
function listenItems() {
  const q = query(collection(db, "stores", storeId, "items"));
  onSnapshot(q, (snapshot) => {
    itemsList = [];
    snapshot.forEach(d => itemsList.push({ id: d.id, ...d.data() }));
    renderItems(itemsList);
  });
}

// =======================================================
// Navigation & UI Actions
// =======================================================
homeBtn.addEventListener("click", () => {
  window.location.href = "home.html";
});

dropdownToggleBtn.addEventListener("click", () => {
  storeInfoPanel.classList.toggle("hidden");
});

copyCodeBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(currentStore.code);
  alert("คัดลอกรหัสร้านค้าแล้ว: " + currentStore.code);
});

// เปลี่ยนรูปแบบการแสดงสินค้า (1 -> 2 -> 3 -> 1)
viewModeBtn.addEventListener("click", () => {
  viewMode = viewMode >= 3 ? 1 : viewMode + 1;
  viewModeIconLbl.textContent = `📦 ${viewMode}`;
  renderItems(itemsList);
});

searchInput.addEventListener("input", (e) => {
  const keyword = e.target.value.toLowerCase().trim();
  if (!keyword) {
    renderItems(itemsList);
    return;
  }
  const filtered = itemsList.filter(item => 
    (item.name || "").toLowerCase().includes(keyword) ||
    (item.creator || "").toLowerCase().includes(keyword) ||
    (item.customId || "").toLowerCase().includes(keyword)
  );
  renderItems(filtered);
});

function openEditItemModal(item) {
  editingItemId = item.id;
  itemPhotoDataUrl = item.photoURL || null;
  itemNameInput.value = item.name || "";
  itemPriceInput.value = item.price || "";
  currencySelect.value = item.currency || "THB";
  itemIdDisplay.value = item.customId || "";
  itemPhotoPreview.src = item.photoURL || "https://placehold.co/90/d9d9d9/888888?text=pic";
  itemModalError.textContent = "";
  itemModalSubmitBtn.textContent = t("update");

  updateCreatorSelectOptions();
  creatorSelect.value = item.creator;
  itemModal.classList.remove("hidden");
}

// =======================================================
// Render Tier 2 Navbar & Main Items
// =======================================================
function renderTier2Nav() {
  // ลบแท็บ creator เก่าออก เหลือปุ่ม + Item ไว้
  const existingTabs = tier2Nav.querySelectorAll(".creator-tab");
  existingTabs.forEach(el => el.remove());

  creatorsList.forEach(creator => {
    const btn = document.createElement("button");
    btn.className = "tab-item creator-tab";
    btn.textContent = creator;
    btn.addEventListener("click", () => {
      const section = document.getElementById(`creator-sec-${sanitizeId(creator)}`);
      if (section) section.scrollIntoView({ behavior: "smooth" });
    });
    tier2Nav.appendChild(btn);
  });
}

function sanitizeId(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/=/g, "");
}

function renderItems(items) {
  itemMainContainer.innerHTML = "";

  if (creatorsList.length === 0) {
    itemMainContainer.innerHTML = `<div class="empty-text">ยังไม่มี Creator ในร้านค้า กดปุ่ม + Item เพื่อเพิ่มสินค้าและสร้าง Creator แรก</div>`;
    return;
  }

  creatorsList.forEach(creator => {
    const creatorSec = document.createElement("div");
    creatorSec.className = "creator-section";
    creatorSec.id = `creator-sec-${sanitizeId(creator)}`;

    const title = document.createElement("div");
    title.className = "creator-section-title";
    title.innerHTML = `<span>👤 ${escapeHtml(creator)}</span>`;
    creatorSec.appendChild(title);

    const grid = document.createElement("div");
    grid.className = `items-grid mode-${viewMode}`;

    const creatorItems = items.filter(i => i.creator === creator);

    if (creatorItems.length === 0) {
      grid.innerHTML = `<div class="empty-creator">ไม่มีสินค้าในหมวดนี้</div>`;
    } else {
      creatorItems.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.innerHTML = `
          <div class="item-img-container">
            <img class="item-card-img" src="${item.photoURL || 'https://placehold.co/70/d9d9d9/888888?text=pic'}" alt="item" title="คลิกเพื่อแก้ไขสินค้า">
            ${!currentStore.isOpen ? `<div class="delete-item-badge" title="ลบสินค้า">🗑</div>` : ''}
          </div>
          <div class="item-card-info">
            <div class="item-card-name">${escapeHtml(item.name)}</div>
            <div class="item-card-price">${item.price} ${item.currency || 'THB'}</div>
            <div class="item-card-id">ID: ${item.customId || '-'}</div>
          </div>
        `;

        // คลิกที่รูป -> เปิดหน้าต่าง Edit Item
        card.querySelector(".item-card-img").addEventListener("click", () => {
          if (currentStore.isOpen) {
            alert(t("shopIsOpenEditError"));
            return;
          }
          openEditItemModal(item);
        });

        // คลิกไอคอนถังขยะ -> เปิด Popup ยืนยันการลบ
        const deleteBadge = card.querySelector(".delete-item-badge");
        if (deleteBadge) {
          deleteBadge.addEventListener("click", (e) => {
            e.stopPropagation();
            if (currentStore.isOpen) {
              alert(t("shopIsOpenEditError"));
              return;
            }
            promptDeleteItem(item);
          });
        }

        grid.appendChild(card);
      });
    }

    creatorSec.appendChild(grid);
    itemMainContainer.appendChild(creatorSec);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// =======================================================
// Modal: Add Item (+ Item)
// =======================================================
newItemBtn.addEventListener("click", async () => {
  if (currentStore.isOpen) {
    alert(t("shopIsOpenEditError"));
    return;
  }
  editingItemId = null; // โหมดสร้างใหม่
  itemPhotoDataUrl = null;
  itemNameInput.value = "";
  itemPriceInput.value = "";
  itemPhotoPreview.src = "https://placehold.co/90/d9d9d9/888888?text=pic";
  itemModalError.textContent = "";
  itemModalSubmitBtn.textContent = t("create");

  const nextSeq = itemsList.length + 1;
  itemIdDisplay.value = `ITEM-${String(nextSeq).padStart(3, '0')}`;

  updateCreatorSelectOptions();
  itemModal.classList.remove("hidden");
});

function updateCreatorSelectOptions() {
  creatorSelect.innerHTML = "";
  if (creatorsList.length === 0) {
    creatorSelect.innerHTML = `<option value="">-- ยังไม่มี Creator กด + Creator --</option>`;
    return;
  }
  creatorsList.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    creatorSelect.appendChild(opt);
  });
}

itemPhotoEditBtn.addEventListener("click", () => itemPhotoInput.click());
itemPhotoInput.addEventListener("change", async () => {
  const file = itemPhotoInput.files[0];
  if (!file) return;
  try {
    itemPhotoDataUrl = await compressImage(file, 400, 0.7);
    itemPhotoPreview.src = itemPhotoDataUrl;
  } catch (err) {
    itemModalError.textContent = "โหลดรูปไม่สำเร็จ";
  }
});

itemModalCancelBtn.addEventListener("click", () => itemModal.classList.add("hidden"));

itemModalSubmitBtn.addEventListener("click", async () => {
  itemModalError.textContent = "";
  const name = itemNameInput.value.trim();
  const creator = creatorSelect.value;
  const price = parseFloat(itemPriceInput.value);
  const currency = currencySelect.value;

  if (!name) {
    itemModalError.textContent = "กรุณาใส่ชื่อสินค้า";
    return;
  }
  if (!creator) {
    itemModalError.textContent = "กรุณาเลือกหรือเพิ่ม Creator";
    return;
  }
  if (isNaN(price) || price < 0) {
    itemModalError.textContent = "กรุณาใส่ราคาสินค้าให้ถูกต้อง";
    return;
  }

  itemModalSubmitBtn.disabled = true;
  try {
    const itemsRef = collection(db, "stores", storeId, "items");

    if (editingItemId) {
      // โหมดแก้ไขสินค้าเดิม
      await updateDoc(doc(db, "stores", storeId, "items", editingItemId), {
        name,
        creator,
        price,
        currency,
        photoURL: itemPhotoDataUrl || ""
      });
    } else {
      // โหมดสร้างสินค้าใหม่
      const customId = itemIdDisplay.value;
      await addDoc(itemsRef, {
        name,
        creator,
        price,
        currency,
        customId,
        photoURL: itemPhotoDataUrl || "",
        createdAt: serverTimestamp()
      });

      // อัปเดต itemCount ในร้านค้าหลัก
      await updateDoc(doc(db, "stores", storeId), {
        itemCount: itemsList.length + 1
      });
    }

    itemModal.classList.add("hidden");
  } catch (err) {
    itemModalError.textContent = "บันทึกไม่สำเร็จ กรุณาลองใหม่";
    console.error(err);
  } finally {
    itemModalSubmitBtn.disabled = false;
  }
});

// =======================================================
// Modal: Add Creator
// =======================================================
addCreatorPromptBtn.addEventListener("click", () => {
  newCreatorNameInput.value = "";
  creatorModalError.textContent = "";
  creatorModal.classList.remove("hidden");
});

creatorCancelBtn.addEventListener("click", () => creatorModal.classList.add("hidden"));

creatorSubmitBtn.addEventListener("click", async () => {
  creatorModalError.textContent = "";
  const newCreator = newCreatorNameInput.value.trim();
  if (!newCreator) {
    creatorModalError.textContent = "กรุณาใส่ชื่อ Creator";
    return;
  }
  if (creatorsList.includes(newCreator)) {
    creatorModalError.textContent = "มีชื่อ Creator นี้อยู่แล้ว";
    return;
  }

  creatorSubmitBtn.disabled = true;
  try {
    creatorsList.push(newCreator);
    sortCreators();

    await updateDoc(doc(db, "stores", storeId), {
      creators: creatorsList
    });

    renderTier2Nav();
    updateCreatorSelectOptions();
    creatorSelect.value = newCreator; // เลือกอันที่พึ่งเพิ่มให้อัตโนมัติ
    creatorModal.classList.add("hidden");
  } catch (err) {
    creatorModalError.textContent = "บันทึกไม่สำเร็จ กรุณาลองใหม่";
  } finally {
    creatorSubmitBtn.disabled = false;
  }
});

// Helper บีบอัดรูป
function compressImage(file, maxWidth = 400, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
let pendingDeleteItemId = null;
const confirmDeleteItemModal = document.getElementById("confirmDeleteItemModal");
const confirmDeleteItemText = document.getElementById("confirmDeleteItemText");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const okDeleteBtn = document.getElementById("okDeleteBtn");

function promptDeleteItem(item) {
  pendingDeleteItemId = item.id;
  confirmDeleteItemText.textContent = `${t("confirmDeleteItem")} (${item.name})`;
  confirmDeleteItemModal.classList.remove("hidden");
}

cancelDeleteBtn.addEventListener("click", () => {
  confirmDeleteItemModal.classList.add("hidden");
  pendingDeleteItemId = null;
});

okDeleteBtn.addEventListener("click", async () => {
  if (!pendingDeleteItemId) return;
  try {
    // หาข้อมูลสินค้าที่จะลบก่อน เพื่อดูว่าอยู่ creator ไหน
    const itemToDelete = itemsList.find(i => i.id === pendingDeleteItemId);
    
    // ลบสินค้าออกจาก Firestore subcollection
    await deleteDoc(doc(db, "stores", storeId, "items", pendingDeleteItemId));
    
    // อัปเดตจำนวน itemCount ในร้านค้าหลัก
    const newItemsCount = Math.max(0, itemsList.length - 1);
    const updates = { itemCount: newItemsCount };

    // เช็คว่าถ้า Creator นี้ไม่มีสินค้าเหลือแล้ว ให้ลบชื่อ Creator ออกจากร้านด้วยอัตโนมัติ
    if (itemToDelete) {
      const creatorName = itemToDelete.creator;
      // เช็คสินค้าที่เหลือหลังจากตัวนี้ถูกลบ
      const remainingItemsForCreator = itemsList.filter(i => i.creator === creatorName && i.id !== pendingDeleteItemId);
      
      if (remainingItemsForCreator.length === 0) {
        creatorsList = creatorsList.filter(c => c !== creatorName);
        sortCreators();
        updates.creators = creatorsList;
      }
    }

    await updateDoc(doc(db, "stores", storeId), updates);
    
    // รีเฟรชหน้าจอ Tab 2
    renderTier2Nav();
  } catch (err) {
    alert("ลบสินค้าไม่สำเร็จ กรุณาลองใหม่");
    console.error(err);
  }
  pendingDeleteItemId = null;
  confirmDeleteItemModal.classList.add("hidden");
});

// --- PROMOTION SYSTEM ---
let promotionsList = [];

const promoTabBtn = document.getElementById("promoTabBtn");
const promoListModal = document.getElementById("promoListModal");
const promoListContainer = document.getElementById("promoListContainer");
const openCreatePromoBtn = document.getElementById("openCreatePromoBtn");
const closePromoListBtn = document.getElementById("closePromoListBtn");

const createPromoModal = document.getElementById("createPromoModal");
const promoModeSelect = document.getElementById("promoModeSelect");
const cancelCreatePromoBtn = document.getElementById("cancelCreatePromoBtn");
const savePromoBtn = document.getElementById("savePromoBtn");
const createPromoError = document.getElementById("createPromoError");

// Forms
const formModeDiscount = document.getElementById("formModeDiscount");
const formModeSet = document.getElementById("formModeSet");
const formModeBogo = document.getElementById("formModeBogo");

// Mode 1 Elements
const discItemSelect = document.getElementById("discItemSelect");
const discPercentInput = document.getElementById("discPercentInput");
const discAmountInput = document.getElementById("discAmountInput");
const discSummaryPrice = document.getElementById("discSummaryPrice");

// Mode 2 Elements
const setItemsContainer = document.getElementById("setItemsContainer");
const addSetItemRowBtn = document.getElementById("addSetItemRowBtn");
const setNormalTotal = document.getElementById("setNormalTotal");
const setCustomPriceInput = document.getElementById("setCustomPriceInput");
const setDiscountTotal = document.getElementById("setDiscountTotal");

// Mode 3 Elements
const bogoBuyItemSelect = document.getElementById("bogoBuyItemSelect");
const bogoBuyQtyInput = document.getElementById("bogoBuyQtyInput");
const bogoGetItemSelect = document.getElementById("bogoGetItemSelect");
const bogoGetQtyInput = document.getElementById("bogoGetQtyInput");
const bogoTotalPrice = document.getElementById("bogoTotalPrice");

// เปิดหน้าต่างรายการ Promotion
promoTabBtn.addEventListener("click", () => {
  renderPromotionsList();
  promoListModal.classList.remove("hidden");
});

closePromoListBtn.addEventListener("click", () => promoListModal.classList.add("hidden"));
cancelCreatePromoBtn.addEventListener("click", () => createPromoModal.classList.add("hidden"));

openCreatePromoBtn.addEventListener("click", () => {
  promoListModal.classList.add("hidden");
  resetPromoForm();
  populatePromoItemSelects();
  createPromoModal.classList.remove("hidden");
});

promoModeSelect.addEventListener("change", (e) => {
  const mode = e.target.value;
  formModeDiscount.classList.toggle("hidden", mode !== "discount");
  formModeSet.classList.toggle("hidden", mode !== "set");
  formModeBogo.classList.toggle("hidden", mode !== "bogo");
});

function resetPromoForm() {
  promoModeSelect.value = "discount";
  formModeDiscount.classList.remove("hidden");
  formModeSet.classList.add("hidden");
  formModeBogo.classList.add("hidden");
  discPercentInput.value = "";
  discAmountInput.value = "";
  setItemsContainer.innerHTML = "";
  setCustomPriceInput.value = "";
  bogoBuyQtyInput.value = "1";
  bogoGetQtyInput.value = "1";
  createPromoError.textContent = "";
  addSetItemRow(); // เพิ่มแถวแรกให้เซตเริ่มต้น
  updateCalculations();
}

function populatePromoItemSelects() {
  discItemSelect.innerHTML = "";
  bogoBuyItemSelect.innerHTML = "";
  bogoGetItemSelect.innerHTML = "";

  itemsList.forEach(item => {
    const opt1 = new Option(`${item.name} (${item.price} ${item.currency || 'THB'})`, item.id);
    const opt2 = new Option(`${item.name} (${item.price} ${item.currency || 'THB'})`, item.id);
    const opt3 = new Option(`${item.name} (${item.price} ${item.currency || 'THB'})`, item.id);
    discItemSelect.appendChild(opt1);
    bogoBuyItemSelect.appendChild(opt2);
    bogoGetItemSelect.appendChild(opt3);
  });
  updateCalculations();
}

// คำนวณและอัปเดตราคาแบบเรียลไทม์
function updateCalculations() {
  const mode = promoModeSelect.value;
  
  if (mode === "discount") {
    const selectedId = discItemSelect.value;
    const item = itemsList.find(i => i.id === selectedId);
    if (!item) { discSummaryPrice.textContent = "0"; return; }
    
    let price = Number(item.price);
    let pct = Number(discPercentInput.value) || 0;
    let amt = Number(discAmountInput.value) || 0;

    if (pct > 0) {
      price = price - (price * pct / 100);
    } else if (amt > 0) {
      price = Math.max(0, price - amt);
    }
    discSummaryPrice.textContent = price.toFixed(2);
  } 
  else if (mode === "set") {
    let normalSum = 0;
    const rows = setItemsContainer.querySelectorAll(".set-item-row");
    rows.forEach(row => {
      const select = row.querySelector(".set-item-sel");
      const qtyInp = row.querySelector(".set-item-qty");
      const item = itemsList.find(i => i.id === select.value);
      if (item) {
        normalSum += Number(item.price) * (Number(qtyInp.value) || 1);
      }
    });
    setNormalTotal.textContent = normalSum.toFixed(2);
    const setPrice = Number(setCustomPriceInput.value) || 0;
    const diff = Math.max(0, normalSum - setPrice);
    setDiscountTotal.textContent = diff.toFixed(2);
  }
  else if (mode === "bogo") {
    const buyId = bogoBuyItemSelect.value;
    const buyQty = Number(bogoBuyQtyInput.value) || 1;
    const item = itemsList.find(i => i.id === buyId);
    if (!item) { bogoTotalPrice.textContent = "0"; return; }
    const total = Number(item.price) * buyQty;
    bogoTotalPrice.textContent = total.toFixed(2);
  }
}

// อีเวนต์ฟังการเปลี่ยนแปลงเพื่อคำนวณอัติโนมัติ
discItemSelect.addEventListener("change", updateCalculations);
discPercentInput.addEventListener("input", (e) => {
  if (e.target.value) discAmountInput.value = ""; // เคลียร์ช่องจำนวนเต็มถ้ากรอก %
  updateCalculations();
});
discAmountInput.addEventListener("input", (e) => {
  if (e.target.value) discPercentInput.value = ""; // เคลียร์ช่อง % ถ้ากรอกจำนวนเต็ม
  updateCalculations();
});
setCustomPriceInput.addEventListener("input", updateCalculations);
bogoBuyItemSelect.addEventListener("change", updateCalculations);
bogoBuyQtyInput.addEventListener("input", updateCalculations);

// เพิ่มแถวสินค้าในโหมดเซต
function addSetItemRow() {
  const row = document.createElement("div");
  row.className = "set-item-row";
  
  const select = document.createElement("select");
  select.className = "set-item-sel";
  select.style.flex = "2";
  itemsList.forEach(i => select.appendChild(new Option(`${i.name} (${i.price})`, i.id)));
  select.addEventListener("change", updateCalculations);

  const qtyInp = document.createElement("input");
  qtyInp.type = "number";
  qtyInp.className = "set-item-qty";
  qtyInp.value = "1";
  qtyInp.min = "1";
  qtyInp.style.width = "60px";
  qtyInp.addEventListener("input", updateCalculations);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn-small";
  removeBtn.textContent = "✕";
  removeBtn.style.padding = "2px 6px";
  removeBtn.addEventListener("click", () => {
    row.remove();
    updateCalculations();
  });

  row.appendChild(select);
  row.appendChild(qtyInp);
  row.appendChild(removeBtn);
  setItemsContainer.appendChild(row);
  updateCalculations();
}

addSetItemRowBtn.addEventListener("click", addSetItemRow);

// โหลดข้อมูลโปรโมชั่นจากฐานข้อมูล Store (ถ้ามีบันทึกไว้)
async function loadStorePromotions() {
  if (currentStore && currentStore.promotions) {
    promotionsList = currentStore.promotions;
  }
}

// บันทึกโปรโมชั่นลงฐานข้อมูล
savePromoBtn.addEventListener("click", async () => {
  const mode = promoModeSelect.value;
  let newPromo = { id: "PROMO-" + Date.now(), mode };

  if (mode === "discount") {
    const itemId = discItemSelect.value;
    const item = itemsList.find(i => i.id === itemId);
    if (!item) { createPromoError.textContent = "กรุณาเลือกสินค้า"; return; }
    newPromo.itemId = itemId;
    newPromo.itemName = item.name;
    newPromo.percent = Number(discPercentInput.value) || 0;
    newPromo.amount = Number(discAmountInput.value) || 0;
    newPromo.summaryPrice = Number(discSummaryPrice.textContent);
    newPromo.title = `ลดราคา ${item.name} เหลือ ${newPromo.summaryPrice} บาท`;
  } 
  else if (mode === "set") {
    const rows = setItemsContainer.querySelectorAll(".set-item-row");
    if (rows.length === 0) { createPromoError.textContent = "กรุณาเลือกสินค้าเข้าเซตอย่างน้อย 1 ชิ้น"; return; }
    
    let itemsInSet = [];
    rows.forEach(row => {
      const sId = row.querySelector(".set-item-sel").value;
      const q = Number(row.querySelector(".set-item-qty").value) || 1;
      const itm = itemsList.find(i => i.id === sId);
      if (itm) itemsInSet.push({ id: sId, name: itm.name, qty: q, price: itm.price });
    });

    const setPrice = Number(setCustomPriceInput.value);
    if (isNaN(setPrice) || setPrice <= 0) { createPromoError.textContent = "กรุณาใส่ราคาเซตให้ถูกต้อง"; return; }

    newPromo.items = itemsInSet;
    newPromo.normalTotal = Number(setNormalTotal.textContent);
    newPromo.setPrice = setPrice;
    newPromo.title = `เซตสุดคุ้ม (${itemsInSet.map(i=>i.name).join(', ')}) ราคา ${setPrice} บาท`;
  }
  else if (mode === "bogo") {
    const buyId = bogoBuyItemSelect.value;
    const getId = bogoGetItemSelect.value;
    const buyItem = itemsList.find(i => i.id === buyId);
    const getItem = itemsList.find(i => i.id === getId);
    
    newPromo.buyId = buyId;
    newPromo.buyName = buyItem ? buyItem.name : "";
    newPromo.buyQty = Number(bogoBuyQtyInput.value) || 1;
    newPromo.getId = getId;
    newPromo.getName = getItem ? getItem.name : "";
    newPromo.getQty = Number(bogoGetQtyInput.value) || 1;
    newPromo.totalPrice = Number(bogoTotalPrice.textContent);
    newPromo.title = `ซื้อ ${newPromo.buyQty} ${newPromo.buyName} แถม ${newPromo.getQty} ${newPromo.getName}`;
  }

  savePromoBtn.disabled = true;
  try {
    promotionsList.push(newPromo);
    await updateDoc(doc(db, "stores", storeId), {
      promotions: promotionsList
    });
    createPromoModal.classList.add("hidden");
    alert("บันทึกโปรโมชั่นสำเร็จ!");
  } catch (err) {
    createPromoError.textContent = "บันทึกไม่สำเร็จ กรุณาลองใหม่";
    console.error(err);
  } finally {
    savePromoBtn.disabled = false;
  }
});

// แสดงรายการโปรโมชั่นในหน้าต่างจัดการ
function renderPromotionsList() {
  promoListContainer.innerHTML = "";
  if (promotionsList.length === 0) {
    promoListContainer.innerHTML = `<div style="text-align:center; color:#777; padding:16px;">ยังไม่มีโปรโมชั่นในระบบ</div>`;
    return;
  }

  promotionsList.forEach((promo, index) => {
    const card = document.createElement("div");
    card.className = "promo-card-item";
    card.innerHTML = `
      <div class="promo-card-info">
        <div class="promo-card-title">🏷️ ${promo.title}</div>
        <div class="promo-card-desc">ประเภท: ${promo.mode === 'discount' ? 'ลดราคา' : promo.mode === 'set' ? 'ซื้อเป็นเซต' : 'ซื้อ_แถม_'}</div>
      </div>
      <button class="btn-small" style="background:#ffdddd; border-color:#d33; color:#d33;" data-index="${index}">ลบ</button>
    `;

    card.querySelector("button").addEventListener("click", async () => {
      if (confirm("ต้องการลบโปรโมชั่นนี้ใช่ไหม?")) {
        promotionsList.splice(index, 1);
        await updateDoc(doc(db, "stores", storeId), { promotions: promotionsList });
        renderPromotionsList();
      }
    });

    promoListContainer.appendChild(card);
  });
}

// อย่าลืมเรียก loadStorePromotions() ตอนโหลดข้อมูลร้านค้าสำเร็จใน loadStoreData()