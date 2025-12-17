// HeyHoLetsGo – V1.3.7 STABLE
// Struktur: state.js terpisah, semua domain + UI di main.js
// Dipakai tim per 01 Desember 2025
const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzTUS-s1rX7dfJlzc7RCbxPmsqZXeIQo70FNRnNabpbjH6KenY4AxsWK0xSkimy8MCC/exec";
// ==== 4DX WEEKLY SYNC WEBHOOK ====
const FOURDX_WEEKLY_SYNC_URL = "https://script.google.com/macros/s/AKfycbwjEB9SbzanmrhVnyVIHSz9JczI0yTBRrOgehPEpabJFEiz9wBpTeH4N53rXF_IIA0LcQ/exec";
const TASK_XP_PER_EFFORT = { 1: 10, 2: 20, 3: 30 };
const DAILY_TASK_XP_TARGET = 60;
const LEARNING_XP_PER_EFFORT = { 1: 5, 2: 10, 3: 20 };
const SIX_MONTHS_IN_DAYS = 183;

let dopamineChart, learningChart, monthlyChart;

function formatShortDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function carryOverFromYesterday() {
  const today = todayKey();

  // FIRST TIME OPEN TODAY → do carry-over
  if (appState.lastOpenDate !== today) {

    const yesterday = shiftDateKey(today, -1);
    const yTasks = appState.tasks[yesterday] || [];
    const todayList = appState.tasks[today] || [];

    const carryList = [];

    yTasks.forEach(t => {
      if (
        t.status === "none" ||
        t.status === "" ||
        t.status === "progress" ||
        t.status === "blocked"
      ) {
        // Deduplicate: Cek apakah task dengan (name+effort+status) sudah ada hari ini
        const dup = todayList.find(n =>
          n.name === t.name &&
          n.effort === t.effort &&
          n.status === "none"
        );

        if (!dup) {
          carryList.push({
            id: generateId(),
            name: t.name,
            effort: t.effort,
            status: "none", // ✨ Semua mapping jadi NONE
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    // Insert carry tasks at the TOP
    appState.tasks[today] = [...carryList, ...todayList];

    // Mark that carry has been done for this date
    appState.lastOpenDate = today;
    saveState();
  }
  // Jika tanggal sama → JANGAN carry-over lagi
}

/* DOM */
const tabButtons = document.querySelectorAll(".tab-btn");
const tasksTabEl = document.getElementById("tasksTab");
const fourdxTabEl = document.getElementById("fourdxTab");
const learningTabEl = document.getElementById("learningTab");
const settingsTabEl = document.getElementById("settingsTab");
  const topBarEl = document.getElementById("topBar");

const hohoTaskFloat = document.getElementById("hohoTaskFloat");
const hohoLearningFloat = document.getElementById("hohoLearningFloat");

const themeToggleBtn = document.getElementById("themeToggle");
const themeIconSpan = document.getElementById("themeIcon");

const taskNameInput = document.getElementById("taskNameInput");
const taskEffortInput = document.getElementById("taskEffortInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskListEl = document.getElementById("taskList");
const xpTodayText = document.getElementById("xpTodayText");
const tasksDoneText = document.getElementById("tasksDoneText");
const tasksProgressText = document.getElementById("tasksProgressText");
const tasksBlockedText = document.getElementById("tasksBlockedText");
const dopaminePercentText = document.getElementById("dopaminePercentText");
const taskHeatmapEl = document.getElementById("taskHeatmap");
const heatmapRangeLabel = document.getElementById("heatmapRangeLabel");
const monthlyRangeLabel = document.getElementById("monthlyRangeLabel");

const learningCategoryInput = document.getElementById("learningCategoryInput");
const learningSubskillInput = document.getElementById("learningSubskillInput");
const learningEffortInput = document.getElementById("learningEffortInput");
const learningReflectionInput = document.getElementById("learningReflectionInput");
const addLearningBtn = document.getElementById("addLearningBtn");
const learningListEl = document.getElementById("learningList");
const learningEntriesTodayEl = document.getElementById("learningEntriesToday");
const learningXpTodayEl = document.getElementById("learningXpToday");
const learningXpSixMonthsEl = document.getElementById("learningXpSixMonths");
const learningHeatmapEl = document.getElementById("learningHeatmap");
const learningHeatmapRangeLabel = document.getElementById("learningHeatmapRangeLabel");
const skillProgressWrapper = document.getElementById("skillProgressWrapper");
const top3skillsEl = document.getElementById("top3skills");

const userNameInput = document.getElementById("userNameInput");
const userPositionInput = document.getElementById("userPositionInput");
const exportPdfBtn = document.getElementById("exportPdfBtn");

/* THEME */
function applyTheme(theme){
  if(theme === "dark"){
    document.body.classList.add("dark");
    themeIconSpan.textContent = "🌙";
    themeToggleBtn.querySelector("span").textContent = "Dark";
  } else {
    document.body.classList.remove("dark");
    themeIconSpan.textContent = "🌞";
    themeToggleBtn.querySelector("span").textContent = "Light";
  }
}
themeToggleBtn.addEventListener("click", ()=>{
  appState.theme = appState.theme === "dark" ? "light" : "dark";
  applyTheme(appState.theme);
  saveState();
});

/* TABS */
function showTab(tabId){
    [tasksTabEl, fourdxTabEl, learningTabEl, settingsTabEl].forEach(el => {
    if (el) el.classList.add("hidden");
  });
  if(tabId==="tasksTab") tasksTabEl.classList.remove("hidden");
  if (tabId === "fourdxTab"  && fourdxTabEl) fourdxTabEl.classList.remove("hidden");
  if(tabId==="learningTab") learningTabEl.classList.remove("hidden");
  if(tabId==="settingsTab") settingsTabEl.classList.remove("hidden");

  tabButtons.forEach(btn=>{
    if(btn.dataset.tab===tabId) btn.classList.add("active");
    else btn.classList.remove("active");
  });

  // Ho-Ho floating visibility
  if(tabId==="tasksTab"){
    hohoTaskFloat.classList.remove("hidden");
    hohoLearningFloat.classList.add("hidden");
  } else if(tabId==="learningTab"){
    hohoTaskFloat.classList.add("hidden");
    hohoLearningFloat.classList.remove("hidden");
  } else {
    hohoTaskFloat.classList.add("hidden");
    hohoLearningFloat.classList.add("hidden");
  }

  // Top logo bar: tampil di Tasks & Learning, hilang di Settings
  if (topBarEl) {
    if (tabId === "settingsTab") {
      topBarEl.style.display = "none";
    } else {
      topBarEl.style.display = "flex";
    }
  }
}
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabId = btn.dataset.tab; // contoh: "tasksTab" / "fourdxTab"
    showTab(tabId);
  });
});

/* TASKS */
function computeTaskStatsForDate(dateKey){
  const arr = appState.tasks[dateKey] || [];
  let xp=0, done=0, prog=0, blocked=0;
  arr.forEach(t=>{
    const eff = TASK_XP_PER_EFFORT[t.effort] || 0;
    if(t.status==="done") xp += eff;
    else if(t.status==="progress") xp += Math.round(eff*0.2);
    if(t.status==="done") done++;
    if(t.status==="progress") prog++;
    if(t.status==="blocked") blocked++;
  });
  const percent = Math.max(0,Math.min(100,Math.round((xp/DAILY_TASK_XP_TARGET)*100)));
  return { xp, done, prog, blocked, percent };
}

function renderTasksForToday(){
  const key = getTodayKey();
  const tasks = appState.tasks[key] || [];
  const stats = computeTaskStatsForDate(key);

  xpTodayText.textContent = stats.xp + " XP";
  tasksDoneText.textContent = stats.done;
  tasksProgressText.textContent = stats.prog;
  tasksBlockedText.textContent = stats.blocked;
  dopaminePercentText.textContent = stats.percent + "%";

  taskListEl.innerHTML = "";
  if(!tasks.length){
    const empty = document.createElement("div");
    empty.style.fontSize="12px";
    empty.style.color="var(--text-light)";
    empty.textContent="No tasks yet. Add 2–5 meaningful tasks.";
    taskListEl.appendChild(empty);
  } else {
    tasks.forEach(task=>{
      const row = document.createElement("div");
      row.style.display="grid";
      row.style.gridTemplateColumns="minmax(0,2.4fr) minmax(0,1fr) minmax(0,1.8fr) auto";
      row.style.gap="8px";
      row.style.alignItems="center";
      row.style.padding="7px 9px";
      row.style.borderRadius="10px";
      row.style.background="var(--bg-alt)";

      const nameCell = document.createElement("div");
      const nameSpan = document.createElement("span");
      nameSpan.textContent = task.name;
      nameSpan.style.fontWeight="600";
      nameSpan.style.fontSize="13px";
      nameSpan.style.cursor="pointer";
      nameSpan.addEventListener("click", ()=>{
        const n = prompt("Edit task name:", task.name);
        if(n!==null && n.trim()!==""){
          task.name = n.trim();
          saveState();
          renderTasksForToday();
          renderTaskHeatmap();
          renderDopamineRadial();
          renderMonthlyDopamineChart();
          updateHoHoMood();
        }
      });
      nameCell.appendChild(nameSpan);

      const effortCell = document.createElement("div");
      effortCell.style.fontSize="12px";
      let effTxt="Effort "+task.effort;
      if(task.effort===1) effTxt+=" – Small";
      if(task.effort===2) effTxt+=" – Medium";
      if(task.effort===3) effTxt+=" – Large";
      effortCell.textContent = effTxt;

      const statusCell = document.createElement("div");
      statusCell.style.display="flex";
      statusCell.style.gap="4px";
      const statuses = [
        { value:"none", label:"Todo" },
        { value:"progress", label:"Progress" },
        { value:"done", label:"Done" },
        { value:"blocked", label:"Blocked" },
      ];
      statuses.forEach(s=>{
        const btn = document.createElement("button");
        btn.type="button";
        btn.textContent = s.label;
        btn.className="status-pill";
        if(task.status===s.value){
          if(s.value==="none") btn.classList.add("active-none");
          if(s.value==="progress") btn.classList.add("active-progress");
          if(s.value==="done") btn.classList.add("active-done");
          if(s.value==="blocked") btn.classList.add("active-blocked");
        }
        btn.addEventListener("click", ()=>{
          task.status = s.value;
          saveState();
          renderTasksForToday();
          renderTaskHeatmap();
          renderDopamineRadial();
          renderMonthlyDopamineChart();
          updateHoHoMood();
        });
        statusCell.appendChild(btn);
      });

      const actionsCell = document.createElement("div");
      actionsCell.style.textAlign="right";
      const delBtn = document.createElement("button");
      delBtn.type="button";
      delBtn.textContent="✕";
      delBtn.style.fontSize="11px";
      delBtn.style.padding="4px 8px";
      delBtn.style.borderRadius="999px";
      delBtn.style.background="#f97373";
      delBtn.addEventListener("click", ()=>{
        if(confirm("Delete this task?")){
          appState.tasks[key] = (appState.tasks[key]||[]).filter(t=>t.id!==task.id);
          saveState();
          renderTasksForToday();
          renderTaskHeatmap();
          renderDopamineRadial();
          renderMonthlyDopamineChart();
          updateHoHoMood();
        }
      });
      actionsCell.appendChild(delBtn);

      row.appendChild(nameCell);
      row.appendChild(effortCell);
      row.appendChild(statusCell);
      row.appendChild(actionsCell);
      taskListEl.appendChild(row);
    });
  }

  renderDopamineRadial();
  renderMonthlyDopamineChart();
  updateHoHoMood();
}

addTaskBtn.addEventListener("click", ()=>{
  const name = taskNameInput.value.trim();
  const effort = parseInt(taskEffortInput.value,10) || 1;
  if(!name){ alert("Please enter a task name."); return; }
  const key = getTodayKey();
  const arr = ensureArray(appState.tasks,key);
  arr.push({
    id: generateId(),
    name,
    effort,
    status: "none",
    createdAt: new Date().toISOString()
  });
  taskNameInput.value="";
  taskEffortInput.value="1";
  saveState();
  renderTasksForToday();
  renderTaskHeatmap();
});

/* LEARNING */
function computeLearningStatsForDate(dateKey){
  const arr = appState.learning[dateKey] || [];
  let xp=0;
  arr.forEach(e=> xp += LEARNING_XP_PER_EFFORT[e.effort] || 0);
  const percent = Math.max(0,Math.min(100,Math.round((xp/40)*100)));
  return { xp, entriesCount: arr.length, percent };
}
function computeLearningSixMonthXp(){
  const today = new Date(getTodayKey()+"T00:00:00");
  let total=0;
  Object.keys(appState.learning).forEach(k=>{
    const d = new Date(k+"T00:00:00");
    const diff = (today-d)/(1000*60*60*24);
    if(diff>=0 && diff<=SIX_MONTHS_IN_DAYS){
      total += computeLearningStatsForDate(k).xp;
    }
  });
  return total;
}
  function buildWeeklyPayload() {
  const todayKey = getTodayKey();
  const today = new Date(todayKey + "T00:00:00");

  // Ambil 7 hari ke belakang, termasuk hari ini
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push(iso);
  }

  const rows = days.map((dateKey) => {
    const tStats = computeTaskStatsForDate(dateKey);
    const lStats = computeLearningStatsForDate(dateKey);

    return {
      date: dateKey,
      taskPercent: tStats.percent,
      taskXp: tStats.xp,
      taskDone: tStats.done,
      taskProgress: tStats.prog,
      taskBlocked: tStats.blocked,
      learningXp: lStats.xp,
      learningEntries: lStats.entriesCount
    };
  });

  const weekLabel = `${formatShortDate(days[0])} – ${formatShortDate(days[days.length - 1])}`;

  return {
    userName: appState.user?.name || "",
    position: appState.user?.position || "",
    weekRange: weekLabel,
    rows
  };
}
async function syncWeeklyToGoogleSheet() {
  if (!GOOGLE_SHEET_WEBHOOK_URL || GOOGLE_SHEET_WEBHOOK_URL.indexOf("script.google.com") === -1) {
    alert("Google Sheet webhook URL belum di-set atau tidak valid.");
    return;
  }

  const payload = buildWeeklyPayload();

  if (!payload.userName || !payload.position) {
    const ok = confirm("Name dan Position di Settings masih kosong. Tetap kirim data tanpa identitas?");
    if (!ok) return;
  }

  const confirmSend = confirm(
    `Kirim data 7 hari terakhir ke Google Sheet untuk:\n\n` +
    `Name: ${payload.userName || "-"}\n` +
    `Position: ${payload.position || "-"}\n` +
    `Range: ${payload.weekRange}\n\nLanjutkan?`
  );
  if (!confirmSend) return;

  try {
    const btn = document.getElementById("syncWeeklyBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Syncing...";
    }

    // Kirim tanpa baca response (biar gak ke-block CORS)
    await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",                    // penting: jangan cek response
      headers: {
        "Content-Type": "text/plain"      // simple header, aman buat no-cors
      },
      body: JSON.stringify(payload)
    });

    alert("Permintaan sync sudah dikirim. Cek Google Sheet apakah barisnya sudah bertambah.");
  } catch (err) {
    console.error("Fetch error:", err);
    alert("Masih gagal kirim ke Google Sheet.\n\nError: " + err.message);
  } finally {
    const btn = document.getElementById("syncWeeklyBtn");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Sync Weekly to Google Sheet";
    }
  }
}


