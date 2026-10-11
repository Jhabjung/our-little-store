import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, collection, addDoc, deleteDoc,
  query, where, onSnapshot, getDocs, serverTimestamp, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { loadAndApplyTheme, applyTheme, saveTheme, PRESET_THEMES } from "./theme.js";
import { setLanguage, getLanguage, t, applyStaticTranslations } from "./lang.js";

let currentUser = null;
let editingStoreId = null;
let pendingDeleteId = null;
let storePhotoDataUrl = null;
let currentTheme = { text: "#1a1a1a", line: "#1a1a1a", base: "#f2f0f6", tabbar: "#cfc0e8" };
let hsvTarget = null; // "text" | "line" | "base" | "tabbar"
let lastMyStores = [];
let lastPartnerStores = [];

// ---------- Elements: topbar ----------
const avatarImg = document.getElementById("avatarImg");
const usernameText = document.getElementById("usernameText");
const profileArea = document.getElementById("profileArea");
const afterSellBtn = document.getElementById("afterSellBtn");

// ---------- Elements: store lists ----------
const myStoreList = document.getElementById("myStoreList");
const myStoreCount = document.getElementById("myStoreCount");
const partnerStoreList = document.getElementById("partnerStoreList");
const addStoreBtn = document.getElementById("addStoreBtn");
const addPartnerBtn = document.getElementById("addPartnerBtn");

// ---------- Elements: store modal ----------
const storeModal = document.getElementById("storeModal");
const storePhotoPreview = document.getElementById("storePhotoPreview");
const storePhotoEditBtn = document.getElementById("storePhotoEditBtn");
const storePhotoInput = document.getElementById("storePhotoInput");
const storeNameInput = document.getElementById("storeNameInput");
const storeCodeDisplay = document.getElementById("storeCodeDisplay");
const storeModalError = document.getElementById("storeModalError");
const storeModalCancelBtn = document.getElementById("storeModalCancelBtn");
const storeModalSubmitBtn = document.getElementById("storeModalSubmitBtn");

// ---------- Elements: partner modal ----------
const partnerModal = document.getElementById("partnerModal");
const partnerCodeInput = document.getElementById("partnerCodeInput");
const partnerModalError = document.getElementById("partnerModalError");
const partnerModalCancelBtn = document.getElementById("partnerModalCancelBtn");
const partnerModalSubmitBtn = document.getElementById("partnerModalSubmitBtn");

// ---------- Elements: confirm delete ----------
const confirmModal = document.getElementById("confirmModal");
const confirmText = document.getElementById("confirmText");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmOkBtn = document.getElementById("confirmOkBtn");

// ---------- Elements: profile modal ----------
const profileInfoModal = document.getElementById("profileInfoModal");
const profileAvatarPreview = document.getElementById("profileAvatarPreview");
const profileAvatarEditBtn = document.getElementById("profileAvatarEditBtn");
const profileAvatarInput = document.getElementById("profileAvatarInput");
const profileUsernameInput = document.getElementById("profileUsernameInput");
const usernameEditBtn = document.getElementById("usernameEditBtn");
const usernameConfirmBtn = document.getElementById("usernameConfirmBtn");
const usernameError = document.getElementById("usernameError");
const profileEmailText = document.getElementById("profileEmailText");
const langSelect = document.getElementById("langSelect");
const swatchText = document.getElementById("swatchText");
const swatchLine = document.getElementById("swatchLine");
const swatchBase = document.getElementById("swatchBase");
const swatchTabbar = document.getElementById("swatchTabbar");
const presetLightBtn = document.getElementById("presetLightBtn");
const presetDarkBtn = document.getElementById("presetDarkBtn");
const profileLogoutBtn = document.getElementById("profileLogoutBtn");
const profileCloseBtn = document.getElementById("profileCloseBtn");

