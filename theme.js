// theme.js
import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const DEFAULT_THEME = {
  text: "#1a1a1a",
  line: "#1a1a1a",
  base: "#f2f0f6",
  tabbar: "#cfc0e8"
};

export const PRESET_THEMES = {
  light: {
    text: "#1a1a1a",
    line: "#1a1a1a",
    base: "#f2f0f6",
    tabbar: "#cfc0e8"
  },
  dark: {
    text: "#f0f0f0",
    line: "#555555",
    base: "#2a2a30",
    tabbar: "#1f1f24"
  }
};

export function applyTheme(theme) {
  const t = { ...DEFAULT_THEME, ...theme };
  document.documentElement.style.setProperty("--color-text", t.text);
  document.documentElement.style.setProperty("--color-line", t.line);
  document.documentElement.style.setProperty("--color-base", t.base);
  document.documentElement.style.setProperty("--color-tabbar", t.tabbar);
}

export async function loadAndApplyTheme(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists() && snap.data().themeColor) {
    const merged = { ...DEFAULT_THEME, ...snap.data().themeColor };
    applyTheme(merged);
    return merged;
  }
  applyTheme(DEFAULT_THEME);
  return DEFAULT_THEME;
}

export async function saveTheme(uid, theme) {
  await setDoc(doc(db, "users", uid), { themeColor: theme }, { merge: true });
}