function categoryLabel(cat){
  const map = {
    tools:"Tools & Workspace",
    digital:"Digital Marketing",
    ai:"AI Skills",
    content:"Content & Creative",
    data:"Data Analytics & Research",
    finance:"Finance",
    hr:"HR",
    sales:"Sales",
    cognitive:"Cognitive Skills",
    interpersonal:"Interpersonal Skills",
    intrapersonal:"Intrapersonal Skills",
    business:"Business Acumen",
    leadership:"Leadership & Management",
    other:"Others"
  };
  return map[cat] || cat;
}

function renderLearningForToday(){
  const key = getTodayKey();
  const arr = appState.learning[key] || [];
  const stats = computeLearningStatsForDate(key);

  learningEntriesTodayEl.textContent = stats.entriesCount;
  learningXpTodayEl.textContent = stats.xp;
  learningXpSixMonthsEl.textContent = computeLearningSixMonthXp();
  document.getElementById("learningPercentText").textContent = stats.percent + "%";

  learningListEl.innerHTML = "";
  if(!arr.length){
    const e=document.createElement("div");
    e.style.fontSize="12px";
    e.style.color="var(--text-light)";
    e.textContent="No learning yet. Log at least one insight today.";
    learningListEl.appendChild(e);
  } else {
    arr.forEach(entry=>{
      const row=document.createElement("div");
      row.style.display="grid";
      row.style.gridTemplateColumns="minmax(0,1.4fr) minmax(0,1.1fr) minmax(0,1fr) auto";
      row.style.gap="8px";
      row.style.alignItems="flex-start";
      row.style.padding="7px 9px";
      row.style.borderRadius="10px";
      row.style.background="var(--bg-alt)";

      const catCell=document.createElement("div");
      const catSpan=document.createElement("span");
      catSpan.textContent = entry.customLabel || categoryLabel(entry.category);
      catSpan.style.fontWeight="600";
      catSpan.style.fontSize="13px";
      catSpan.style.cursor="pointer";
      catSpan.addEventListener("click",()=>{
        const newLabel = prompt("Edit category label (display only):", catSpan.textContent);
        if(newLabel!==null && newLabel.trim()!==""){
          entry.customLabel = newLabel.trim();
          saveState();
          renderLearningForToday();
          renderLearningHeatmap();
          renderSkillProgress();
          renderTop3Skills();
          renderLearningRadial();
          updateHoHoMood();
        }
      });
      catCell.appendChild(catSpan);

      const subCell=document.createElement("div");
      const subSpan=document.createElement("span");
      subSpan.textContent = entry.subskill || "No subskill";
      subSpan.style.fontSize="12px";
      subSpan.style.cursor="pointer";
      subSpan.addEventListener("click",()=>{
        const upd = prompt("Edit subskill (or blank):", entry.subskill || "");
        if(upd!==null){
          entry.subskill = upd.trim();
          saveState();
          renderLearningForToday();
          renderLearningHeatmap();
          renderSkillProgress();
          renderTop3Skills();
          renderLearningRadial();
          updateHoHoMood();
        }
      });
      subCell.appendChild(subSpan);

      const effortCell=document.createElement("div");
      effortCell.style.fontSize="12px";
      effortCell.textContent = entry.effort===1?"Small":entry.effort===2?"Medium":"Intensive";

      const actionsCell=document.createElement("div");
      actionsCell.style.textAlign="right";
      actionsCell.style.display="flex";
      actionsCell.style.flexDirection="column";
      actionsCell.style.alignItems="flex-end";
      actionsCell.style.gap="4px";

      const refBtn=document.createElement("button");
      refBtn.type="button";
      refBtn.textContent="✎ Reflection";
      refBtn.style.fontSize="11px";
      refBtn.style.padding="4px 8px";
      refBtn.style.borderRadius="999px";
      refBtn.style.background="var(--bg)";
      refBtn.style.color="var(--text)";
      refBtn.addEventListener("click",()=>{
        const upd = prompt("Edit reflection:", entry.reflection || "");
        if(upd!==null){
          entry.reflection = upd.trim();
          saveState();
          renderLearningForToday();
        }
      });

      const delBtn=document.createElement("button");
      delBtn.type="button";
      delBtn.textContent="✕";
      delBtn.style.fontSize="11px";
      delBtn.style.padding="4px 8px";
      delBtn.style.borderRadius="999px";
      delBtn.style.background="#f97373";
      delBtn.addEventListener("click",()=>{
        if(confirm("Delete this learning entry?")){
          appState.learning[key] = (appState.learning[key]||[]).filter(e=>e.id!==entry.id);
          saveState();
          renderLearningForToday();
          renderLearningHeatmap();
          renderSkillProgress();
          renderTop3Skills();
          renderLearningRadial();
          updateHoHoMood();
        }
      });

      actionsCell.appendChild(refBtn);
      actionsCell.appendChild(delBtn);

      row.appendChild(catCell);
      row.appendChild(subCell);
      row.appendChild(effortCell);
      row.appendChild(actionsCell);
      learningListEl.appendChild(row);
    });
  }

  renderLearningRadial();
  updateHoHoMood();
}