// ---------- Elements: hsv modal ----------
const hsvModal = document.getElementById("hsvModal");
const hsvPreview = document.getElementById("hsvPreview");
const hueSlider = document.getElementById("hueSlider");
const satSlider = document.getElementById("satSlider");
const valSlider = document.getElementById("valSlider");
const hsvCancelBtn = document.getElementById("hsvCancelBtn");
const hsvConfirmBtn = document.getElementById("hsvConfirmBtn");

// =======================================================
// Auth guard + initial load
// =======================================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  const profileData = await loadUserProfile(user.uid);

  setLanguage((profileData && profileData.language) || "th");
  langSelect.value = getLanguage();

  currentTheme = await loadAndApplyTheme(user.uid);
  updateSwatches();

  listenMyStores(user.uid);
  listenPartnerStores(user.uid);
});

async function loadUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) {
    const data = snap.data();
    usernameText.textContent = data.username || "Username";
    profileUsernameInput.value = data.username || "";
    profileEmailText.textContent = data.email || "";
    if (data.photoURL) {
      avatarImg.src = data.photoURL;
      profileAvatarPreview.src = data.photoURL;
    }
    return data;
  }
  return null;
}


// =======================================================
// Profile modal open/close
// =======================================================
profileArea.addEventListener("click", () => {
  profileInfoModal.classList.remove("hidden");
});

profileCloseBtn.addEventListener("click", () => {
  profileInfoModal.classList.add("hidden");
});

profileLogoutBtn.addEventListener("click", async () => {
  if (confirm(t("confirmLogoutMsg"))) {
    await signOut(auth);
    window.location.href = "index.html";
  }
});

// ---------- Avatar change (saves immediately) ----------
profileAvatarEditBtn.addEventListener("click", () => profileAvatarInput.click());

profileAvatarInput.addEventListener("change", async () => {
  const file = profileAvatarInput.files[0];
  if (!file) return;
  try {
    const compressed = await compressImage(file, 300, 0.7);
    profileAvatarPreview.src = compressed;
    avatarImg.src = compressed;
    await setDoc(doc(db, "users", currentUser.uid), { photoURL: compressed }, { merge: true });
    await updateProfile(currentUser, { photoURL: compressed });
  } catch (err) {
    alert(t("changePhotoFailed"));
    console.error(err);
  }
});

// ---------- Username edit ----------
usernameEditBtn.addEventListener("click", () => {
  profileUsernameInput.disabled = false;
  profileUsernameInput.focus();
  usernameEditBtn.classList.add("hidden");
  usernameConfirmBtn.classList.remove("hidden");
});

usernameConfirmBtn.addEventListener("click", async () => {
  usernameError.textContent = "";
  const newName = profileUsernameInput.value.trim();
  if (!newName) {
    usernameError.textContent = t("pleaseEnterUsername");
    return;
  }
  try {
    await setDoc(doc(db, "users", currentUser.uid), { username: newName }, { merge: true });
    await updateProfile(currentUser, { displayName: newName });
    usernameText.textContent = newName;
    profileUsernameInput.disabled = true;
    usernameConfirmBtn.classList.add("hidden");
    usernameEditBtn.classList.remove("hidden");
  } catch (err) {
    usernameError.textContent = t("saveFailed");
    console.error(err);
  }
});

// ---------- Language ----------
langSelect.addEventListener("change", async () => {
  setLanguage(langSelect.value);
  renderMyStores(lastMyStores);
  renderPartnerStores(lastPartnerStores);
  try {
    await setDoc(doc(db, "users", currentUser.uid), { language: langSelect.value }, { merge: true });
  } catch (err) {
    console.error(err);
  }
});

// =======================================================
// Theme color swatches -> open HSV picker
// =======================================================
function updateSwatches() {
  swatchText.style.background = currentTheme.text;
  swatchLine.style.background = currentTheme.line;
  swatchBase.style.background = currentTheme.base;
  swatchTabbar.style.background = currentTheme.tabbar;
  updatePresetActiveState();
}

