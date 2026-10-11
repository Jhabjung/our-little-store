// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 👉 แทนที่ด้วยค่าจาก Firebase console ของคุณ (ข้อ 6 ด้านบน)
const firebaseConfig = {
  apiKey: "AIzaSyDe-JVtuu08QFcsYvi_rrSi5b6cpLT4IlQ",
  authDomain: "our-little-store.firebaseapp.com",
  projectId: "our-little-store",
  storageBucket: "our-little-store.firebasestorage.app",
  messagingSenderId: "777263240067",
  appId: "1:777263240067:web:3f36104b4e26616a2d1cb6"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();