import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, getDocs, addDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { loadAndApplyTheme } from "./theme.js";

loadAndApplyTheme();
// เช็กสถานะผู้ใช้ก่อน เพื่อเอา uid ไปใช้โหลดธีมและข้อมูล
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ส่ง user.uid (หรือรหัสร้าน) เข้าไปใน loadAndApplyTheme
        await loadAndApplyTheme(user.uid);
        
        // ฟังก์ชันหรือโค้ดส่วนอื่นๆ สำหรับโหลดรูปร้านในหน้า aftersell ต่อตรงนี้
    } else {
        window.location.href = "index.html";
    }
});
const urlParams = new URLSearchParams(window.location.search);
const storeId = urlParams.get("storeId");

if (!storeId) {
  alert("ไม่พบร้านค้าที่ระบุ");
  window.location.href = "home.html";
}

const backToSellBtn = document.getElementById("backToSellBtn");
const storeCoverImg = document.getElementById("storeCoverImg");
const storeNameTitle = document.getElementById("storeNameTitle");
const creatorSummaryBody = document.getElementById("creatorSummaryBody");
const salesListContainer = document.getElementById("salesListContainer");

const receiptDetailModal = document.getElementById("receiptDetailModal");
const receiptDetailBody = document.getElementById("receiptDetailBody");
const closeReceiptDetailBtn = document.getElementById("closeReceiptDetailBtn");

backToSellBtn.addEventListener("click", () => window.location.href = `sell.html?storeId=${storeId}`);
closeReceiptDetailBtn.addEventListener("click", () => receiptDetailModal.classList.add("hidden"));

async function init() {
  const storeSnap = await getDoc(doc(db, "stores", storeId));
  if (storeSnap.exists()) {
    const store = storeSnap.data();
    storeNameTitle.textContent = store.name || "ร้านค้า";
    storeCoverImg.src = store.coverImage || store.logoUrl || store.photoURL || "";

  }

  const salesSnap = await getDocs(query(collection(db, "stores", storeId, "sales"), orderBy("timestamp", "desc")));
  const sales = [];
  salesSnap.forEach(d => sales.push({ id: d.id, ...d.data() }));

  renderCreatorSummary(sales);
  renderSalesList(sales);
}

function renderCreatorSummary(sales) {
  const summary = {}; // { creator: { qty, revenue } }
  sales.forEach(sale => {
    (sale.items || []).forEach(li => {
      if (!summary[li.creator]) summary[li.creator] = { qty: 0, revenue: 0 };
      summary[li.creator].qty += li.qty;
      summary[li.creator].revenue += li.revenue;
    });
  });

  creatorSummaryBody.innerHTML = "";
  const creators = Object.keys(summary);
  if (creators.length === 0) {
    creatorSummaryBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#888;">ยังไม่มีข้อมูลการขาย</td></tr>`;
    return;
  }
  creators.sort((a,b) => summary[b].revenue - summary[a].revenue).forEach(creator => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${escapeHtml(creator)}</td><td>${summary[creator].qty}</td><td>${summary[creator].revenue.toFixed(2)} บาท</td>`;
    creatorSummaryBody.appendChild(row);
  });
}

function renderSalesList(sales) {
  salesListContainer.innerHTML = "";
  if (sales.length === 0) {
    salesListContainer.innerHTML = `<div style="text-align:center; color:#888; padding:20px;">ยังไม่มีประวัติการขาย</div>`;
    return;
  }

  sales.forEach(sale => {
    const card = document.createElement("div");
    card.className = "sale-card";
    card.innerHTML = `
      <div class="sale-card-info">
        <div class="date-time">📅 ${sale.date} ⏰ ${sale.time}</div>
        <div>การจ่าย: ${sale.paymentMethod === 'cash' ? '💵 เงินสด' : '📱 โอนเงิน'} | โปรโมชั่น: ${sale.promoInfo}</div>
        <div class="revenue">รวม ${sale.totalRevenue.toFixed(2)} บาท</div>
      </div>
    `;
    const viewBtn = document.createElement("button");
    viewBtn.className = "btn-small filled";
    viewBtn.textContent = "ดูรายการสินค้า";
    viewBtn.addEventListener("click", () => showReceiptDetail(sale));
    card.appendChild(viewBtn);
    salesListContainer.appendChild(card);
  });
}

function showReceiptDetail(sale) {
  receiptDetailBody.innerHTML = "";
  (sale.items || []).forEach(li => {
    const row = document.createElement("tr");
    const slipCell = sale.slipURL
      ? `<img src="${sale.slipURL}" class="slip-thumb" onclick="window.open('${sale.slipURL}')">`
      : "-";
    row.innerHTML = `
      <td>${sale.date}</td>
      <td>${sale.time}</td>
      <td>${escapeHtml(li.name)}</td>
      <td>${escapeHtml(li.creator)}</td>
      <td>${li.qty}</td>
      <td>${li.revenue.toFixed(2)}</td>
      <td>${sale.paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'}</td>
      <td>${slipCell}</td>
    `;
    receiptDetailBody.appendChild(row);
  });
  receiptDetailModal.classList.remove("hidden");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

init();