function themesEqual(a, b) {
  return a.text === b.text && a.line === b.line && a.base === b.base && a.tabbar === b.tabbar;
}

function updatePresetActiveState() {
  presetLightBtn.classList.toggle("active", themesEqual(currentTheme, PRESET_THEMES.light));
  presetDarkBtn.classList.toggle("active", themesEqual(currentTheme, PRESET_THEMES.dark));
}

swatchText.addEventListener("click", () => openHsvPicker("text"));
swatchLine.addEventListener("click", () => openHsvPicker("line"));
swatchBase.addEventListener("click", () => openHsvPicker("base"));
swatchTabbar.addEventListener("click", () => openHsvPicker("tabbar"));

presetLightBtn.addEventListener("click", () => applyPresetTheme("light"));
presetDarkBtn.addEventListener("click", () => applyPresetTheme("dark"));

async function applyPresetTheme(name) {
  currentTheme = { ...PRESET_THEMES[name] };
  applyTheme(currentTheme);
  updateSwatches();
  try {
    await saveTheme(currentUser.uid, currentTheme);
  } catch (err) {
    console.error(err);
  }
}

function openHsvPicker(target) {
  hsvTarget = target;
  const hex = currentTheme[target];
  const { h, s, v } = hexToHsv(hex);
  hueSlider.value = h;
  satSlider.value = s;
  valSlider.value = v;
  updateSliderGradients();
  updateHsvPreviewBox();
  hsvModal.classList.remove("hidden");
}

[hueSlider, satSlider, valSlider].forEach(slider => {
  slider.addEventListener("input", () => {
    updateSliderGradients();
    updateHsvPreviewBox();
  });
});

// อัปเดต gradient ของแถบ Saturation และ Brightness ให้เปลี่ยนตาม Hue/ค่าปัจจุบัน (คล้าย ibisPaint)
function updateSliderGradients() {
  const h = Number(hueSlider.value);
  const s = Number(satSlider.value);
  const v = Number(valSlider.value);

  const satLow = hsvToHex(h, 0, v);
  const satHigh = hsvToHex(h, 100, v);
  satSlider.style.background = `linear-gradient(to right, ${satLow}, ${satHigh})`;

  const valLow = hsvToHex(h, s, 0);
  const valHigh = hsvToHex(h, s, 100);
  valSlider.style.background = `linear-gradient(to right, ${valLow}, ${valHigh})`;
}

function updateHsvPreviewBox() {
  const hex = hsvToHex(Number(hueSlider.value), Number(satSlider.value), Number(valSlider.value));
  hsvPreview.style.background = hex;
}

hsvCancelBtn.addEventListener("click", () => {
  hsvModal.classList.add("hidden");
  hsvTarget = null;
});

hsvConfirmBtn.addEventListener("click", async () => {
  if (!hsvTarget) return;
  const hex = hsvToHex(Number(hueSlider.value), Number(satSlider.value), Number(valSlider.value));
  currentTheme = { ...currentTheme, [hsvTarget]: hex };
  applyTheme(currentTheme);
  updateSwatches();
  try {
    await saveTheme(currentUser.uid, currentTheme);
  } catch (err) {
    console.error(err);
  }
  hsvModal.classList.add("hidden");
  hsvTarget = null;
});

// ---------- HSV <-> Hex conversion ----------
function hsvToHex(h, s, v) {
  s /= 100; v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(v * 100) };
}

// =======================================================
// Image compression helper
// =======================================================
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

// =======================================================
// Realtime store listeners
// =======================================================
function listenMyStores(uid) {
  const q = query(collection(db, "stores"), where("ownerUid", "==", uid));
  onSnapshot(q, (snapshot) => {
    const stores = [];
    snapshot.forEach(d => stores.push({ id: d.id, ...d.data() }));
    lastMyStores = stores;
    renderMyStores(stores);
  });
}