addLearningBtn.addEventListener("click",()=>{
  const category = learningCategoryInput.value;
  const subskill = learningSubskillInput.value.trim();
  const effort = parseInt(learningEffortInput.value,10) || 1;
  const reflection = learningReflectionInput.value.trim();
  const key = getTodayKey();
  const arr = ensureArray(appState.learning,key);
  arr.push({
    id: generateId(),
    category,
    subskill,
    effort,
    reflection,
    createdAt: new Date().toISOString()
  });
  saveState();
  learningSubskillInput.value="";
  learningReflectionInput.value="";
  learningEffortInput.value="1";
  renderLearningForToday();
  renderLearningHeatmap();
  renderSkillProgress();
  renderTop3Skills();
});

/* HEATMAPS */
function renderTaskHeatmap(){
  const today = new Date(getTodayKey()+"T00:00:00");
  const cells=[];
  for(let i=27;i>=0;i--){
    const d=new Date(today);
    d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    const stats = computeTaskStatsForDate(key);
    cells.push({dateKey:key,percent:stats.percent});
  }
  taskHeatmapEl.innerHTML="";
  cells.forEach(info=>{
    const cell=document.createElement("div");
    cell.className="heat-cell";
    let bg="#e5e7eb";
    if(info.percent>=80) bg="#6ee7b7";
    else if(info.percent>=40) bg="#fde68a";
    else if(info.percent>0) bg="#fca5a5";
    cell.style.background=bg;
    cell.dataset.dateKey=info.dateKey;
    const label=document.createElement("div");
    label.className="heat-cell-label";
    label.style.color="#111827";
    label.textContent=new Date(info.dateKey+"T00:00:00").getDate();
    cell.appendChild(label);
    taskHeatmapEl.appendChild(cell);
  });
  const firstKey=cells[0]?.dateKey;
  const lastKey=cells[cells.length-1]?.dateKey;
  if(firstKey && lastKey){
    heatmapRangeLabel.textContent = formatShortDate(firstKey)+" – "+formatShortDate(lastKey);
    monthlyRangeLabel.textContent = heatmapRangeLabel.textContent;
  }
}

function renderLearningHeatmap(){
  const today = new Date(getTodayKey()+"T00:00:00");
  const cells=[];
  for(let i=27;i>=0;i--){
    const d=new Date(today);
    d.setDate(d.getDate()-i);
    const key=d.toISOString().slice(0,10);
    const stats=computeLearningStatsForDate(key);
    cells.push({dateKey:key,xp:stats.xp});
  }
  learningHeatmapEl.innerHTML="";
  cells.forEach(info=>{
    const cell=document.createElement("div");
    cell.className="heat-cell";
    let bg="#e5e7eb";
    if(info.xp>0 && info.xp<=10) bg="#bfdbfe";
    else if(info.xp<=20) bg="#60a5fa";
    else if(info.xp>20) bg="#2563eb";
    cell.style.background=bg;
    cell.dataset.dateKey=info.dateKey;
    const label=document.createElement("div");
    label.className="heat-cell-label";
    label.style.color="#f9fafb";
    label.textContent=new Date(info.dateKey+"T00:00:00").getDate();
    cell.appendChild(label);
    learningHeatmapEl.appendChild(cell);
  });
  const firstKey=cells[0]?.dateKey;
  const lastKey=cells[cells.length-1]?.dateKey;
  if(firstKey && lastKey){
    learningHeatmapRangeLabel.textContent = formatShortDate(firstKey)+" – "+formatShortDate(lastKey);
  }
}

/* SKILLS */
function computeSkillCategoryXpLastSixMonths(){
  const today = new Date(getTodayKey()+"T00:00:00");
  const map={};
  Object.keys(appState.learning).forEach(k=>{
    const d=new Date(k+"T00:00:00");
    const diff=(today-d)/(1000*60*60*24);
    if(diff>=0 && diff<=SIX_MONTHS_IN_DAYS){
      (appState.learning[k]||[]).forEach(e=>{
        const xp=LEARNING_XP_PER_EFFORT[e.effort]||0;
        if(!map[e.category]) map[e.category]=0;
        map[e.category]+=xp;
      });
    }
  });
  return map;
}
function renderSkillProgress(){
  const map=computeSkillCategoryXpLastSixMonths();
  const entries=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  skillProgressWrapper.innerHTML="";
  if(!entries.length){
    const e=document.createElement("div");
    e.style.fontSize="12px";
    e.style.color="var(--text-light)";
    e.textContent="No learning XP yet. Start logging to see growth.";
    skillProgressWrapper.appendChild(e);
    return;
  }
  const maxXp=entries[0][1]||1;
  entries.forEach(([cat,xp])=>{
    const card=document.createElement("div");
    card.style.borderRadius="12px";
    card.style.padding="8px 10px";
    card.style.background="var(--bg-alt)";
    card.style.border="1px solid var(--border)";
    card.style.display="flex";
    card.style.flexDirection="column";
    card.style.gap="4px";

    const header=document.createElement("div");
    header.style.display="flex";
    header.style.justifyContent="space-between";
    const label=document.createElement("div");
    label.style.fontSize="13px";
    label.style.fontWeight="600";
    label.textContent=categoryLabel(cat);
    const xpText=document.createElement("div");
    xpText.style.fontSize="11px";
    xpText.style.color="var(--text-light)";
    xpText.textContent=xp+" XP";
    header.appendChild(label);
    header.appendChild(xpText);

    const barOuter=document.createElement("div");
    barOuter.style.height="6px";
    barOuter.style.borderRadius="999px";
    barOuter.style.background="rgba(148,163,184,0.35)";
    const barInner=document.createElement("div");
    barInner.style.height="100%";
    barInner.style.borderRadius="999px";
    barInner.style.background="linear-gradient(90deg,#ffb443,#ff7f50)";
    barInner.style.width=Math.max(8,(xp/maxXp)*100)+"%";
    barOuter.appendChild(barInner);

    card.appendChild(header);
    card.appendChild(barOuter);
    skillProgressWrapper.appendChild(card);
  });
}

function computeTop3Skills(){
  const map=computeSkillCategoryXpLastSixMonths();
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,3);
}
function renderTop3Skills(){
  top3skillsEl.innerHTML="";
  const data=computeTop3Skills();
  if(!data.length){
    top3skillsEl.innerHTML=`<div style="font-size:12px;color:var(--text-light);">No skill gains yet.</div>`;
    return;
  }
  const maxXp=data[0][1]||1;
  data.forEach(([cat,xp])=>{
    const row=document.createElement("div");
    row.style.display="grid";
    row.style.gridTemplateColumns="1fr auto";
    row.style.gap="8px";
    row.style.alignItems="center";
    row.innerHTML=`
      <div>
        <div style="font-size:12px;font-weight:600;">${categoryLabel(cat)}</div>
        <div style="height:5px;border-radius:999px;background:#e5e7eb;margin-top:4px;">
          <div style="
            height:100%;
            width:${Math.max(12,(xp/maxXp)*100)}%;
            border-radius:999px;
            background:linear-gradient(90deg,#ffb443,#ff7f50);
          "></div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-light);font-weight:600;">${xp} XP</div>
    `;
    top3skillsEl.appendChild(row);
  });
}

