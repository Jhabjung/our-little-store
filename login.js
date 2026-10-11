import { auth, db, googleProvider } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const emailInput = document.getElementById("loginEmail");
const passInput = document.getElementById("loginPassword");
const errorMsg = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");
const googleBtn = document.getElementById("googleBtn");

// หลัง login สำเร็จ เช็คว่ามีโปรไฟล์ (username) ใน Firestore หรือยัง
// ถ้ายังไม่มี -> ส่งไปหน้า signup.html เพื่อกรอกโปรไฟล์ต่อ (เช่น Google sign-in ครั้งแรก)
// ถ้ามีแล้ว -> ไปหน้า home.html
async function routeAfterLogin(user) {
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (userDoc.exists() && userDoc.data().username) {
    window.location.href = "home.html";
  } else {
    window.location.href = "signup.html?completeProfile=1";
  }
}

loginBtn.addEventListener("click", async () => {
  errorMsg.textContent = "";
  const email = emailInput.value.trim();
  const password = passInput.value;

  if (!email || !password) {
    errorMsg.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
    return;
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await routeAfterLogin(result.user);
  } catch (err) {
    errorMsg.textContent = mapError(err.code);
  }
});

googleBtn.addEventListener("click", async () => {
  errorMsg.textContent = "";
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await routeAfterLogin(result.user);
  } catch (err) {
    errorMsg.textContent = mapError(err.code);
  }
});

function mapError(code) {
  switch (code) {
    case "auth/invalid-email": return "อีเมลไม่ถูกต้อง";
    case "auth/user-not-found": return "ไม่พบบัญชีนี้";
    case "auth/wrong-password":
    case "auth/invalid-credential": return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    case "auth/popup-closed-by-user": return "ยกเลิกการเข้าสู่ระบบ";
    default: return "เกิดข้อผิดพลาด กรุณาลองใหม่";
  }
}

// กด Enter เพื่อ login ได้
[emailInput, passInput].forEach(el => {
  el.addEventListener("keydown", e => { if (e.key === "Enter") loginBtn.click(); });
});