function listenPartnerStores(uid) {
  const q = query(collection(db, "stores"), where("partners", "array-contains", uid));
  onSnapshot(q, (snapshot) => {
    const stores = [];
    snapshot.forEach(d => stores.push({ id: d.id, ...d.data() }));
    lastPartnerStores = stores;
    renderPartnerStores(stores);
  });
}

function renderMyStores(stores) {
  myStoreCount.textContent = `${stores.length} / 3`;
  addStoreBtn.style.display = stores.length >= 3 ? "none" : "flex";
  if (stores.length === 0) {
    myStoreList.innerHTML = `<div class="empty-text">${t("noStore")}</div>`;
    return;
  }
  myStoreList.innerHTML = "";
  stores.forEach(store => myStoreList.appendChild(buildStoreCard(store, true)));
}

function renderPartnerStores(stores) {
  if (stores.length === 0) {
    partnerStoreList.innerHTML = `<div class="empty-text">${t("noPartnerStore")}</div>`;
    return;
  }
  partnerStoreList.innerHTML = "";
  stores.forEach(store => partnerStoreList.appendChild(buildStoreCard(store, false)));
}

function buildStoreCard(store, isOwner) {
  const card = document.createElement("div");
  card.className = "store-card";
  
  const isOpen = store.isOpen || false;
  const btnText = isOpen ? "🟢 เริ่มขายของ" : "🟢 เปิดร้าน";
  const btnStyle = isOpen ? 'background:#d33; border-color:#d33; color:#fff;' : '';

  card.innerHTML = `
    <img class="store-photo" src="${store.photoURL || 'https://placeholder.co/80/d9d9d9/888888?text=pic'}" alt="shop">
    <div class="store-info">
      <div class="store-name">${escapeHtml(store.name || "Shop name")}</div>
      <div class="store-sub">Items in shop : ${store.itemCount || 0}</div>
      <div class="store-sub">ID: ${store.code || "------"}</div>
      <div class="store-actions">
        <button class="btn-small edit-btn">${t("edit")}</button>
        ${isOwner ? `<button class="btn-small filled open-btn" style="${btnStyle}">${btnText}</button>` : ""}
        ${isOwner && isOpen ? `<button class="btn-small close-store-btn" style="background:#666; color:#fff; border-color:#666;">ปิดร้าน</button>` : ""}
        <button class="btn-small after-sell-btn" style="background:#e8f4fd; border-color:#2196F3; color:#1976D2;">After Sell</button>
        </div>
    </div>
    ${isOwner ? `<button class="menu-dots">⋮</button>
    <div class="card-menu hidden">
      <button class="menu-edit-info">⚙ ${t("editStoreInfo")}</button>
      <button class="menu-delete danger">🗑 ${t("deleteStore")}</button>
    </div>` : ""}
  `;
  card.querySelector(".after-sell-btn").addEventListener("click", () => {
    window.location.href = `aftersell.html?storeId=${store.id}`;
  });
  // ปุ่มแก้ไขสินค้า (ไปหน้า item.html)
  card.querySelector(".edit-btn").addEventListener("click", () => {
    window.location.href = `item.html?storeId=${store.id}`;
  });

  if (isOwner) {
    // ปุ่มเปิดร้าน / เริ่มขายของ
    card.querySelector(".open-btn").addEventListener("click", async () => {
      if (!store.isOpen) {
        try {
          await updateDoc(doc(db, "stores", store.id), { isOpen: true });
          window.location.href = `sell.html?storeId=${store.id}`;
        } catch (err) {
          console.error("Error opening store: ", err);
          alert("ไม่สามารถเปิดร้านได้ กรุณาลองใหม่อีกครั้ง");
        }
      } else {
        window.location.href = `sell.html?storeId=${store.id}`;
      }
    });

    // ปุ่มปิดร้าน (จะแสดงก็ต่อเมื่อร้านเปิดอยู่)
    const closeBtn = card.querySelector(".close-store-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm("ต้องการปิดร้านใช่ไหม?")) {
          await updateDoc(doc(db, "stores", store.id), { isOpen: false });
        }
      });
    }

    const menuDots = card.querySelector(".menu-dots");
    const cardMenu = card.querySelector(".card-menu");
    menuDots.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".card-menu").forEach(m => { if (m !== cardMenu) m.classList.add("hidden"); });
      cardMenu.classList.toggle("hidden");
    });
    
    card.querySelector(".menu-edit-info").addEventListener("click", () => {
      cardMenu.classList.add("hidden");
      openEditStoreModal(store);
    });
    
    card.querySelector(".menu-delete").addEventListener("click", () => {
      cardMenu.classList.add("hidden");
      pendingDeleteId = store.id;
      confirmText.textContent = `${t("confirmDeleteStorePrefix")} "${store.name}" ${t("confirmDeleteStoreSuffix")}`;
      confirmModal.classList.remove("hidden");
    });
  }
  return card;
}


