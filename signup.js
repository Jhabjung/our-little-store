import { auth, db, googleProvider } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const emailInput = document.getElementById("suEmail");
const passInput = document.getElementById("suPassword");
const errorMsg = document.getElementById("suError");
const suBtn = document.getElementById("suBtn");
const suGoogleBtn = document.getElementById("suGoogleBtn");

const profileModal = document.getElementById("profileModal");
const avatarPreview = document.getElementById("avatarPreview");
const avatarEditBtn = document.getElementById("avatarEditBtn");
const avatarInput = document.getElementById("avatarInput");
const usernameInput = document.getElementById("usernameInput");
const profileError = document.getElementById("profileError");
const profileSubmitBtn = document.getElementById("profileSubmitBtn");

let currentUser = null;
let avatarDataUrl = null;

// ถ้ามาจาก login.js ด้วย ?completeProfile=1 (เช่น Google sign-in ครั้งแรกที่ยังไม่มี username)
const params = new URLSearchParams(window.location.search);

suBtn.addEventListener("click", async () => {
  errorMsg.textContent = "";
  const email = emailInput.value.trim();
  const password = passInput.value;

  if (!email || !password) {
    errorMsg.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
    return;
  }
  if (password.length < 6) {
    errorMsg.textContent = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    return;
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = result.user;
    openProfileModal();
  } catch (err) {
    errorMsg.textContent = mapError(err.code);
  }
});

suGoogleBtn.addEventListener("click", async () => {
  errorMsg.textContent = "";
  try {
    const result = await signInWithPopup(auth, googleProvider);
    currentUser = result.user;

    // เช็คว่าเคยมีโปรไฟล์แล้วหรือยัง (Google account เก่าที่เคยสมัคร)
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists() && userDoc.data().username) {
      window.location.href = "home.html";
      return;
    }
    // ใช้รูป Google เป็นค่าเริ่มต้นถ้ามี
    if (currentUser.photoURL) avatarPreview.src = currentUser.photoURL;
    openProfileModal();
  } catch (err) {
    errorMsg.textContent = mapError(err.code);
  }
});

function openProfileModal() {
  profileModal.classList.remove("hidden");
}

avatarEditBtn.addEventListener("click", () => avatarInput.click());

avatarInput.addEventListener("change", async () => {
  const file = avatarInput.files[0];
  if (!file) return;
  try {
    const compressed = await compressImage(file, 300, 0.7);
    avatarDataUrl = compressed;
    avatarPreview.src = compressed;
  } catch (err) {
    profileError.textContent = "โหลดรูปไม่สำเร็จ กรุณาลองใหม่";
    console.error(err);
  }
});

profileSubmitBtn.addEventListener("click", async () => {
  profileError.textContent = "";
  const username = usernameInput.value.trim();

  if (!username) {
    profileError.textContent = "กรุณาตั้งชื่อแอคเคานต์";
    return;
  }
  if (!currentUser) {
    profileError.textContent = "เกิดข้อผิดพลาด กรุณาลองใหม่";
    return;
  }

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      username: username,
      email: currentUser.email,
      photoURL: avatarDataUrl || currentUser.photoURL || "",
      themeColor: {
        text: "#000000",
        line: "#000000",
        base: "#cfc0e8"
      },
      language: "th",
      createdAt: new Date().toISOString()
    });

    await updateProfile(currentUser, {
      displayName: username,
      photoURL: avatarDataUrl || currentUser.photoURL || ""
    });

    window.location.href = "home.html";
  } catch (err) {
    profileError.textContent = "บันทึกไม่สำเร็จ กรุณาลองใหม่";
  }
});

function mapError(code) {
  switch (code) {
    case "auth/email-already-in-use": return "อีเมลนี้มีผู้ใช้แล้ว";
    case "auth/invalid-email": return "อีเมลไม่ถูกต้อง";
    case "auth/weak-password": return "รหัสผ่านอ่อนเกินไป";
    case "auth/popup-closed-by-user": return "ยกเลิกการเข้าสู่ระบบ";
    default: return "เกิดข้อผิดพลาด กรุณาลองใหม่";
  }
}