/* CHARTS */
function renderDopamineRadial(){
  const ctx = document.getElementById("dopamineChart").getContext("2d");
  const stats = computeTaskStatsForDate(getTodayKey());
  const percent = stats.percent;
  if(dopamineChart) dopamineChart.destroy();
  dopamineChart = new Chart(ctx,{
    type:"doughnut",
    data:{
      datasets:[{
        data:[percent,100-percent],
        backgroundColor:[
          percent>=60?"#6ee7b7":"#fca5a5",
          "rgba(148,163,184,0.25)"
        ],
        borderWidth:0,
        cutout:"70%"
      }]
    },
    options:{
      animation:{duration:700,easing:"easeOutBack"},
      plugins:{tooltip:{enabled:false},legend:{display:false}}
    }
  });
}

function renderLearningRadial(){
  const ctx = document.getElementById("learningChart").getContext("2d");
  const stats = computeLearningStatsForDate(getTodayKey());
  const percent = stats.percent;
  if(learningChart) learningChart.destroy();
  learningChart = new Chart(ctx,{
    type:"doughnut",
    data:{
      datasets:[{
        data:[percent,100-percent],
        backgroundColor:[
          percent>=60?"#60a5fa":"#bfdbfe",
          "rgba(148,163,184,0.25)"
        ],
        borderWidth:0,
        cutout:"70%"
      }]
    },
    options:{
      animation:{duration:700,easing:"easeOutBack"},
      plugins:{tooltip:{enabled:false},legend:{display:false}}
    }
  });
}

function renderMonthlyDopamineChart(){
  const ctx=document.getElementById("monthlyDopamineChart").getContext("2d");
  const today=new Date(getTodayKey()+"T00:00:00");
  const labels=[];
  const values=[];
  for(let i=27;i>=0;i--){
    const d=new Date(today);
    d.setDate(d.getDate()-i);
    labels.push(d.getDate());
    values.push(computeTaskStatsForDate(d.toISOString().slice(0,10)).percent);
  }
  if(monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx,{
    type:"line",
    data:{
      labels,
      datasets:[{
        data:values,
        borderColor:"#ffb443",
        borderWidth:2,
        fill:true,
        backgroundColor:"rgba(255,180,67,0.18)",
        tension:0.35,
        pointRadius:2.5
      }]
    },
    options:{
      scales:{y:{min:0,max:100,ticks:{stepSize:20}}},
      plugins:{legend:{display:false}},
      animation:{duration:700,easing:"easeOutBack"}
    }
  });
}

