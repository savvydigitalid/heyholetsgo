// assets/js/core/state.js
// --------------------------------------
// Semua urusan state global & localStorage
// --------------------------------------

// Kunci untuk localStorage
const STORAGE_KEY = "hhlg_v136_state";

// State utama aplikasi
let appState = {
  tasks: {},          // { "2025-11-24": [ {id, name, effort, status, createdAt}, ... ] }
  learning: {},       // { "2025-11-24": [ {id, category, subskill, effort, note, createdAt}, ... ] }
  theme: "light",     // "light" atau "dark"
  user: {             // profile user
    name: "",
    position: ""
  },
  // optional: dipakai kalau nanti mau hidupin lagi fitur carry-over
  lastOpenDate: null
};

// Helper: dapetin key tanggal hari ini dalam format "YYYY-MM-DD"
function getTodayKey() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

// Load state dari localStorage
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);

    appState.tasks       = parsed.tasks       || {};
    appState.learning    = parsed.learning    || {};
    appState.theme       = parsed.theme       || "light";
    appState.user        = parsed.user        || { name: "", position: "" };
    appState.lastOpenDate = parsed.lastOpenDate || null;
  } catch (e) {
    console.error("Failed to load state:", e);
  }
}

// Save state ke localStorage
function saveState() {
  try {
    const toSave = {
      tasks:        appState.tasks,
      learning:     appState.learning,
      theme:        appState.theme,
      user:         appState.user,
      lastOpenDate: appState.lastOpenDate || null
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error("Failed to save state:", e);
  }
}

// Generator ID simple untuk task/learning
function generateId() {
  return "id_" + Math.random().toString(36).slice(2, 10);
}

// Pastikan appState[key] itu array
function ensureArray(obj, key) {
  if (!obj[key]) obj[key] = [];
  return obj[key];
}
