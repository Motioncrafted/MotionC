const STORAGE_KEY = "motionc-daily-prototype-v1";
const LIFESTYLE_ITEMS = [
  ["sleep", "Sleep quality"],
  ["hydration", "Hydration"],
  ["nutrition", "Nutrition"],
  ["activity", "Activity level"],
  ["stress", "Stress management"],
  ["alcohol", "Alcohol"],
  ["smoking", "Smoking"],
  ["movement", "Daily movement"]
];

const byId = id => document.getElementById(id);
const fields = {
  date: byId("entryDate"),
  weight: byId("weight"),
  distance: byId("distance"),
  minutes: byId("minutes"),
  weightNote: byId("weightNote"),
  observation: byId("observation"),
  noRestaurant: byId("noRestaurant"),
  noFastFood: byId("noFastFood"),
  noJunkFood: byId("noJunkFood"),
  oneTreat: byId("oneTreat")
};

let state = loadState();
let activeScoreDate = null;

function isoDate(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function dateFromIso(value) {
  return new Date(`${value}T12:00:00`);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function weekKey(date) {
  return isoDate(startOfWeek(date));
}

function roundHalf(value) {
  return Math.round(value * 2) / 2;
}

function calculateEntry(entry, weeklyScore) {
  const promiseKeys = ["noRestaurant", "noFastFood", "noJunkFood", "oneTreat"];
  const food = promiseKeys.reduce((total, key) => total + (entry[key] ? 2 : 0), 0);
  const distancePoints = Math.min(6, Number(entry.distance || 0) / 5 * 6);
  const timePoints = Math.min(6, Number(entry.minutes || 0) / 60 * 6);
  const movement = roundHalf(distancePoints + timePoints);
  const lifestyle = roundHalf(Number(weeklyScore || 0));
  const total = roundHalf(food + movement + lifestyle);
  const percent = Math.round(total / 30 * 100);
  return { food, movement, lifestyle, total, percent, color: colorFor(percent) };
}

function colorFor(percent) {
  if (percent >= 85) return "green";
  if (percent >= 70) return "light-green";
  if (percent >= 50) return "yellow";
  if (percent >= 30) return "orange";
  return "red";
}

function colorLabel(color) {
  return color.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
}

function seedState() {
  const today = new Date();
  const entries = {};
  const distances = [2.4, 3.1, 0, 4.2, 5.4, 2.8, 0, 3.7, 4.9, 2.1, 5.8, 0, 6.1, 4.3, 3.6, 5.2, 4.7, 0, 5.36, 3.9, 0];
  const weights = [203.2, 202.8, 202.9, 202.3, 201.9, 201.6, 201.8, 201.1, 200.8, 200.4, 200.6, 200.1, 199.8, 199.6, 199.4, 199.7, 199.2, 198.9, 198.7, 198.8, 198.5];

  for (let index = 20; index >= 0; index -= 1) {
    const date = addDays(today, -index);
    const arrayIndex = 20 - index;
    const distance = distances[arrayIndex];
    const promises = {
      noRestaurant: arrayIndex !== 5 && arrayIndex !== 15,
      noFastFood: arrayIndex !== 9,
      noJunkFood: arrayIndex !== 3 && arrayIndex !== 17,
      oneTreat: arrayIndex !== 12
    };
    const minutes = distance ? Math.round(distance * (18 + (arrayIndex % 4))) : 0;
    entries[isoDate(date)] = {
      date: isoDate(date),
      weight: weights[arrayIndex],
      distance,
      minutes,
      weightNote: arrayIndex === 12 ? "Entered the 190s" : "",
      observation: arrayIndex === 18 ? "Long route felt easier today" : "",
      ...promises,
      updatedAt: new Date().toISOString()
    };
  }

  const currentWeek = weekKey(today);
  const previousWeek = weekKey(addDays(today, -7));
  const earlierWeek = weekKey(addDays(today, -14));
  return {
    entries,
    weeks: {
      [earlierWeek]: weeklyTemplate(6),
      [previousWeek]: weeklyTemplate(7),
      [currentWeek]: weeklyTemplate(6.5)
    },
    profile: {
      waist: 38.5,
      vibratoryLine: 200,
      motivationalGoal: 195,
      startWeight: 217
    }
  };
}

function weeklyTemplate(score) {
  const values = {};
  LIFESTYLE_ITEMS.forEach(([key], index) => {
    values[key] = index < Math.round(score) ? 1 : index < Math.round(score) + 2 ? .5 : 0;
  });
  return { values, score, updatedAt: new Date().toISOString() };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seedState();
  } catch {
    return seedState();
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function weeklyForDate(dateValue) {
  const key = weekKey(dateFromIso(dateValue));
  return state.weeks[key] || weeklyTemplate(6);
}

function scoreForEntry(entry) {
  return calculateEntry(entry, weeklyForDate(entry.date).score);
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(dateFromIso(value));
}

function formatFullDate(value) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(dateFromIso(value));
}

function loadEntry(dateValue) {
  const entry = state.entries[dateValue];
  fields.date.value = dateValue;
  fields.weight.value = entry?.weight ?? "";
  fields.distance.value = entry?.distance ?? "";
  fields.minutes.value = entry?.minutes ?? "";
  fields.weightNote.value = entry?.weightNote ?? "";
  fields.observation.value = entry?.observation ?? "";
  fields.noRestaurant.checked = entry?.noRestaurant ?? true;
  fields.noFastFood.checked = entry?.noFastFood ?? true;
  fields.noJunkFood.checked = entry?.noJunkFood ?? true;
  fields.oneTreat.checked = entry?.oneTreat ?? true;
  renderToday(dateValue);
}

function readEntry() {
  return {
    date: fields.date.value,
    weight: fields.weight.value ? Number(fields.weight.value) : null,
    distance: fields.distance.value ? Number(fields.distance.value) : 0,
    minutes: fields.minutes.value ? Number(fields.minutes.value) : 0,
    weightNote: fields.weightNote.value.trim(),
    observation: fields.observation.value.trim(),
    noRestaurant: fields.noRestaurant.checked,
    noFastFood: fields.noFastFood.checked,
    noJunkFood: fields.noJunkFood.checked,
    oneTreat: fields.oneTreat.checked,
    updatedAt: new Date().toISOString()
  };
}

function saveEntry() {
  const entry = readEntry();
  if (!entry.date) return;
  state.entries[entry.date] = entry;
  persist();
  byId("saveStatus").textContent = "Saved. Today’s dot and weekly summary are updated.";
  window.setTimeout(() => byId("saveStatus").textContent = "", 3000);
  renderAll(entry.date);
}

function renderToday(dateValue) {
  const entry = state.entries[dateValue];
  const orb = byId("todayOrb");
  orb.className = "score-orb";
  if (!entry) {
    byId("todayPercent").textContent = "—";
    byId("todayColor").textContent = "Save today to create your dot";
    orb.classList.add("future");
    return;
  }
  const score = scoreForEntry(entry);
  orb.classList.add(score.color);
  byId("todayPercent").textContent = `${score.percent}%`;
  byId("todayColor").textContent = `${colorLabel(score.color)} · ${score.total}/30`;
  activeScoreDate = dateValue;
}

function renderCalendar(focusDateValue) {
  const focus = dateFromIso(focusDateValue);
  const year = focus.getFullYear();
  const month = focus.getMonth();
  byId("calendarTitle").textContent = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(focus);
  const first = new Date(year, month, 1, 12);
  const lastDay = new Date(year, month + 1, 0, 12).getDate();
  const grid = byId("calendarGrid");
  grid.replaceChildren();

  for (let blank = 0; blank < first.getDay(); blank += 1) {
    const cell = document.createElement("div");
    cell.className = "calendar-day empty";
    grid.append(cell);
  }

  for (let day = 1; day <= lastDay; day += 1) {
    const value = isoDate(new Date(year, month, day, 12));
    const entry = state.entries[value];
    const cell = document.createElement("div");
    cell.className = "calendar-day";
    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = day;
    cell.append(number);
    const dot = document.createElement("button");
    dot.className = "dot";
    if (entry) {
      const score = scoreForEntry(entry);
      dot.classList.add(score.color);
      dot.title = `${score.percent}% · ${colorLabel(score.color)}`;
      dot.addEventListener("click", () => openScore(value));
    } else {
      dot.classList.add("future");
      dot.disabled = true;
      dot.title = value > isoDate() ? "Future day" : "No entry";
    }
    cell.append(dot);
    grid.append(cell);
  }
}

function entriesInRange(start, end) {
  return Object.values(state.entries)
    .filter(entry => {
      const date = dateFromIso(entry.date);
      return date >= start && date <= end;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function currentStreak(entries) {
  if (!entries.length) return 0;
  let streak = 0;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (Number(entries[index].distance || 0) <= 0) break;
    streak += 1;
  }
  return streak;
}

function weeklySummary(start) {
  const end = addDays(start, 6);
  const entries = entriesInRange(start, end);
  const weights = entries.filter(item => item.weight).map(item => item.weight);
  const totalDistance = entries.reduce((sum, item) => sum + Number(item.distance || 0), 0);
  const longest = entries.reduce((best, item) => Number(item.distance || 0) > Number(best?.distance || 0) ? item : best, null);
  const percentages = entries.map(item => scoreForEntry(item).percent);
  return {
    entries,
    weight: weights.at(-1),
    change: weights.length > 1 ? weights.at(-1) - weights[0] : 0,
    totalDistance,
    streak: currentStreak(entries),
    longest,
    average: percentages.length ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) : 0
  };
}

function renderWeekly() {
  const start = startOfWeek(new Date());
  const end = addDays(start, 6);
  byId("weekRange").textContent = `${formatShortDate(isoDate(start))}–${formatShortDate(isoDate(end))}`;
  const summary = weeklySummary(start);
  const stats = [
    ["Current weight", summary.weight ? `${summary.weight.toFixed(1)} lb` : "—"],
    ["Weekly change", summary.change === 0 ? "No change" : `${summary.change < 0 ? "Down" : "Up"} ${Math.abs(summary.change).toFixed(1)} lb`],
    ["Distance", `${summary.totalDistance.toFixed(2)} mi`],
    ["Walking streak", `${summary.streak} day${summary.streak === 1 ? "" : "s"}`],
    ["Longest walk", summary.longest ? `${summary.longest.distance.toFixed(2)} mi` : "—"],
    ["Average dot", summary.average ? `${summary.average}%` : "—"]
  ];
  byId("weeklyStats").innerHTML = stats.map(([label, value]) =>
    `<div class="weekly-stat"><span>${label}</span><strong>${value}</strong></div>`
  ).join("");
  const notes = summary.entries.filter(entry => entry.weightNote || entry.observation);
  byId("weeklyNotes").innerHTML = notes.length
    ? notes.map(entry => `<p><strong>${formatShortDate(entry.date)}:</strong> ${escapeHtml(entry.weightNote || entry.observation)}</p>`).join("")
    : "<p>No notes recorded this week.</p>";

  const previous = byId("previousWeeks");
  previous.replaceChildren();
  for (let offset = 1; offset <= 3; offset += 1) {
    const weekStart = addDays(start, -7 * offset);
    const weekEnd = addDays(weekStart, 6);
    const old = weeklySummary(weekStart);
    const block = document.createElement("div");
    block.className = "previous-week";
    block.innerHTML = `<strong>${formatShortDate(isoDate(weekStart))}–${formatShortDate(isoDate(weekEnd))}</strong>
      <p>${old.totalDistance.toFixed(2)} miles · ${old.average || 0}% average · ${old.entries.length} entries</p>`;
    previous.append(block);
  }
}

function longestWalk() {
  return Object.values(state.entries).reduce((best, entry) =>
    Number(entry.distance || 0) > Number(best?.distance || 0) ? entry : best, null
  );
}

function renderMilestones() {
  const entries = Object.values(state.entries).sort((a, b) => a.date.localeCompare(b.date));
  const weights = entries.filter(item => item.weight).map(item => item.weight);
  const lowest = weights.length ? Math.min(...weights) : null;
  const startWeight = state.profile.startWeight;
  const totalMiles = entries.reduce((sum, item) => sum + Number(item.distance || 0), 0);
  const longest = longestWalk();
  const greenDays = entries.filter(item => ["green", "light-green"].includes(scoreForEntry(item).color)).length;
  const vibratoryLine = state.profile.vibratoryLine;
  const milestoneData = [
    { label: "First 5 pounds", reached: lowest <= startWeight - 5, detail: `${Math.max(0, startWeight - (lowest || startWeight)).toFixed(1)} lb down` },
    { label: "Entered the 190s", reached: lowest < 200, detail: lowest ? `${lowest.toFixed(1)} lb` : "Not yet" },
    { label: "Crossed the Vibratory Line", reached: lowest < vibratoryLine, detail: `${vibratoryLine} lb line` },
    { label: "First 5-mile walk", reached: Number(longest?.distance || 0) >= 5, detail: longest ? `${longest.distance.toFixed(2)} mi` : "Not yet" },
    { label: "50 cumulative miles", reached: totalMiles >= 50, detail: `${totalMiles.toFixed(1)} mi` },
    { label: "Five positive dots", reached: greenDays >= 5, detail: `${greenDays} days` }
  ];
  const reached = milestoneData.filter(item => item.reached);
  byId("milestoneCount").textContent = `${reached.length} reached`;
  const latest = reached.at(-1) || milestoneData[0];
  byId("latestMilestone").innerHTML = `<span>${latest.reached ? "LATEST ACHIEVEMENT" : "NEXT MILESTONE"}</span><strong>${latest.label}</strong><small>${latest.detail}</small>`;
  byId("milestoneList").innerHTML = milestoneData.map(item =>
    `<div class="milestone-item ${item.reached ? "" : "locked"}"><i>${item.reached ? "✓" : "·"}</i><span>${item.label}</span><small>${item.detail}</small></div>`
  ).join("");
}

function promiseLine(label, passed) {
  return `<li><span>${label}</span><strong>${passed ? "✓" : "✕"}</strong></li>`;
}

function openScore(dateValue) {
  const entry = state.entries[dateValue];
  if (!entry) return;
  const score = scoreForEntry(entry);
  const weekly = weeklyForDate(dateValue);
  const weak = Object.entries(weekly.values || {}).filter(([, value]) => value < 1).map(([key]) => LIFESTYLE_ITEMS.find(item => item[0] === key)?.[1]).filter(Boolean);
  const dailyImpact = score.food >= 8 ? "Strong positive" : score.food >= 6 ? "Mild negative" : "Needs attention";
  const moveImpact = score.movement >= 9 ? "Strong positive" : score.movement >= 5 ? "Positive" : "Limited movement";
  const lifestyleImpact = score.lifestyle >= 8 ? "Strong" : score.lifestyle >= 6 ? "Moderate" : "Moderate negative";
  byId("scoreDetails").innerHTML = `
    <p class="eyebrow">${escapeHtml(formatFullDate(dateValue).toUpperCase())}</p>
    <div class="score-summary"><span class="dot ${score.color}"></span><div><h2>${score.percent}% · ${colorLabel(score.color)}</h2><span>${score.total}/30 points</span></div></div>
    <section class="score-section"><header><h3>Food</h3><strong>${score.food}/8</strong></header><ul>
      ${promiseLine("No restaurant meal", entry.noRestaurant)}
      ${promiseLine("No fast food", entry.noFastFood)}
      ${promiseLine("No junk food", entry.noJunkFood)}
      ${promiseLine("Stayed within one treat", entry.oneTreat)}
    </ul><p class="impact">Impact: ${dailyImpact}</p></section>
    <section class="score-section"><header><h3>Movement</h3><strong>${score.movement}/12</strong></header><ul>
      <li><span>Walking time</span><strong>${entry.minutes || 0} min</strong></li>
      <li><span>Distance</span><strong>${Number(entry.distance || 0).toFixed(2)} mi</strong></li>
    </ul><p class="impact">Impact: ${moveImpact}</p></section>
    <section class="score-section"><header><h3>Your lifestyle this week</h3><strong>${score.lifestyle}/10</strong></header>
      <p>${weak.length ? `Needs attention: ${escapeHtml(weak.slice(0, 3).join(", "))}.` : "Your weekly lifestyle is supporting today’s dot."}</p>
      <p class="impact">Impact: ${lifestyleImpact}</p></section>
    <p class="score-conclusion">${score.movement >= 8 ? "Your movement was strong today. " : ""}${score.lifestyle < 6 ? "This week’s lifestyle is lowering the overall result slightly." : "Your weekly foundation is supporting today’s choices."}</p>`;
  byId("scoreDialog").showModal();
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function buildLifestyleForm() {
  const week = weeklyForDate(isoDate());
  byId("lifestyleGrid").innerHTML = LIFESTYLE_ITEMS.map(([key, label]) => `
    <label>${label}
      <select data-lifestyle="${key}">
        <option value="0" ${week.values?.[key] === 0 ? "selected" : ""}>Needs attention</option>
        <option value="0.5" ${week.values?.[key] === .5 ? "selected" : ""}>Fair</option>
        <option value="1" ${week.values?.[key] === 1 ? "selected" : ""}>Supporting me</option>
      </select>
    </label>`).join("");
  byId("weeklyWaist").value = state.profile.waist;
  byId("vibratoryLine").value = state.profile.vibratoryLine;
  byId("motivationalGoal").value = state.profile.motivationalGoal;
}

function saveWeekly() {
  const values = {};
  document.querySelectorAll("[data-lifestyle]").forEach(select => values[select.dataset.lifestyle] = Number(select.value));
  const lifestyleBase = Object.values(values).reduce((sum, value) => sum + value, 0);
  const entries = Object.values(state.entries).filter(item => item.weight);
  const recentWeights = entries.sort((a, b) => a.date.localeCompare(b.date)).slice(-7).map(item => item.weight);
  const spread = recentWeights.length ? Math.max(...recentWeights) - Math.min(...recentWeights) : 99;
  const stabilityPoint = spread <= 3 ? 1 : spread <= 5 ? .5 : 0;
  const waistPoint = byId("weeklyWaist").value ? 1 : 0;
  const score = Math.min(10, roundHalf(lifestyleBase + stabilityPoint + waistPoint));
  state.weeks[weekKey(new Date())] = { values, score, updatedAt: new Date().toISOString() };
  state.profile.waist = Number(byId("weeklyWaist").value || state.profile.waist);
  state.profile.vibratoryLine = Number(byId("vibratoryLine").value || state.profile.vibratoryLine);
  state.profile.motivationalGoal = Number(byId("motivationalGoal").value || state.profile.motivationalGoal);
  persist();
  byId("weeklyDialog").close();
  renderAll(fields.date.value);
}

function renderAll(dateValue = isoDate()) {
  const now = new Date();
  byId("heroWeekday").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(now);
  byId("heroDate").textContent = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(now);
  renderToday(dateValue);
  renderCalendar(dateValue);
  renderWeekly();
  renderMilestones();
}

fields.date.addEventListener("change", () => loadEntry(fields.date.value));
byId("saveEntry").addEventListener("click", saveEntry);
byId("todayOrb").addEventListener("click", () => activeScoreDate && openScore(activeScoreDate));
byId("explainToday").addEventListener("click", () => activeScoreDate && openScore(activeScoreDate));
byId("closeScore").addEventListener("click", () => byId("scoreDialog").close());
byId("weeklyButton").addEventListener("click", () => {
  buildLifestyleForm();
  byId("weeklyDialog").showModal();
});
byId("closeWeekly").addEventListener("click", () => byId("weeklyDialog").close());
byId("saveWeekly").addEventListener("click", saveWeekly);

persist();
loadEntry(isoDate());
renderAll();