function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// วางฟังก์ชันนี้ไว้ที่ไหนก็ได้ในไฟล์ home.js (นอก loop)
function renderStoreActionButtons(store, openBtn, closeBtn) {
  if (store.isOpen) {
    openBtn.textContent = "🟢 เริ่มขายของ";
    openBtn.classList.add("store-is-open");
    closeBtn.classList.remove("hidden");
  } else {
    openBtn.textContent = "🟢 เปิดร้าน";
    openBtn.classList.remove("store-is-open");
    closeBtn.classList.add("hidden");
  }
}



// =======================================================
// Create / Edit store modal
// =======================================================
addStoreBtn.addEventListener("click", () => openCreateStoreModal());

function openCreateStoreModal() {
  editingStoreId = null;
  storePhotoDataUrl = null;
  storeNameInput.value = "";
  storeCodeDisplay.value = t("willBeGeneratedAfterSubmit");
  storePhotoPreview.src = "https://via.placeholder.com/90/d9d9d9/888888?text=pic";
  storeModalError.textContent = "";
  storeModalSubmitBtn.textContent = t("create");
  storeModal.classList.remove("hidden");
}

function openEditStoreModal(store) {
  editingStoreId = store.id;
  storePhotoDataUrl = store.photoURL || null;
  storeNameInput.value = store.name || "";
  storeCodeDisplay.value = store.code || "";
  storePhotoPreview.src = store.photoURL || "https://via.placeholder.com/90/d9d9d9/888888?text=pic";
  storeModalError.textContent = "";
  storeModalSubmitBtn.textContent = t("save");
  storeModal.classList.remove("hidden");
}

storePhotoEditBtn.addEventListener("click", () => storePhotoInput.click());
storePhotoInput.addEventListener("change", async () => {
  const file = storePhotoInput.files[0];
  if (!file) return;
  try {
    const compressed = await compressImage(file, 400, 0.7);
    storePhotoDataUrl = compressed;
    storePhotoPreview.src = compressed;
  } catch (err) {
    storeModalError.textContent = t("loadPhotoFailed");
    console.error(err);
  }
});

storeModalCancelBtn.addEventListener("click", () => storeModal.classList.add("hidden"));

storeModalSubmitBtn.addEventListener("click", async () => {
  storeModalError.textContent = "";
  const name = storeNameInput.value.trim();
  if (!name) {
    storeModalError.textContent = t("pleaseEnterStoreName");
    return;
  }
  storeModalSubmitBtn.disabled = true;
  try {
    if (editingStoreId) {
      await updateDoc(doc(db, "stores", editingStoreId), {
        name,
        photoURL: storePhotoDataUrl || ""
      });
    } else {
      const q = query(collection(db, "stores"), where("ownerUid", "==", currentUser.uid));
      const existing = await getDocs(q);
      if (existing.size >= 3) {
        storeModalError.textContent = t("maxStoreReached");
        storeModalSubmitBtn.disabled = false;
        return;
      }
      const code = await generateUniqueStoreCode();
      await addDoc(collection(db, "stores"), {
        name,
        photoURL: storePhotoDataUrl || "",
        code,
        ownerUid: currentUser.uid,
        itemCount: 0,
        isOpen: false,
        partners: [],
        createdAt: serverTimestamp()
      });
    }
    storeModal.classList.add("hidden");
  } catch (err) {
    storeModalError.textContent = t("genericError");
    console.error(err);
  } finally {
    storeModalSubmitBtn.disabled = false;
  }
});

