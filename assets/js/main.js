// HeyHoLetsGo – V1.3.7 STABLE
// Struktur: state.js terpisah, semua domain + UI di main.js
// Dipakai tim per 01 Desember 2025
const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzTUS-s1rX7dfJlzc7RCbxPmsqZXeIQo70FNRnNabpbjH6KenY4AxsWK0xSkimy8MCC/exec";
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

// ===== 4DX DOM (UI only for now) =====
const fourdxPeriodSelect = document.getElementById("fourdxPeriodSelect");
const fourdxOverallGreen = document.getElementById("fourdxOverallGreen");
const fourdxBatteryFill = document.getElementById("fourdxBatteryFill");
const fourdxBatteryPct = document.getElementById("fourdxBatteryPct");
const fourdxBatteryFraction = document.getElementById("fourdxBatteryFraction");

const fourdxMonthlyRows = document.getElementById("fourdxMonthlyRows");

const leadMeasuresList = document.getElementById("leadMeasuresList");
const addLeadMeasureBtn = document.getElementById("addLeadMeasureBtn");
const leadCheckinToday = document.getElementById("leadCheckinToday");

const lagMeasuresList = document.getElementById("lagMeasuresList");
const addLagMeasureBtn = document.getElementById("addLagMeasureBtn");

const wigInput = document.getElementById("wigInput");

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
[tasksTabEl, fourdxTabEl, learningTabEl, settingsTabEl].forEach(el=>el.classList.add("hidden"));
  if(tabId==="tasksTab") tasksTabEl.classList.remove("hidden");
  if(tabId==="fourdxTab") fourdxTabEl.classList.remove("hidden");
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
tabButtons.forEach(btn=>{
  btn.addEventListener("click", ()=> showTab(btn.dataset.tab));
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
function updateHoHoMood() {
  const todayKey = getTodayKey();
  const tStats = computeTaskStatsForDate(todayKey);
  const lStats = computeLearningStatsForDate(todayKey);

  // Ho-Ho di tab Tasks
  if (tStats.percent >= 80) hohoTaskFloat.src = "hoho-levelup.png";
  else if (tStats.percent >= 40) hohoTaskFloat.src = "hoho-pumped.png";
  else if (tStats.percent > 0) hohoTaskFloat.src = "hoho-sad.png";
  else hohoTaskFloat.src = "hoho-happy.png";

  // Ho-Ho di tab Learning
  if (lStats.percent >= 80) hohoLearningFloat.src = "hoho-levelup.png";
  else if (lStats.percent >= 40) hohoLearningFloat.src = "hoho-book.png";
  else if (lStats.percent > 0) hohoLearningFloat.src = "hoho-thinking.png";
  else hohoLearningFloat.src = "hoho-book.png";
}

function bounceOnce(el) {
  if (!el) return;
  el.style.animation = "none";
  void el.offsetWidth; // force reflow
  el.style.animation = "hohoBounce 0.6s cubic-bezier(0.34,1.56,0.64,1)";
}

hohoTaskFloat.addEventListener("click", () => bounceOnce(hohoTaskFloat));
hohoLearningFloat.addEventListener("click", () => bounceOnce(hohoLearningFloat));

function scheduleRandomBounce() {
  const delay = 3500 + Math.random() * 2500;
  setTimeout(() => {
    if (!hohoTaskFloat.classList.contains("hidden")) {
      bounceOnce(hohoTaskFloat);
    }
    if (!hohoLearningFloat.classList.contains("hidden")) {
      bounceOnce(hohoLearningFloat);
    }
    scheduleRandomBounce();
  }, delay);
}
// ===== 4DX RENDER (DUMMY UI) =====
function hohoIconForStatus(status){
  if(status === "GREEN") return "assets/emothoho/hoho4dx_green.png";
  if(status === "YELLOW") return "assets/emothoho/hoho4dx_yellow.png";
  return "assets/emothoho/hoho4dx_red.png";
}
function render4DXDummy() {
  if (!fourdxMonthlyRows) return;

  // Dummy: 4 Lead Measures (sesuai konsep max 4)
  const leads = [
    "Cross Selling 5 Brand per hari",
    "Reach Out 10 Talent SSS per hari",
    "Reach Out 8 Brand per hari",
    "Listing 15 KOL per hari",
  ];

  const periodVal = (fourdxPeriodSelect && fourdxPeriodSelect.value) || "30";
  const period = (periodVal === "month") ? new Date().getDate() : parseInt(periodVal, 10);

  // bikin emoji row sepanjang period
const makeStatusRow = (len) => {
  const arr = [];
  for (let i = 0; i < len; i++) {
    const r = Math.random();
    if (r < 0.70) arr.push("RED");
    else if (r < 0.88) arr.push("YELLOW");
    else arr.push("GREEN");
  }
  return arr;
};

  const rows = leads.map((name) => ({
    name,
    cells: makeStatusRow(period),
  }));

  // overall % green (dummy)
  let g = 0, total = 0;
  rows.forEach((row) => {
    row.cells.forEach((c) => {
      total++;
      if (c === "GREEN") g++;
    });
  });
  const pct = total ? Math.round((g / total) * 100) : 0;
  const forcePct = 95;
const pctDebug = forcePct;

  if (fourdxOverallGreen) fourdxOverallGreen.textContent = pct + "%";
    // Battery bar (dummy) – %green + fraction
  if (fourdxBatteryPct) fourdxBatteryPct.textContent = pct + "%";
  if (fourdxBatteryFill) fourdxBatteryFill.style.width = pct + "%";
  if (fourdxBatteryFraction) fourdxBatteryFraction.textContent = `${g}/${total}`;


  // Render Monthly Lead Progress (emoji berjejer)
  fourdxMonthlyRows.innerHTML = "";
  rows.forEach((row) => {
    const green = row.cells.filter((x) => x === "GREEN").length;
    const yellow = row.cells.filter((x) => x === "YELLOW").length;
    const red = row.cells.filter((x) => x === "RED").length;
    const greenPct = Math.round((green / (green + yellow + red)) * 100);

    const block = document.createElement("div");
      const gridHtml = row.cells.map((status) => `
  <div class="fourdx-emoji-cell" data-status="${status}">
    <img class="fourdx-icon" src="${hohoIconForStatus(status)}" alt="${status}">
  </div>
`).join("");

    block.className = "fourdx-lead-box";
    block.innerHTML = `
      <div class="fourdx-lead-head">
        <div style="font-weight:800;">${row.name}</div>
        <div style="font-size:12px;color:var(--text-light);white-space:nowrap;">
          <b>${greenPct}% green</b>
        </div>
      </div>

      <div class="fourdx-emoji-grid">
        ${gridHtml}
      </div>

      <div style="font-size:12px;color:var(--text-light);margin-top:8px;">
        Green ${green} · Yellow ${yellow} · Red ${red}
      </div>

      <div style="font-size:12px;margin-top:6px;">
        🔥 Streak: <b>0</b> hari
      </div>

      <div style="font-size:12px;margin-top:4px;color:var(--text-light);">
        🎯 ${greenPct < 50 ? "😡 Needs focus" : (greenPct < 80 ? "😐 Keep pushing" : "😄 Good job")}
      </div>
    `;
    
    fourdxMonthlyRows.appendChild(block);
  });

  // Render Lead Measures list (dummy input UI)
  if (leadMeasuresList) {
    leadMeasuresList.innerHTML = leads.map((name) => `
      <div style="display:flex;gap:10px;align-items:center;">
        <input type="text" value="${name}" style="flex:1;" />
        <button type="button" class="btn-ghost" style="width:42px;background:#f97373;color:#111827;">✕</button>
      </div>
    `).join("");
  }

   // Render Daily Lead Check-in (dummy buttons with hoho icons)
  if (leadCheckinToday) {
    leadCheckinToday.innerHTML = leads.map((name) => `
      <div data-lead="${name}" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div style="font-size:13px;font-weight:700;">${name}</div>

        <div style="display:flex;gap:10px;align-items:center;">
          <button type="button" class="fourdx-check-btn" data-status="RED"
            style="width:40px;height:40px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,0.65);display:flex;align-items:center;justify-content:center;">
            <img class="fourdx-icon" src="${hohoIconForStatus("RED")}" alt="RED" draggable="false">
          </button>

          <button type="button" class="fourdx-check-btn" data-status="YELLOW"
            style="width:40px;height:40px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,0.65);display:flex;align-items:center;justify-content:center;">
            <img class="fourdx-icon" src="${hohoIconForStatus("YELLOW")}" alt="YELLOW" draggable="false">
          </button>

          <button type="button" class="fourdx-check-btn" data-status="GREEN"
            style="width:40px;height:40px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,0.65);display:flex;align-items:center;justify-content:center;">
            <img class="fourdx-icon" src="${hohoIconForStatus("GREEN")}" alt="GREEN" draggable="false">
          </button>
        </div>
      </div>
    `).join("");
      // Click micro-animation + selected state (UI only)
  if (leadCheckinToday && !leadCheckinToday.dataset.bound) {
    leadCheckinToday.dataset.bound = "1";

    leadCheckinToday.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const btn = e.target.closest(".fourdx-check-btn");
      if (!btn) return;

      const row = btn.closest("[data-lead]");
      if (!row) return;

      // remove selected from other buttons in same row
      row.querySelectorAll(".fourdx-check-btn").forEach((b) => b.classList.remove("selected"));

      // mark selected
      btn.classList.add("selected");

  }


  // Render Lag Measures (dummy)
  if (lagMeasuresList) {
    lagMeasuresList.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;">
        <input type="text" value="Profit IFMN 200jt per bulan sepanjang 2026" style="flex:1;" />
        <button type="button" class="btn-ghost" style="width:42px;background:#f97373;color:#111827;">✕</button>
      </div>
    `;
  }

  // WIG dummy default
  if (wigInput && !wigInput.value) {
    wigInput.value = "Meningkatkan pertumbuhan revenue 30% YoY di 2026";
  }
}

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  // Load state awal
  loadState();

  // Theme
  applyTheme(appState.theme || "light");

  // Default buka tab Tasks
  showTab("tasksTab");

  // Render Tasks & Learning hari ini
  renderTasksForToday();
  renderTaskHeatmap();
  renderLearningForToday();
  renderLearningHeatmap();

  // Skill progress & top 3
  renderSkillProgress();
  renderTop3Skills();

  // Profile
  renderProfile();

  // Ho-Ho idle bounce
  scheduleRandomBounce();

  // 4DX UI (dummy)
  render4DXDummy();
  if (fourdxPeriodSelect) {
    fourdxPeriodSelect.addEventListener("change", render4DXDummy);
  }

  // 🔗 Hubungkan tombol Sync Weekly → fungsi syncWeeklyToGoogleSheet()
  const syncBtn = document.getElementById("syncWeeklyBtn");
  if (syncBtn) {
    syncBtn.addEventListener("click", () => {
      // Hindari double-klik terlalu cepat
      if (syncBtn.disabled) return;
      syncWeeklyToGoogleSheet();
    });
  }
});

  
