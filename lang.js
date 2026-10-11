// lang.js — ระบบแปลภาษาพื้นฐานของเว็บ (ไม่รวมเนื้อหาภายในร้านค้า)

export const translations = {
  th: {
    myStore: "ร้านของฉัน",
    partnersStore: "ร้านพาร์ทเนอร์",
    afterSell: "หลังการขาย",
    noStore: "ไม่มีร้านค้า",
    noPartnerStore: "ไม่มีร้านพาร์ทเนอร์",
    edit: "แก้ไข",
    openShop: "เปิดร้าน",
    opened: "เปิดขายอยู่",
    editStoreInfo: "แก้ไขข้อมูลร้านค้า",
    deleteStore: "ลบร้านค้า",
    storeNamePlaceholder: "ชื่อร้านค้า",
    randomStoreIdPlaceholder: "รหัสร้านสุ่ม",
    willBeGeneratedAfterSubmit: "จะสุ่มให้หลังกด Submit",
    storeIdNote: "รหัสร้านสุ่ม ไม่สามารถเปลี่ยนได้",
    cancel: "ยกเลิก",
    submit: "ยืนยัน",
    create: "สร้าง",
    save: "บันทึก",
    partnersStoreId: "รหัสร้านพาร์ทเนอร์",
    confirm: "ยืนยัน",
    language: "ภาษา",
    colorTheme: "ธีมสี",
    lightTheme: "ธีมสว่าง",
    darkTheme: "ธีมมืด",
    textColor: "สีตัวอักษร",
    lineColor: "สีเส้นกรอบ",
    baseColor: "สีพื้นหลัง",
    tabbarColor: "สี Tab bar",
    logout: "ออกจากระบบ",
    close: "ปิด",
    hue: "เฉดสี (Hue)",
    saturation: "ความอิ่มสี (Saturation)",
    brightness: "ความสว่าง (Brightness)",
    confirmLogoutMsg: "ต้องการออกจากระบบจริงๆ ใช่ไหม?",
    pleaseEnterStoreName: "กรุณาใส่ชื่อร้านค้า",
    maxStoreReached: "สร้างร้านค้าได้สูงสุด 3 ร้านเท่านั้น",
    genericError: "เกิดข้อผิดพลาด กรุณาลองใหม่",
    confirmDeleteStorePrefix: "ต้องการลบร้าน",
    confirmDeleteStoreSuffix: "จริงๆ ใช่ไหม? (ไม่สามารถกู้คืนได้)",
    confirmOpenShop: "เปิดร้านแล้วจะไม่สามารถแก้ไขสินค้าได้จนกว่าจะปิดร้าน ต้องการเปิดร้านหรือไม่?",
    alreadyOpen: "ร้านนี้เปิดขายอยู่แล้ว",
    openSuccess: "เปิดร้านเรียบร้อย (หน้าขายของจะพัฒนาในขั้นตอนถัดไป)",
    pleaseEnterCode: "กรุณาใส่รหัสร้านค้า",
    invalidCode: "ไม่ถูกต้อง / ไม่มีร้านค้านี้อยู่",
    ownStoreError: "นี่คือร้านค้าของคุณเองอยู่แล้ว",
    alreadyPartnerError: "คุณอยู่ในร้านค้านี้อยู่แล้ว",
    pleaseEnterUsername: "กรุณาใส่ชื่อแอคเคานต์",
    afterSellAlert: "หน้า After sell จะพัฒนาในขั้นตอนถัดไปครับ",
    saveFailed: "บันทึกไม่สำเร็จ กรุณาลองใหม่",
    deleteFailed: "ลบร้านค้าไม่สำเร็จ กรุณาลองใหม่",
    changePhotoFailed: "เปลี่ยนรูปไม่สำเร็จ กรุณาลองใหม่",
    loadPhotoFailed: "โหลดรูปไม่สำเร็จ กรุณาลองใหม่",
    closed: "ปิดร้าน",
    closeShop: "ปิดร้านค้า",
    confirmCloseShop: "ต้องการปิดร้านเพื่อกลับมาแก้ไขสินค้าใช่ไหม?",
    closeSuccess: "ปิดร้านเรียบร้อย สามารถแก้ไขสินค้าได้แล้ว",
    editItem: "แก้ไขสินค้า",
    update: "บันทึกการแก้ไข",
    deleteItem: "ลบสินค้า",
    confirmDeleteItem: "ต้องการลบสินค้านี้จริงๆ ใช่ไหม? (ไม่สามารถกู้คืนได้)",
    shopIsOpenEditError: "ร้านค้านี้เปิดขายอยู่ ไม่สามารถเพิ่ม/แก้ไขหรือลบสินค้าได้"
  },
  en: {
    myStore: "My store",
    partnersStore: "Partners store",
    afterSell: "After sell",
    noStore: "No Store",
    noPartnerStore: "No Partner store",
    edit: "Edit",
    openShop: "Open shop",
    opened: "Opened",
    editStoreInfo: "Edit store info",
    deleteStore: "Delete store",
    storeNamePlaceholder: "Store name",
    randomStoreIdPlaceholder: "Random store ID",
    willBeGeneratedAfterSubmit: "Will be generated after submit",
    storeIdNote: "Random store ID can't change",
    cancel: "Cancel",
    submit: "Submit",
    create: "Create",
    save: "Save",
    partnersStoreId: "Partners store ID",
    confirm: "Confirm",
    language: "Language",
    colorTheme: "Color theme",
    lightTheme: "Light theme",
    darkTheme: "Dark theme",
    textColor: "Text color",
    lineColor: "Line color",
    baseColor: "Background color",
    tabbarColor: "Tab bar color",
    logout: "Log out",
    close: "Close",
    hue: "Hue",
    saturation: "Saturation",
    brightness: "Brightness",
    confirmLogoutMsg: "Are you sure you want to log out?",
    pleaseEnterStoreName: "Please enter a store name",
    maxStoreReached: "You can create up to 3 stores only",
    genericError: "Something went wrong, please try again",
    confirmDeleteStorePrefix: "Do you want to delete",
    confirmDeleteStoreSuffix: "? (This cannot be undone)",
    confirmOpenShop: "Once opened, you won't be able to edit items until the shop is closed. Open the shop now?",
    alreadyOpen: "This shop is already open",
    openSuccess: "Shop opened successfully (selling page coming soon)",
    pleaseEnterCode: "Please enter a store code",
    invalidCode: "Invalid / store not found",
    ownStoreError: "This is already your own store",
    alreadyPartnerError: "You are already part of this store",
    pleaseEnterUsername: "Please enter a username",
    afterSellAlert: "The After sell page will be developed next.",
    saveFailed: "Save failed, please try again",
    deleteFailed: "Delete failed, please try again",
    changePhotoFailed: "Could not change photo, please try again",
    loadPhotoFailed: "Could not load photo, please try again",
    closed: "Closed",
    closeShop: "Close shop",
    confirmCloseShop: "Do you want to close the shop to edit items?",
    closeSuccess: "Shop closed. You can now edit items.",
    editItem: "Edit Item",
    update: "Update",
    deleteItem: "Delete Item",
    confirmDeleteItem: "Do you want to delete this item? (This cannot be undone)",
    shopIsOpenEditError: "Shop is currently open. You cannot modify items."
  }
};

let currentLang = "th";

export function setLanguage(lang) {
  currentLang = translations[lang] ? lang : "th";
  applyStaticTranslations();
}

export function getLanguage() {
  return currentLang;
}

export function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) || key;
}

export function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.placeholder = t(key);
  });
}