/* MODAL DETAIL */
function ensureModal(){
  if(document.getElementById("detailModal")) return;
  const modal=document.createElement("div");
  modal.id="detailModal";
  modal.style.position="fixed";
  modal.style.top=0;
  modal.style.left=0;
  modal.style.width="100%";
  modal.style.height="100%";
  modal.style.background="rgba(0,0,0,0.45)";
  modal.style.display="none";
  modal.style.justifyContent="center";
  modal.style.alignItems="center";
  modal.style.zIndex=9999;
  modal.innerHTML=`
    <div style="background:white;width:90%;max-width:420px;border-radius:16px;padding:18px;box-shadow:0 18px 45px rgba(15,23,42,0.2);animation:modalPop .35s ease-out;">
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
        <img id="modalHoHo" src="hoho-pointsmile.png" style="width:56px;">
        <div>
          <div id="modalDate" style="font-weight:700;font-size:16px;">-</div>
          <div id="modalPercent" style="font-size:13px;color:#4b5563;">-</div>
        </div>
      </div>
      <div id="modalTasks" style="font-size:13px;line-height:1.5;margin-bottom:10px;">Loading...</div>
      <button id="closeModalBtn" style="width:100%;border-radius:10px;background:#ffb443;border:none;padding:8px 10px;font-weight:700;cursor:pointer;">Close</button>
    </div>
  `;
  const style=document.createElement("style");
  style.innerHTML=`
    @keyframes modalPop{
      0%{transform:scale(.7);opacity:0;}
      70%{transform:scale(1.03);opacity:1;}
      100%{transform:scale(1);opacity:1;}
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(modal);
  document.getElementById("closeModalBtn").onclick=()=> modal.style.display="none";
}

function openModal(dateKey, kind){
  ensureModal();
  const modal=document.getElementById("detailModal");
  modal.style.display="flex";
  document.getElementById("modalDate").textContent = formatShortDate(dateKey);

  let percent;
  let html;
  if(kind==="tasks"){
    const stats=computeTaskStatsForDate(dateKey);
    percent=stats.percent;
    const tasks=appState.tasks[dateKey]||[];
    html = tasks.length
      ? "<ul style='padding-left:18px;margin:6px 0;'>"+
        tasks.map(t=>`<li><b>${t.name}</b> — Effort ${t.effort} (${t.status})</li>`).join("")+
        "</ul>"
      : "<i>No tasks logged.</i>";
    document.getElementById("modalPercent").textContent = `Task dopamine: ${percent}%`;
  } else {
    const st=computeLearningStatsForDate(dateKey);
    percent=st.percent;
    const entries=appState.learning[dateKey]||[];
    html = entries.length
      ? "<ul style='padding-left:18px;margin:6px 0;'>"+
        entries.map(e=>`<li><b>${categoryLabel(e.category)}</b> – ${e.subskill || "no subskill"} (${LEARNING_XP_PER_EFFORT[e.effort]||0} XP)</li>`).join("")+
        "</ul>"
      : "<i>No learning logged.</i>";
    document.getElementById("modalPercent").textContent = `Learning dopamine: ${percent}%`;
  }
  document.getElementById("modalTasks").innerHTML = html;

  const ho=document.getElementById("modalHoHo");
  if(percent>=80) ho.src="hoho-levelup.png";
  else if(percent>=40) ho.src= kind==="tasks" ? "hoho-pumped.png" : "hoho-book.png";
  else if(percent>0) ho.src= kind==="tasks" ? "hoho-sad.png" : "hoho-thinking.png";
  else ho.src="hoho-happy.png";
}

document.addEventListener("click", e=>{
  const taskCell=e.target.closest("#taskHeatmap .heat-cell");
  if(taskCell) openModal(taskCell.dataset.dateKey,"tasks");
  const learnCell=e.target.closest("#learningHeatmap .heat-cell");
  if(learnCell) openModal(learnCell.dataset.dateKey,"learning");
});

/* PROFILE */
function renderProfile(){
  userNameInput.value = appState.user.name || "";
  userPositionInput.value = appState.user.position || "";
}
userNameInput.addEventListener("change",()=>{
  appState.user.name = userNameInput.value.trim();
  saveState();
});
userPositionInput.addEventListener("change",()=>{
  appState.user.position = userPositionInput.value.trim();
  saveState();
});

/* PDF */
// GANTI exportPDF lama dengan ini
async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 32;
  let y = 36;

  // Helper: cek space, kalau nggak cukup -> new page
  function ensureSpace(extraHeight) {
    if (y + extraHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  }

  // Helper: short date label (misal 2025-11-24 -> 24 Nov)
  function shortLabel(key) {
    const d = new Date(key + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }

  // ----- 1. Load logo Savvy & HoHo (kalau ada) -----
  const loadImg = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  const [savvyImg, hohoImg] = await Promise.all([
    loadImg("savvy-logo.png"),
    loadImg("hoho-logo.png"),
  ]);

  // ----- 2. Tentukan bulan report -----
  const todayKey = getTodayKey();
  const today = new Date(todayKey + "T00:00:00");

  let reportMonthStr = document.getElementById("reportMonthInput").value;
  if (!reportMonthStr) {
    reportMonthStr = todayKey.slice(0, 7); // YYYY-MM
  }

  const [reportYearStr, reportMonthIdxStr] = reportMonthStr.split("-");
  const reportYear = parseInt(reportYearStr, 10);
  const reportMonthIdx = parseInt(reportMonthIdxStr, 10) - 1;

  const firstDate = new Date(reportYear, reportMonthIdx, 1);
  const nextMonth = new Date(reportYear, reportMonthIdx + 1, 1);
  const daysInMonth = Math.round(
    (nextMonth - firstDate) / (1000 * 60 * 60 * 24)
  );

  const dayKeys = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(reportYear, reportMonthIdx, d);
    const iso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    dayKeys.push(iso);
  }

  // ----- 3. Hitung summary data -----
  const taskPercents = [];
  let totalTaskPercent = 0;
  let countTaskDays = 0;
  let totalTaskXp = 0;

  dayKeys.forEach((key) => {
    const stats = computeTaskStatsForDate(key);
    taskPercents.push(stats.percent);
    if (stats.percent > 0) {
      totalTaskPercent += stats.percent;
      countTaskDays++;
    }
    totalTaskXp += stats.xp;
  });
  const avgTaskPercent = countTaskDays
    ? Math.round(totalTaskPercent / countTaskDays)
    : 0;

  const learningXpPerDay = [];
  let totalLearningXp = 0;
  dayKeys.forEach((key) => {
    const stats = computeLearningStatsForDate(key);
    learningXpPerDay.push(stats.xp);
    totalLearningXp += stats.xp;
  });

  // Top 3 skill gain
  const skillMonthlyMap = {};
  dayKeys.forEach((key) => {
    const arr = appState.learning[key] || [];
    arr.forEach((e) => {
      const xp = (window.LEARNING_XP_PER_EFFORT && window.LEARNING_XP_PER_EFFORT[e.effort]) || 0;
      if (!skillMonthlyMap[e.category]) skillMonthlyMap[e.category] = 0;
      skillMonthlyMap[e.category] += xp;
    });
  });
  const skillEntries = Object.entries(skillMonthlyMap).sort(
    (a, b) => b[1] - a[1]
  );
  const top3 = skillEntries.slice(0, 3);
  // ----- 3B. 4DX Monthly Summary (for PDF month) -----
  let fourdxPdf = null;
  try {
    if (typeof fourdxState !== "undefined" && typeof fourdxDaily !== "undefined") {
      const leads = (fourdxState && fourdxState.leads) ? fourdxState.leads : [];
      if (leads && leads.length) {
        const stats = leads.map(name => ({ name: name || "", red: 0, yellow: 0, green: 0, total: 0 }));
        let overallGreen = 0, overallYellow = 0, overallRed = 0, overallTotal = 0;

        dayKeys.forEach((key) => {
          const dayStatuses = (fourdxDaily && fourdxDaily[key]) ? fourdxDaily[key] : [];
          leads.forEach((_, idx) => {
            const s = dayStatuses[idx];
            if (s !== "red" && s !== "yellow" && s !== "green") return;
            stats[idx].total += 1;
            stats[idx][s] += 1;

            overallTotal += 1;
            if (s === "green") overallGreen += 1;
            if (s === "yellow") overallYellow += 1;
            if (s === "red") overallRed += 1;
          });
        });

        fourdxPdf = {
          leads,
          stats,
          overall: {
            total: overallTotal,
            green: overallGreen,
            yellow: overallYellow,
            red: overallRed
          }
        };
      }
    }
  } catch (e) {
    console.warn("4DX PDF calc error:", e);
    fourdxPdf = null;
  }

  // ----- 4. HEADER -----
  if (savvyImg) {
    pdf.addImage(savvyImg, "PNG", margin, y, 70, 28);
  }
  if (hohoImg) {
    pdf.addImage(hohoImg, "PNG", pageWidth - margin - 70, y, 70, 28);
  }
  y += 40;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("HeyHoLetsGo – Monthly Report", margin, y);
  y += 22;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  const monthLabel = new Date(reportYear, reportMonthIdx, 1).toLocaleDateString(
    "en-GB",
    { month: "long", year: "numeric" }
  );
  const name = appState.user.name || "-";
  const pos = appState.user.position || "-";

  pdf.text(`Name: ${name}`, margin, y);
  y += 14;
  pdf.text(`Position: ${pos}`, margin, y);
  y += 14;
  pdf.text(`Month: ${monthLabel}`, margin, y);
  y += 18;

  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 18;

  // ==========================
  // 5. SECTION 1 – TASKS SUMMARY
  // ==========================
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("1. Tasks & Productivity Summary", margin, y);
  y += 16;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(13);
  pdf.text(`Average dopamine: ${avgTaskPercent}%`, margin, y);
  y += 16;

  pdf.setFontSize(11);
  pdf.text(`Total task XP this month: ${totalTaskXp}`, margin, y);
  y += 18;

  // Line chart dopamine
  const chartX = margin;
  const chartY = y;
  const chartW = pageWidth - margin * 2;
  const chartH = 80;

  pdf.setDrawColor(210, 210, 210);
  pdf.rect(chartX, chartY, chartW, chartH);

  if (taskPercents.length > 1) {
    pdf.setDrawColor(255, 180, 67);
    let prevX = chartX;
    let prevY =
      chartY + chartH - (taskPercents[0] / 100) * chartH;
    for (let i = 1; i < taskPercents.length; i++) {
      const x =
        chartX + (i / (taskPercents.length - 1)) * chartW;
      const yLine =
        chartY + chartH - (taskPercents[i] / 100) * chartH;
      pdf.line(prevX, prevY, x, yLine);
      prevX = x;
      prevY = yLine;
    }
  }

  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text("Daily dopamine %", chartX, chartY - 4);
  pdf.setTextColor(0, 0, 0);

  y = chartY + chartH + 20;

  // Heatmap task
  pdf.setFontSize(11);
  pdf.text("Monthly dopamine heatmap:", margin, y);
  y += 10;

  const cellSize = 14;
  const cellGap = 3;
  const cols = 7;
  const startY = y;

  dayKeys.forEach((key, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const x = margin + col * (cellSize + cellGap);
    const cy = startY + row * (cellSize + cellGap);

    const stats = computeTaskStatsForDate(key);
    const p = stats.percent;

    let r = 230, g = 230, b = 230;
    if (p >= 80) { r = 110; g = 231; b = 183; }      // hijau
    else if (p >= 40) { r = 253; g = 230; b = 138; } // kuning
    else if (p > 0) { r = 252; g = 165; b = 165; }   // merah

    pdf.setFillColor(r, g, b);
    pdf.setDrawColor(220, 220, 220);
    pdf.rect(x, cy, cellSize, cellSize, "F");

    const day = parseInt(key.slice(8, 10), 10);
    pdf.setFontSize(7);
    pdf.setTextColor(60, 60, 60);
    pdf.text(String(day), x + cellSize / 2, cy + cellSize + 8, {
      align: "center",
    });
    pdf.setTextColor(0, 0, 0);
  });

  const heatRows = Math.ceil(dayKeys.length / cols);
  y = startY + heatRows * (cellSize + cellGap) + 22;

  // ==========================
  // 6. SECTION 2 – LEARNING SUMMARY
  // ==========================
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("2. Learning & Skills Summary", margin, y);
  y += 16;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Total learning XP this month: ${totalLearningXp}`, margin, y);
  y += 16;

  pdf.text("Top 3 highest skill gain:", margin, y);
  y += 10;

  if (!top3.length) {
    pdf.setFontSize(10);
    pdf.setTextColor(120, 120, 120);
    pdf.text("No learning data for this month.", margin, y);
    pdf.setTextColor(0, 0, 0);
    y += 18;
  } else {
    const barMaxWidth = pageWidth - margin * 2 - 60;
    const maxXp = top3[0][1] || 1;

    top3.forEach(([cat, xp]) => {
      const label = (typeof categoryLabel === "function")
        ? categoryLabel(cat)
        : cat;
      const width = (xp / maxXp) * barMaxWidth;

      pdf.setFontSize(10);
      pdf.text(label, margin, y);
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${xp} XP`, pageWidth - margin - 40, y);
      pdf.setTextColor(0, 0, 0);

      const barY = y + 4;
      pdf.setFillColor(255, 180, 67);
      pdf.setDrawColor(230, 230, 230);
      pdf.rect(margin, barY, width, 6, "F");
      y += 18;
    });
  }

  ensureSpace(40);
  pdf.setFontSize(11);
  pdf.text("Learning activity heatmap (XP per day):", margin, y);
  y += 10;

  // Heatmap learning (warna berdasarkan XP harian)
  const lCellSize = 10;
  const lCellGap = 2;
  const lCols = 14;
  const lStartY = y;

  dayKeys.forEach((key, idx) => {
    const row = Math.floor(idx / lCols);
    const col = idx % lCols;
    const x = margin + col * (lCellSize + lCellGap);
    const cy = lStartY + row * (lCellSize + lCellGap);

    const stats = computeLearningStatsForDate(key);
    const xp = stats.xp || 0;

    let r = 230, g = 230, b = 230;
    if (xp > 0 && xp < 20) { r = 219; g = 234; b = 254; }       // biru muda
    else if (xp >= 20 && xp < 50) { r = 147; g = 197; b = 253; } // biru medium
    else if (xp >= 50) { r = 59; g = 130; b = 246; }             // biru tua

    pdf.setFillColor(r, g, b);
    pdf.setDrawColor(220, 220, 220);
    pdf.rect(x, cy, lCellSize, lCellSize, "F");
  });

  const lHeatRows = Math.ceil(dayKeys.length / lCols);
  y = lStartY + lHeatRows * (lCellSize + lCellGap) + 24;
  // ==========================
  // 2B. SECTION – 4DX SUMMARY (MONTHLY)
  // ==========================
  if (fourdxPdf && fourdxPdf.overall && fourdxPdf.stats) {
    ensureSpace(120);

    pdf.setFont("helvetica", "bold");
pdf.setFontSize(13);

// month label dari report yang dipilih
// monthKey biasanya sudah ada dari flow exportPDF lo (mis. "2025-12")
const _m = (typeof monthKey !== "undefined" && monthKey) ? monthKey : "";
const _monthTitle = _m ? _m : "Selected Month";

pdf.text(`2B. 4DX Summary — ${_monthTitle}`, margin, y);
y += 10;

// range tanggal yang dipakai (berdasarkan dayKeys)
let _start = "-", _end = "-";
if (typeof dayKeys !== "undefined" && dayKeys && dayKeys.length) {
  _start = dayKeys[0];
  _end = dayKeys[dayKeys.length - 1];
}

pdf.setFont("helvetica", "normal");
pdf.setFontSize(10);
pdf.setTextColor(90, 90, 90);
pdf.text(`Period: ${_start} → ${_end}`, margin, y);
pdf.setTextColor(0, 0, 0);
y += 14;


    const total = fourdxPdf.overall.total || 0;
    const g = fourdxPdf.overall.green || 0;
    const yel = fourdxPdf.overall.yellow || 0;
    const r = fourdxPdf.overall.red || 0;

    const gp = total ? Math.round((g / total) * 100) : 0;
    const yp = total ? Math.round((yel / total) * 100) : 0;
    const rp = total ? Math.round((r / total) * 100) : 0;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(`Overall check-ins: ${total}`, margin, y); y += 14;
    pdf.text(`Green: ${gp}%  |  Yellow: ${yp}%  |  Red: ${rp}%`, margin, y); y += 16;

    // Mini bars per lead (simple & ringan)
    const barW = pageWidth - margin * 2;
    const barH = 10;

    fourdxPdf.stats.slice(0, 4).forEach((s) => {
      ensureSpace(28);

      const lt = (s.total || 0);
      const g2 = (s.green || 0);
      const y2 = (s.yellow || 0);
      const r2 = (s.red || 0);

      const g2p = lt ? (g2 / lt) : 0;
      const y2p = lt ? (y2 / lt) : 0;
      const r2p = lt ? (r2 / lt) : 0;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text(`• ${s.name || "-"}`, margin, y);
      y += 10;

      // outline
      pdf.setDrawColor(210, 210, 210);
      pdf.rect(margin, y, barW, barH);

      // green
      pdf.setFillColor(34, 197, 94);
      pdf.rect(margin, y, barW * g2p, barH, "F");

      // yellow
      pdf.setFillColor(234, 179, 8);
      pdf.rect(margin + barW * g2p, y, barW * y2p, barH, "F");

      // red
      pdf.setFillColor(239, 68, 68);
      pdf.rect(margin + barW * (g2p + y2p), y, barW * r2p, barH, "F");

      y += 16;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`(${lt} check-ins)`, margin, y);
      pdf.setTextColor(0, 0, 0);
      y += 12;
    });

    y += 6;
  }

  // =====================================================
  // 7. SECTION 3 – TASK DETAILS (PER DAY)
  // =====================================================
  ensureSpace(40);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("3. Task Details (per day)", margin, y);
  y += 20;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  dayKeys.forEach((key) => {
    const tasks = (appState.tasks && appState.tasks[key]) || [];
    if (!tasks.length) return;

    ensureSpace(18);
    const dateLabel = new Date(key + "T00:00:00").toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    pdf.setFont("helvetica", "bold");
    pdf.text(dateLabel, margin, y);
    y += 12;

    pdf.setFont("helvetica", "normal");
    tasks.forEach((t) => {
      ensureSpace(12);
      const status = t.status || "-";
      const effort = t.effort != null ? t.effort : "-";
      const xp = t.xp != null ? t.xp : 0;
      const name = t.name || t.title || "(no title)";

      const line = `• [${status} | Effort ${effort} | ${xp} XP] ${name}`;
      const wrapped = pdf.splitTextToSize(line, pageWidth - margin * 2 - 12);
      pdf.text(wrapped, margin + 12, y);
      y += wrapped.length * 11 + 2;
    });

    y += 4;
  });

  // =====================================================
  // 8. SECTION 4 – LEARNING & REFLECTION DETAILS
  // =====================================================
  ensureSpace(40);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("4. Learning & Reflection Details", margin, y);
  y += 20;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  dayKeys.forEach((key) => {
    const entries = (appState.learning && appState.learning[key]) || [];
    if (!entries.length) return;

    ensureSpace(18);
    const dateLabel = new Date(key + "T00:00:00").toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    pdf.setFont("helvetica", "bold");
    pdf.text(dateLabel, margin, y);
    y += 12;

    pdf.setFont("helvetica", "normal");

    entries.forEach((entry) => {
      ensureSpace(20);
      const cat = entry.category || "-";
      const sub = entry.subskill || entry.skill || "";
      const eff = entry.effort || "-";
      const xp =
        (window.LEARNING_XP_PER_EFFORT && window.LEARNING_XP_PER_EFFORT[entry.effort]) ||
        0;

      const titleLine = `• [${cat}${sub ? " – " + sub : ""} | Effort ${eff} | ${xp} XP]`;
      pdf.text(titleLine, margin + 12, y);
      y += 12;

      const parts = [];
      if (entry.topic) parts.push(entry.topic);
      if (entry.what) parts.push(entry.what);
      if (entry.note) parts.push(entry.note);
      if (entry.description) parts.push(entry.description);
      if (entry.benefit) parts.push("Benefit: " + entry.benefit);
      if (entry.reflection) parts.push("Reflection: " + entry.reflection);

      const detailText = parts.join(" | ");
      if (detailText) {
        const wrapped = pdf.splitTextToSize(
          detailText,
          pageWidth - margin * 2 - 24
        );
        pdf.text(wrapped, margin + 18, y);
        y += wrapped.length * 11 + 4;
      } else {
        y += 4;
      }
    });

    y += 4;
  });

  // ----- 9. Save file -----
  pdf.save("HeyHoLetsGo_Monthly_Report.pdf");
}


exportPdfBtn.addEventListener("click", exportPDF);

/* HO-HO MOOD & BOUNCE */
function updateHoHoMood(){
  const todayKey=getTodayKey();
  const tStats=computeTaskStatsForDate(todayKey);
  const lStats=computeLearningStatsForDate(todayKey);

  if(tStats.percent>=80) hohoTaskFloat.src="hoho-levelup.png";
  else if(tStats.percent>=40) hohoTaskFloat.src="hoho-pumped.png";
  else if(tStats.percent>0) hohoTaskFloat.src="hoho-sad.png";
  else hohoTaskFloat.src="hoho-happy.png";

  if(lStats.percent>=80) hohoLearningFloat.src="hoho-levelup.png";
  else if(lStats.percent>=40) hohoLearningFloat.src="hoho-book.png";
  else if(lStats.percent>0) hohoLearningFloat.src="hoho-thinking.png";
  else hohoLearningFloat.src="hoho-book.png";
}
function bounceOnce(el){
  if(!el) return;
  el.style.animation="none";
  void el.offsetWidth;
  el.style.animation="hohoBounce 0.6s cubic-bezier(0.34,1.56,0.64,1)";
}
hohoTaskFloat.addEventListener("click",()=>bounceOnce(hohoTaskFloat));
hohoLearningFloat.addEventListener("click",()=>bounceOnce(hohoLearningFloat));
function scheduleRandomBounce(){
  const delay=3500+Math.random()*2500;
  setTimeout(()=>{
    if(!hohoTaskFloat.classList.contains("hidden")) bounceOnce(hohoTaskFloat);
    if(!hohoLearningFloat.classList.contains("hidden")) bounceOnce(hohoLearningFloat);
    scheduleRandomBounce();
  },delay);
}
/* ================================
   4DX STATE & RENDER
================================ */

const FOURDX_STORAGE_KEY = "fourdx_v1";
const FOURDX_DAILY_KEY = "fourdx_daily_v1";

// Struktur utama 4DX
let fourdxState = {
  wig: "",
  lags: [],   // array string
  leads: []   // array string
};

// Struktur check-in harian:
// { "YYYY-MM-DD": ["green","yellow","red", ...] }
let fourdxDaily = {};

/* ---- Load / Save ke localStorage ---- */

function loadFourdxState() {
  try {
    const raw = localStorage.getItem(FOURDX_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    fourdxState = {
      wig: parsed.wig || "",
      lags: Array.isArray(parsed.lags) ? parsed.lags : [],
      leads: Array.isArray(parsed.leads) ? parsed.leads : []
    };
  } catch (e) {
    console.error("Error load 4DX:", e);
  }
}

function saveFourdxState() {
  try {
    localStorage.setItem(FOURDX_STORAGE_KEY, JSON.stringify(fourdxState));
  } catch (e) {
    console.error("Error save 4DX:", e);
  }
}

function loadFourdxDaily() {
  try {
    const raw = localStorage.getItem(FOURDX_DAILY_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      fourdxDaily = parsed;
    }
  } catch (e) {
    console.error("Error load 4DX daily:", e);
  }
}

function saveFourdxDaily() {
  try {
    localStorage.setItem(FOURDX_DAILY_KEY, JSON.stringify(fourdxDaily));
  } catch (e) {
    console.error("Error save 4DX daily:", e);
  }
}

/* ---- Helper: ambil isi input tanpa langsung save ---- */

function updateFourdxStateFromInputs() {
  const wigInput = document.getElementById("wigInput");
  const lagInputs = document.querySelectorAll('#lagList input[data-type="lag"]');
  const leadInputs = document.querySelectorAll('#leadList input[data-type="lead"]');

  if (wigInput) {
    fourdxState.wig = wigInput.value;
  }
  if (lagInputs.length > 0) {
    fourdxState.lags = Array.from(lagInputs).map(el => el.value);
  }
  if (leadInputs.length > 0) {
    fourdxState.leads = Array.from(leadInputs).map(el => el.value);
  }
}

/* ---- Helper periode ---- */

function getCurrentFourdxPeriod() {
  const sel = document.getElementById("fourdxPeriodSelect");
  if (!sel) return "last30";
  return sel.value || "last30";
}

/* ---- Hitung summary WEEKLY overall (green / yellow / red %) ---- */
function computeFourdxWeeklyOverall() {
  const todayKey = typeof getTodayKey === "function"
    ? getTodayKey()
    : new Date().toISOString().slice(0, 10);

  const today = new Date(todayKey + "T00:00:00");

  // Ambil 6 hari ke belakang + hari ini = 7 hari
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  let total = 0;
  let green = 0;
  let yellow = 0;
  let red = 0;

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const arr = fourdxDaily[key];
    if (!arr || !Array.isArray(arr)) continue;

    arr.forEach((status) => {
      if (!status) return;
      total += 1;
      if (status === "green") green += 1;
      else if (status === "yellow") yellow += 1;
      else if (status === "red") red += 1;
    });
  }

  if (total === 0) {
    return {
      totalCheckin: 0,
      greenPercent: 0,
      yellowPercent: 0,
      redPercent: 0,
      weekStart: start.toISOString().slice(0, 10),
      weekEnd: today.toISOString().slice(0, 10)
    };
  }

  const greenPercent = Math.round((green / total) * 100);
  const yellowPercent = Math.round((yellow / total) * 100);
  const redPercent = Math.round((red / total) * 100);

  return {
    totalCheckin: total,
    greenPercent,
    yellowPercent,
    redPercent,
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: today.toISOString().slice(0, 10)
  };
}

/* ---- Kirim summary 4DX weekly ke Apps Script ---- */
async function syncFourdxWeeklyToSheet() {
  const btn = document.getElementById("syncFourdxWeeklyBtn");
  const statusEl = document.getElementById("syncFourdxWeeklyStatus");

  if (!btn || !statusEl) return;

  // 🧠 Pakai ID yang BENAR dari Settings tab:
  const profileNameInput = document.getElementById("userNameInput");
  const positionInput = document.getElementById("userPositionInput");

  const userName = profileNameInput && profileNameInput.value.trim()
    ? profileNameInput.value.trim()
    : (appState.user?.name || "Unknown");

  const position = positionInput && positionInput.value.trim()
    ? positionInput.value.trim()
    : (appState.user?.position || "");

  const summary = computeFourdxWeeklyOverall();

  const payload = {
    userName,
    position,
    weekStart: summary.weekStart,
    weekEnd: summary.weekEnd,
    totalCheckin: summary.totalCheckin,
    greenPercent: summary.greenPercent,
    yellowPercent: summary.yellowPercent,
    redPercent: summary.redPercent
  };

  try {
    btn.disabled = true;
    btn.textContent = "Syncing 4DX...";
    statusEl.textContent = "";

    await fetch(FOURDX_WEEKLY_SYNC_URL, {
      method: "POST",
      mode: "no-cors",              // sama kayak weekly task
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify(payload)
    });

    statusEl.textContent = "4DX weekly terkirim (cek di Google Sheet).";
    statusEl.classList.remove("error");
  } catch (err) {
    console.error("Error sync 4DX weekly:", err);
    statusEl.textContent = "Gagal sync 4DX weekly.";
    statusEl.classList.add("error");
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "Sync 4DX Weekly";
    }, 800);
  }
}

/* ---- Hitung summary bulanan per lead ---- */
function computeFourdxMonthlyStats(periodKey) {
  const leads = fourdxState.leads || [];
  const stats = leads.map(name => ({
    name: name || "",
    red: 0,
    yellow: 0,
    green: 0,
    total: 0
  }));

  if (!leads.length) {
    return { stats, overall: { green: 0, total: 0 } };
  }

  const today = new Date();
  let startDate, endDate;

  if (periodKey === "month") {
    // This month: dari tanggal 1 sampai hari ini
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  } else {
    // Default: last 30 days (termasuk hari ini)
    endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 29);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  let overallGreen = 0;
  let overallTotal = 0;

  Object.keys(fourdxDaily || {}).forEach(key => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setHours(0, 0, 0, 0);

    if (dt < startDate || dt > endDate) return;

    const dayStatuses = fourdxDaily[key] || [];
    leads.forEach((_, idx) => {
      const s = dayStatuses[idx];
      if (s !== "red" && s !== "yellow" && s !== "green") return;
      stats[idx].total += 1;
      stats[idx][s] += 1;
      overallTotal += 1;
      if (s === "green") overallGreen += 1;
    });
  });

  return {
    stats,
    overall: { green: overallGreen, total: overallTotal }
  };
}

/* ---- Render Monthly Summary ---- */

function renderFourdxMonthlySummary(periodKey) {
  const overallEl = document.getElementById("fourdxMonthlyOverall");
  const container = document.getElementById("fourdxMonthlySummary");
  if (!overallEl || !container) return;

  const leads = fourdxState.leads || [];
  container.innerHTML = "";
  overallEl.innerHTML = "";

  if (!leads.length) {
    overallEl.innerHTML = `
      <div class="fourdx-summary-overall-emoji">🙂</div>
      <div class="fourdx-summary-overall-text">
        Set dulu Lead Measures untuk melihat progress bulanan.
      </div>
    `;
    const coachEl = document.getElementById("fourdxCoachText");
    if (coachEl) {
      coachEl.textContent =
        "Ho-Ho: Belum ada Lead Measure. Set dulu 1–4 lead utama sebelum mulai check-in harian.";
    }
    return;
  }

  const { stats, overall } = computeFourdxMonthlyStats(periodKey);
  const ratio = overall.total > 0 ? overall.green / overall.total : 0;

  let face = "🙂";
  if (overall.total === 0) {
    face = "😶";
  } else if (ratio < 0.4) {
    face = "😡";
  } else if (ratio < 0.7) {
    face = "😐";
  } else {
    face = "😄";
  }

  const ratioPercent = Math.round(ratio * 100);

  // Overall summary (emoji + text)
  overallEl.innerHTML = `
    <div class="fourdx-summary-overall-emoji">${face}</div>
    <div class="fourdx-summary-overall-text">
      ${
        overall.total === 0
          ? "Belum ada data check-in untuk periode ini."
          : `Overall green ratio: <strong>${ratioPercent}%</strong> di periode ini.`
      }
    </div>
  `;

  // --- HO-HO COACHING TEXT ---
  const coachEl = document.getElementById("fourdxCoachText");
  if (coachEl) {
    if (overall.total === 0) {
      coachEl.textContent =
        "Ho-Ho: Belum ada data untuk analisis, coba mulai check-in harian dulu ya!";
    } else if (ratio < 0.4) {
      coachEl.textContent =
        "Ho-Ho: Banyak hari merah nih. Pilih 1 lead paling penting dan fokus push itu minggu depan! 🔥";
    } else if (ratio < 0.7) {
      coachEl.textContent =
        "Ho-Ho: Lumayan! Masih banyak kuning. Coba tentuin 1 hari khusus buat 'push day'. ⚡";
    } else {
      coachEl.textContent =
        "Ho-Ho: Gokil! Disiplin lo lagi keren 😄🔥 Pertahankan streak bulan ini!";
    }
  }

  // Reset container sebelum render rows
  container.innerHTML = "";

  // Render per-lead rows + streak + badge
  stats.forEach((s, index) => {
    if (!s.name) return;

    const total = s.total;
    const greenPct = total > 0 ? Math.round((s.green / total) * 100) : 0;

    let wRed = 0,
      wYellow = 0,
      wGreen = 0;
    if (total > 0) {
      wRed = (s.red / total) * 100;
      wYellow = (s.yellow / total) * 100;
      wGreen = (s.green / total) * 100;
    }

    const glowClass = total > 0 && greenPct >= 70 ? " glow-green" : "";

    // --- Hitung streak green ke belakang (max 60 hari) ---
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 60; i++) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - i);
      const key = dt.toISOString().slice(0, 10);

      const daily = fourdxDaily[key];
      if (!daily || !daily[index]) break;
      if (daily[index] !== "green") break;

      streak++;
    }

    // Badge konsistensi
    let badge = "";
    if (greenPct >= 80) badge = "🔥 Excellent discipline";
    else if (greenPct >= 60) badge = "⚡ Solid consistency";
    else if (greenPct >= 40) badge = "🙂 Oke, masih bisa naik";
    else badge = "😟 Needs focus";

    container.insertAdjacentHTML(
      "beforeend",
      `
      <div class="fourdx-summary-row">
        <div class="fourdx-summary-lead-name">${s.name}</div>

        <div class="fourdx-summary-bar${glowClass}">
          <div class="fourdx-summary-seg-red" data-target-width="${wRed}"></div>
          <div class="fourdx-summary-seg-yellow" data-target-width="${wYellow}"></div>
          <div class="fourdx-summary-seg-green" data-target-width="${wGreen}"></div>
        </div>

        <div class="fourdx-summary-meta">
          ${
            total === 0
              ? "Belum ada check-in."
              : `Green ${s.green} hari · Yellow ${s.yellow} · Red ${s.red} — <strong>${greenPct}% green</strong>`
          }
        </div>

        <div class="fourdx-summary-meta" style="margin-top:4px;">
          🔥 Streak: <strong>${streak} hari</strong><br>
          🎯 ${badge}
        </div>
      </div>
      `
    );
  });

  // 🔋 Animasi "charge up" bar hijau/kuning/merah
  const bars = container.querySelectorAll(".fourdx-summary-bar");
  bars.forEach((bar) => {
    const segs = bar.querySelectorAll("[data-target-width]");

    // Set awal ke 0%
    segs.forEach((seg) => {
      seg.style.width = "0%";
    });

    // Next frame → isi ke target biar transition kepicu
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        segs.forEach((seg) => {
          const target = parseFloat(seg.getAttribute("data-target-width") || "0");
          seg.style.width = `${target}%`;
        });
      });
    });
  });
}

/* ---- Render utama tab 4DX ---- */

function render4DX() {
  const wigInput = document.getElementById("wigInput");
  const lagList = document.getElementById("lagList");
  const leadList = document.getElementById("leadList");

  if (!wigInput || !lagList || !leadList) return; // tab belum kebentuk

  // WIG
  wigInput.value = fourdxState.wig || "";

  // Lag Measures
  lagList.innerHTML = "";
  if (!fourdxState.lags.length) {
    lagList.textContent = "Belum ada Lag Measure.";
  } else {
    fourdxState.lags.forEach((text, index) => {
      lagList.insertAdjacentHTML(
        "beforeend",
        `
        <div class="measure-item">
          <input type="text"
                 value="${text.replace(/"/g, "&quot;")}"
                 data-type="lag"
                 data-index="${index}" />
          <button type="button"
                  class="measure-remove"
                  data-type="lag"
                  data-index="${index}">✕</button>
        </div>
        `
      );
    });
  }

  // Lead Measures
  leadList.innerHTML = "";
  if (!fourdxState.leads.length) {
    leadList.textContent = "Belum ada Lead Measure.";
  } else {
    fourdxState.leads.forEach((text, index) => {
      leadList.insertAdjacentHTML(
        "beforeend",
        `
        <div class="measure-item">
          <input type="text"
                 value="${text.replace(/"/g, "&quot;")}"
                 data-type="lead"
                 data-index="${index}" />
          <button type="button"
                  class="measure-remove"
                  data-type="lead"
                  data-index="${index}">✕</button>
        </div>
        `
      );
    });
  }

  // Daily check-in untuk hari ini
  renderFourdxDailyToday();

  // Monthly summary (pakai periode terpilih)
  renderFourdxMonthlySummary(getCurrentFourdxPeriod());
}

/* ---- Render daily emoji (hari ini) ---- */

function renderFourdxDailyToday() {
  const container = document.getElementById("leadDailyToday");
  if (!container) return;

  const leads = fourdxState.leads || [];
  container.innerHTML = "";

  if (!leads.length) {
    container.textContent = "Buat Lead Measures dulu untuk mulai check-in harian.";
    return;
  }

  const todayKey = typeof getTodayKey === "function"
    ? getTodayKey()
    : new Date().toISOString().slice(0, 10);

  const todayStatus = fourdxDaily[todayKey] || [];

  leads.forEach((leadName, index) => {
    const status = todayStatus[index] || null;

    container.insertAdjacentHTML(
      "beforeend",
      `
      <div class="lead-check-row" data-lead-index="${index}">
        <div class="lead-check-name">${leadName || `Lead ${index + 1}`}</div>
        <div class="lead-check-emojis">
          <div class="lead-check-emoji ${status === "red" ? "selected red" : ""}" data-status="red">😡</div>
          <div class="lead-check-emoji ${status === "yellow" ? "selected yellow" : ""}" data-status="yellow">😐</div>
          <div class="lead-check-emoji ${status === "green" ? "selected green" : ""}" data-status="green">😄</div>
        </div>
      </div>
      `
    );
  });
}

/* ---- Klik emoji: set status harian ---- */

function handleLeadEmojiClick(target) {
  const rowEl = target.closest(".lead-check-row");
  if (!rowEl) return;

  const leadIndex = parseInt(rowEl.getAttribute("data-lead-index"), 10);
  if (Number.isNaN(leadIndex)) return;

  const status = target.getAttribute("data-status");
  if (!status) return;

  const todayKey = typeof getTodayKey === "function"
    ? getTodayKey()
    : new Date().toISOString().slice(0, 10);

  const todayStatus = fourdxDaily[todayKey] || [];
  todayStatus[leadIndex] = status;
  fourdxDaily[todayKey] = todayStatus;
  saveFourdxDaily();

  // Bersihin highlight semua emoji di row ini
  const allInRow = rowEl.querySelectorAll(".lead-check-emoji");
  allInRow.forEach(el => {
    el.classList.remove("selected", "red", "yellow", "green");
  });

  // Tambahin class ke yang dipilih
  if (status === "red") {
    target.classList.add("selected", "red");
  } else if (status === "yellow") {
    target.classList.add("selected", "yellow");
  } else if (status === "green") {
    target.classList.add("selected", "green");
  }
}

/* ---- Tambah / Hapus Lag & Lead ---- */

function addLagMeasure() {
  updateFourdxStateFromInputs();
  if (fourdxState.lags.length >= 3) {
    alert("Maksimum 3 Lag Measures.");
    return;
  }
  fourdxState.lags.push("");
  render4DX();
}

function addLeadMeasure() {
  updateFourdxStateFromInputs();
  if (fourdxState.leads.length >= 4) {
    alert("Maksimum 4 Lead Measures.");
    return;
  }
  fourdxState.leads.push("");
  render4DX();
}

function removeMeasure(type, index) {
  updateFourdxStateFromInputs();
  if (type === "lag") {
    fourdxState.lags.splice(index, 1);
  } else if (type === "lead") {
    fourdxState.leads.splice(index, 1);
  }
  render4DX();
}

/* ---- Simpan (WIG + Lag + Lead) ---- */

function save4DXFromUI() {
  const wigInput = document.getElementById("wigInput");
  const lagInputs = document.querySelectorAll('#lagList input[data-type="lag"]');
  const leadInputs = document.querySelectorAll('#leadList input[data-type="lead"]');

  if (!wigInput) return;

  fourdxState.wig = wigInput.value.trim();
  fourdxState.lags = Array.from(lagInputs)
    .map(el => el.value.trim())
    .filter(Boolean);
  fourdxState.leads = Array.from(leadInputs)
    .map(el => el.value.trim())
    .filter(Boolean);

  saveFourdxState();
  render4DX(); // re-render supaya daily & monthly ikut update
  alert("4DX berhasil disimpan!");
}

/* ---- Init 4DX ---- */

function init4DX() {
  loadFourdxState();
  loadFourdxDaily();
  render4DX();

  const addLagBtn = document.getElementById("addLagBtn");
  const addLeadBtn = document.getElementById("addLeadBtn");
  const save4dxBtn = document.getElementById("save4dxBtn");
  const fourdxTab = document.getElementById("fourdxTab");
  const periodSelect = document.getElementById("fourdxPeriodSelect");

  if (addLagBtn) addLagBtn.addEventListener("click", addLagMeasure);
  if (addLeadBtn) addLeadBtn.addEventListener("click", addLeadMeasure);
  if (save4dxBtn) save4dxBtn.addEventListener("click", save4DXFromUI);

  if (periodSelect) {
    periodSelect.addEventListener("change", () => {
      renderFourdxMonthlySummary(getCurrentFourdxPeriod());
    });
  }

  // Delegasi click di dalam tab 4DX
  if (fourdxTab) {
    fourdxTab.addEventListener("click", (e) => {
      const target = e.target;

      // Tombol hapus Lag / Lead
      if (target.classList.contains("measure-remove")) {
        const type = target.getAttribute("data-type");
        const index = parseInt(target.getAttribute("data-index"), 10);
        if (!Number.isNaN(index)) {
          removeMeasure(type, index);
        }
        return;
      }

      // Emoji check-in
      if (target.classList.contains("lead-check-emoji")) {
        handleLeadEmojiClick(target);
      }
    });
  }
}

/* INIT */
document.addEventListener("DOMContentLoaded",()=>{
  loadState();
  applyTheme(appState.theme || "light");
  // 🔥 HOTFIX: matiin auto carry-over dulu biar refresh gak bikin aneh
  // carryOverFromYesterday();
  showTab("tasksTab");
  renderTasksForToday();
  renderTaskHeatmap();
  renderLearningForToday();
  renderLearningHeatmap();
  renderSkillProgress();
  renderTop3Skills();
  init4DX();
  renderProfile();
  scheduleRandomBounce();

  const syncWeeklyBtn = document.getElementById("syncWeeklyBtn");
  if (syncWeeklyBtn) {
    syncWeeklyBtn.addEventListener("click", () => {
      syncWeeklyToGoogleSheet();
    });
  }

  const syncFourdxWeeklyBtn = document.getElementById("syncFourdxWeeklyBtn");
  if (syncFourdxWeeklyBtn) {
    syncFourdxWeeklyBtn.addEventListener("click", () => {
      syncFourdxWeeklyToSheet();
    });
  }
});
