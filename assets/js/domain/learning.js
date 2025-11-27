// assets/js/domain/learning.js
// --------------------------------------
// DOMAIN LOGIC UNTUK LEARNING & SKILLS
// --------------------------------------

// XP berdasarkan effort learning
// Small = 10 XP
// Medium = 20 XP
// Intensive = 30 XP
function getLearningBaseXp(entry) {
  if (!entry) return 0;
  if (entry.effort === "small") return 10;
  if (entry.effort === "medium") return 20;
  if (entry.effort === "intensive") return 30;
  return 0;
}

// XP final learning (100%, tidak ada partial)
function getLearningDailyXp(entry) {
  return getLearningBaseXp(entry);
}

// Hitung XP learning dalam satu tanggal
function computeDayLearningXp(dateKey) {
  const list = appState.learning[dateKey] || [];
  return list.reduce((sum, l) => sum + getLearningDailyXp(l), 0);
}

// Total entry learning harian
function computeDayLearningCount(dateKey) {
  const list = appState.learning[dateKey] || [];
  return list.length;
}

// Progress bar learning harian (0–100%)
// threshold yang dipakai user: minimal 1 entry per hari → 100%
function computeLearningPercent(dateKey) {
  const count = computeDayLearningCount(dateKey);
  if (count === 0) return 0;
  return 100; // logic simple: entry ada = full progress
}

// Tambah learning entry baru
function addLearning(dateKey, category, subskill, effort, note) {
  const newEntry = {
    id: generateId(),
    category,
    subskill,
    effort,      // "small" | "medium" | "intensive"
    note,        // apa yang dipelajari hari itu
    createdAt: Date.now()
  };

  if (!appState.learning[dateKey]) {
    appState.learning[dateKey] = [];
  }

  appState.learning[dateKey].push(newEntry);
  saveState();

  return newEntry;
}

// Edit learning (rename subskill atau note)
function editLearning(dateKey, id, fields) {
  const list = appState.learning[dateKey] || [];
  const item = list.find(l => l.id === id);
  if (!item) return;

  if (fields.subskill !== undefined) item.subskill = fields.subskill;
  if (fields.note !== undefined) item.note = fields.note;
  if (fields.effort !== undefined) item.effort = fields.effort;

  saveState();
}

// Hapus entry learning
function deleteLearning(dateKey, id) {
  const list = appState.learning[dateKey] || [];
  appState.learning[dateKey] = list.filter(l => l.id !== id);
  saveState();
}

// Hitung skill gain total untuk bulan / periode (dipakai report)
function computeSkillGain(rangeDates) {
  const skillMap = {}; // { "Copywriting": totalXP, "Meta Ads": totalXP }

  rangeDates.forEach(dateKey => {
    const entries = appState.learning[dateKey] || [];
    entries.forEach(e => {
      const xp = getLearningDailyXp(e);
      const key = `${e.category} - ${e.subskill}`;
      if (!skillMap[key]) skillMap[key] = 0;
      skillMap[key] += xp;
    });
  });

  return skillMap; // nanti dipakai buat Top 3 skill gain
}