async function generateUniqueStoreCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    const q = query(collection(db, "stores"), where("code", "==", code));
    const snap = await getDocs(q);
    if (snap.empty) return code;
  }
  throw new Error("Could not generate unique store code");
}

// =======================================================
// Delete confirm
// =======================================================
confirmCancelBtn.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
  pendingDeleteId = null;
});

confirmOkBtn.addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  try {
    await deleteDoc(doc(db, "stores", pendingDeleteId));
  } catch (err) {
    alert(t("deleteFailed"));
    console.error(err);
  }
  pendingDeleteId = null;
  confirmModal.classList.add("hidden");
});

// =======================================================
// Add partner store
// =======================================================
addPartnerBtn.addEventListener("click", () => {
  partnerCodeInput.value = "";
  partnerModalError.textContent = "";
  partnerModal.classList.remove("hidden");
});

partnerModalCancelBtn.addEventListener("click", () => partnerModal.classList.add("hidden"));

partnerModalSubmitBtn.addEventListener("click", async () => {
  partnerModalError.textContent = "";
  const code = partnerCodeInput.value.trim().toUpperCase();
  if (!code) {
    partnerModalError.textContent = t("pleaseEnterCode");
    return;
  }
  partnerModalSubmitBtn.disabled = true;
  try {
    const q = query(collection(db, "stores"), where("code", "==", code));
    const snap = await getDocs(q);
    if (snap.empty) {
      partnerModalError.textContent = t("invalidCode");
      return;
    }
    const storeDoc = snap.docs[0];
    const storeData = storeDoc.data();
    if (storeData.ownerUid === currentUser.uid) {
      partnerModalError.textContent = t("ownStoreError");
      return;
    }
    if ((storeData.partners || []).includes(currentUser.uid)) {
      partnerModalError.textContent = t("alreadyPartnerError");
      return;
    }
    await updateDoc(doc(db, "stores", storeDoc.id), {
      partners: arrayUnion(currentUser.uid)
    });
    partnerModal.classList.add("hidden");
  } catch (err) {
    partnerModalError.textContent = t("genericError");
    console.error(err);
  } finally {
    partnerModalSubmitBtn.disabled = false;
  }
});

// ตัวอย่างเมื่อกดปุ่ม "เปิดร้าน"
function openShop(storeId) {
    database.ref('shops/' + storeId).update({
        isOpen: true
    }).then(() => {
        // บันทึกสถานะเสร็จ กระโดดไปหน้า sell.html ทันที
        window.location.href = `sell.html?storeId=${storeId}`;
    });
}

// ตัวอย่างเมื่อกดปุ่ม "ปิดร้าน"
function closeShop(storeId) {
    database.ref('shops/' + storeId).update({
        isOpen: false
    }).then(() => {
        alert("ปิดร้านเรียบร้อยแล้ว ทุกคนจะไม่สามารถขายสินค้าได้");
    });
}


if (afterSellBtn) {
  afterSellBtn.addEventListener("click", () => {
    // เช็คว่ามีร้านล่าสุดร้านไหนไหม ถ้ามีให้พุ่งไปร้านแรกสุดก่อน
    if (lastMyStores && lastMyStores.length > 0) {
      const firstStoreId = lastMyStores[0].id;
      window.location.href = `aftersell.html?storeId=${firstStoreId}`;
    } else {
      alert("คุณยังไม่มีร้านค้า กรุณา ➕ สร้างร้านค้าก่อน");
    }
  });
}