const STORAGE_KEY = "motionc-daily-prototype-v1";
const LIFESTYLE_SUMMARY_STORAGE_KEY = "motionc-lifestyle-summary-v1";
const PREFERENCES_STORAGE_KEY = "motionc-preferences-v1";
const WEIGHT_GOAL_STORAGE_KEY = "motionc-weight-goal-v1";
const KG_PER_LB = 0.45359237;
const KM_PER_MI = 1.609344;
const CM_PER_IN = 2.54;
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
let unitSystem = loadUnitSystem();

function loadUnitSystem() {
  try {
    return JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY))?.unitSystem === "metric"
      ? "metric"
      : "imperial";
  } catch {
    return "imperial";
  }
}

function saveUnitSystem(value) {
  unitSystem = value === "metric" ? "metric" : "imperial";
  localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ unitSystem, updatedAt: new Date().toISOString() }));
  window.dispatchEvent(new CustomEvent("motionc:preferences-updated", { detail: { unitSystem } }));
}

const displayWeight = pounds => unitSystem === "metric" ? pounds * KG_PER_LB : pounds;
const storedWeight = value => unitSystem === "metric" ? value / KG_PER_LB : value;
const displayDistance = miles => unitSystem === "metric" ? miles * KM_PER_MI : miles;
const storedDistance = value => unitSystem === "metric" ? value / KM_PER_MI : value;
const displayWaist = inches => unitSystem === "metric" ? inches * CM_PER_IN : inches;
const storedWaist = value => unitSystem === "metric" ? value / CM_PER_IN : value;
const weightUnit = () => unitSystem === "metric" ? "kg" : "lb";
const distanceUnit = () => unitSystem === "metric" ? "km" : "mi";
const waistUnit = () => unitSystem === "metric" ? "cm" : "in";
const formatWeight = pounds => `${displayWeight(Number(pounds)).toFixed(1)} ${weightUnit()}`;
const formatDistance = miles => `${displayDistance(Number(miles)).toFixed(2)} ${distanceUnit()}`;
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

function applyUnitSystem() {
  byId("weightUnit").textContent = weightUnit();
  byId("distanceUnit").textContent = distanceUnit();
  byId("waistUnit").textContent = waistUnit();
  byId("startWeightUnit").textContent = weightUnit();
  byId("lineWeightUnit").textContent = weightUnit();
  byId("goalWeightUnit").textContent = weightUnit();
  document.querySelectorAll('input[name="unitSystem"]').forEach(input => {
    input.checked = input.value === unitSystem;
  });
  if (fields.date.value) loadEntry(fields.date.value);
  renderAll(fields.date.value || isoDate());
}

let state = loadState();
syncLifestyleSummary();
let activeScoreDate = null;
let addingWalk = false;

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
  const weightRecordedPoint = entry.weight ? 1 : 0;
  const lifestyle = Math.min(10, roundHalf(Number(weeklyScore || 0) + weightRecordedPoint));
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
    const loaded = saved ? JSON.parse(saved) : seedState();
    const sharedVibratoryLine = Number(localStorage.getItem(WEIGHT_GOAL_STORAGE_KEY));
    if (sharedVibratoryLine > 0) {
      loaded.profile = loaded.profile || {};
      loaded.profile.vibratoryLine = sharedVibratoryLine;
    }
    return loaded;
  } catch {
    return seedState();
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function syncLifestyleSummary() {
  try {
    const summary = JSON.parse(localStorage.getItem(LIFESTYLE_SUMMARY_STORAGE_KEY));
    if (!summary?.week || !Number.isFinite(Number(summary.baseScore))) return false;

    const existing = state.weeks[summary.week];
    if (existing?.summaryUpdatedAt === summary.updatedAt && existing?.scoreLogicVersion === 2) return false;

    const waistPoint = state.profile.waist ? 1 : 0;
    const score = Math.min(9, roundHalf(Number(summary.baseScore) + waistPoint));

    state.weeks[summary.week] = {
      ...existing,
      values: summary.values || existing?.values || {},
      score,
      summaryScore: Number(summary.score),
      summaryUpdatedAt: summary.updatedAt,
      scoreLogicVersion: 2,
      updatedAt: new Date().toISOString()
    };
    persist();
    return true;
  } catch {
    return false;
  }
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
  addingWalk = false;
  fields.date.value = dateValue;
  fields.weight.value = entry?.weight ? displayWeight(Number(entry.weight)).toFixed(1) : "";
  fields.distance.value = entry?.distance ? displayDistance(Number(entry.distance)).toFixed(2) : "";
  fields.minutes.value = entry?.minutes ?? "";
  fields.weightNote.value = entry?.weightNote ?? "";
  fields.observation.value = entry?.observation ?? "";
  fields.noRestaurant.checked = entry?.noRestaurant ?? true;
  fields.noFastFood.checked = entry?.noFastFood ?? true;
  fields.noJunkFood.checked = entry?.noJunkFood ?? true;
  fields.oneTreat.checked = entry?.oneTreat ?? true;
  updateWalkEntryMode();
  renderToday(dateValue);
}

function readEntry() {
  const existing = state.entries[fields.date.value];
  const enteredWeight = fields.weight.value ? Number(fields.weight.value) : null;
  const enteredDistance = fields.distance.value ? Number(fields.distance.value) : 0;
  const unchangedWeight =
    existing?.weight &&
    enteredWeight === Number(displayWeight(Number(existing.weight)).toFixed(1));
  const unchangedDistance =
    existing?.distance &&
    enteredDistance === Number(displayDistance(Number(existing.distance)).toFixed(2));

  return {
    date: fields.date.value,
    weight: enteredWeight === null ? null : unchangedWeight ? Number(existing.weight) : storedWeight(enteredWeight),
    distance: unchangedDistance ? Number(existing.distance) : storedDistance(enteredDistance),
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

  if (addingWalk) {
    const existing = state.entries[entry.date];
    if (!existing) return;

    if (entry.distance <= 0 && entry.minutes <= 0) {
      byId("saveStatus").textContent = "Enter the distance or time for the additional walk.";
      return;
    }

    entry.distance = Math.round((Number(existing.distance || 0) + entry.distance) * 100) / 100;
    entry.minutes = Number(existing.minutes || 0) + entry.minutes;
  }

  const addedWalk = addingWalk;
  state.entries[entry.date] = entry;
  persist();
  loadEntry(entry.date);
  byId("saveStatus").textContent = addedWalk
    ? "Walk added. Today’s totals and score are updated."
    : "Saved. Today’s dot and weekly summary are updated.";
  window.setTimeout(() => byId("saveStatus").textContent = "", 3000);
  renderAll(entry.date);
}

function updateWalkEntryMode() {
  const entry = state.entries[fields.date.value];
  const hasSavedWalk = Number(entry?.distance || 0) > 0 || Number(entry?.minutes || 0) > 0;
  const addWalkButton = byId("addWalk");

  addWalkButton.hidden = !hasSavedWalk;
  addWalkButton.textContent = addingWalk ? "Cancel additional walk" : "+ Add another walk";
  byId("saveEntry").textContent = addingWalk ? "Add walk to today" : "Save today";
}

function toggleAddWalk() {
  if (addingWalk) {
    loadEntry(fields.date.value);
    byId("saveStatus").textContent = "";
    return;
  }

  const entry = state.entries[fields.date.value];
  if (!entry) return;

  addingWalk = true;
  fields.distance.value = "";
  fields.minutes.value = "";
  updateWalkEntryMode();
  byId("saveStatus").textContent = "Enter only the new walk. It will be added to today’s totals.";
  fields.distance.focus();
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
      const weightLabel = entry.weight ? ` · ${formatWeight(entry.weight)}` : "";
      dot.title = `${score.percent}% · ${colorLabel(score.color)}${weightLabel}`;
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
    ["Current weight", summary.weight ? formatWeight(summary.weight) : "—"],
    ["Weekly change", summary.change === 0 ? "No change" : `${summary.change < 0 ? "Down" : "Up"} ${displayWeight(Math.abs(summary.change)).toFixed(1)} ${weightUnit()}`],
    ["Distance", formatDistance(summary.totalDistance)],
    ["Walking streak", `${summary.streak} day${summary.streak === 1 ? "" : "s"}`],
    ["Longest walk", summary.longest ? formatDistance(summary.longest.distance) : "—"],
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
      <p>${formatDistance(old.totalDistance)} · ${old.average || 0}% average · ${old.entries.length} entries</p>`;
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
  const walkingDays = entries.filter(entry => Number(entry.distance || 0) > 0);
  const timedWalkingDays = walkingDays.filter(entry => Number(entry.minutes || 0) > 0);
  const weights = entries.filter(item => item.weight).map(item => item.weight);
  const lowest = weights.length ? Math.min(...weights) : null;
  const weightedEntries = entries.filter(item => Number(item.weight) > 0);
  const latestWeight = weightedEntries.length ? Number(weightedEntries.at(-1).weight) : null;
  const startWeight = Number(state.profile.startWeight);
  const totalMiles = entries.reduce((sum, item) => sum + Number(item.distance || 0), 0);
  const longest = longestWalk();
  const greenDays = entries.filter(item => ["green", "light-green"].includes(scoreForEntry(item).color)).length;
  const availableDots = entries.length;
  const positivePercentage = availableDots ? Math.round(greenDays / availableDots * 100) : 0;
  const vibratoryLine = state.profile.vibratoryLine;
  const displayedStart = displayWeight(startWeight);
  const decadeBoundary = Math.floor(displayedStart / 10) * 10;
  const decadeLabel = decadeBoundary - 10;
  const decadeReached = lowest ? displayWeight(lowest) < decadeBoundary : false;
  const totalDistance = displayDistance(totalMiles);
  const longestDistance = displayDistance(Number(longest?.distance || 0));
  const averageDailyDistance = walkingDays.length
    ? displayDistance(walkingDays.reduce((sum, entry) => sum + Number(entry.distance || 0), 0) / walkingDays.length)
    : 0;
  const averageDailyMinutes = timedWalkingDays.length
    ? timedWalkingDays.reduce((sum, entry) => sum + Number(entry.minutes || 0), 0) / timedWalkingDays.length
    : 0;
  const loss = displayWeight(Math.max(0, startWeight - (latestWeight ?? startWeight)));
  const weightTiers = unitSystem === "metric" ? [2.5, 5, 10, 20, 30, 50] : [5, 10, 25, 50, 75, 100];
  const distanceTiers = unitSystem === "metric" ? [50, 100, 250, 500, 1000] : [25, 50, 100, 250, 500, 1000];
  const walkTiers = unitSystem === "metric" ? [1, 5, 10, 21.1, 42.2] : [1, 3, 5, 10, 13.1, 26.2];
  const positiveTiers = [5, 10, 25, 50, 100, 250, 500];

  function progressive(value, tiers, labelFor, detailFor) {
    const completed = tiers.filter(tier => value >= tier);
    const highest = completed.at(-1);
    const next = tiers.find(tier => value < tier);
    const labelTier = highest || next || tiers.at(-1);
    const nextDetail = next ? ` · Next ${next}: ${Math.min(100, Math.round(value / next * 100))}%` : "";
    return {
      label: labelFor(labelTier),
      reached: Boolean(highest),
      detail: `${detailFor(value)}${nextDetail}`
    };
  }

  const milestoneData = [
    { label: "Total Weight Lost", reached: Number.isFinite(startWeight) && latestWeight !== null, detail: latestWeight !== null ? `${formatWeight(startWeight)} start → ${formatWeight(latestWeight)} latest (${loss.toFixed(1)} ${weightUnit()} lost)` : "Starting and latest weights needed" },
    { label: "Lowest Recorded Weight", reached: lowest !== null, detail: lowest !== null ? formatWeight(lowest) : "No weight recorded" },
    { label: "Vibratory Set Line", reached: Number.isFinite(Number(vibratoryLine)), detail: formatWeight(vibratoryLine) },
    { label: "Longest Daily Walk", reached: Boolean(longest), detail: longest ? `${longestDistance.toFixed(2)} ${distanceUnit()}` : "No walk recorded" },
    { label: `Total Cumulative ${unitSystem === "metric" ? "Kilometres" : "Miles"}`, reached: entries.length > 0, detail: `${totalDistance.toFixed(1)} ${distanceUnit()}` },
    { label: "Total Positive Dots", reached: availableDots > 0, detail: `${greenDays} / ${availableDots} (${positivePercentage}%)` }
  ];
  const reached = milestoneData.filter(item => item.reached);
  byId("milestoneCount").textContent = `${reached.length} tracked`;
  byId("latestMilestone").innerHTML = `<span>CURRENT PROGRESS</span><strong>${greenDays} / ${availableDots} Positive Dots</strong><small>${positivePercentage}% positive</small>`;
  byId("dailyWalkAverage").innerHTML = walkingDays.length
    ? `<span>DAILY WALK AVERAGE</span><strong>${averageDailyDistance.toFixed(2)} ${distanceUnit()}</strong>${averageDailyMinutes ? `<small>${Math.round(averageDailyMinutes)} min per walking day</small>` : `<small>Per walking day</small>`}`
    : `<span>DAILY WALK AVERAGE</span><strong>&mdash;</strong><small>Record a walk to begin</small>`;
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
    <div class="daily-measurement">
      <span>Weight recorded</span>
      <strong>${entry.weight ? formatWeight(entry.weight) : "Not recorded"}</strong>
      ${entry.weightNote ? `<small>${escapeHtml(entry.weightNote)}</small>` : ""}
    </div>
    <section class="score-section"><header><h3>Food</h3><strong>${score.food}/8</strong></header><ul>
      ${promiseLine("No restaurant meal", entry.noRestaurant)}
      ${promiseLine("No fast food", entry.noFastFood)}
      ${promiseLine("No junk food", entry.noJunkFood)}
      ${promiseLine("Stayed within one treat", entry.oneTreat)}
    </ul><p class="impact">Impact: ${dailyImpact}</p></section>
    <section class="score-section"><header><h3>Movement</h3><strong>${score.movement}/12</strong></header><ul>
      <li><span>Walking time</span><strong>${entry.minutes || 0} min</strong></li>
      <li><span>Distance</span><strong>${formatDistance(entry.distance || 0)}</strong></li>
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
  byId("weeklyWaist").value = displayWaist(state.profile.waist).toFixed(1);
  byId("startingWeight").value = displayWeight(state.profile.startWeight).toFixed(1);
  byId("vibratoryLine").value = displayWeight(state.profile.vibratoryLine).toFixed(1);
  byId("motivationalGoal").value = displayWeight(state.profile.motivationalGoal).toFixed(1);
}

function saveWeekly() {
  const values = {};
  document.querySelectorAll("[data-lifestyle]").forEach(select => values[select.dataset.lifestyle] = Number(select.value));
  const lifestyleBase = Object.values(values).reduce((sum, value) => sum + value, 0);
  const waistPoint = byId("weeklyWaist").value ? 1 : 0;
  const score = Math.min(9, roundHalf(lifestyleBase + waistPoint));
  state.weeks[weekKey(new Date())] = { values, score, scoreLogicVersion: 2, updatedAt: new Date().toISOString() };
  state.profile.startWeight = byId("startingWeight").value ? storedWeight(Number(byId("startingWeight").value)) : state.profile.startWeight;
  state.profile.waist = byId("weeklyWaist").value ? storedWaist(Number(byId("weeklyWaist").value)) : state.profile.waist;
  state.profile.vibratoryLine = byId("vibratoryLine").value ? storedWeight(Number(byId("vibratoryLine").value)) : state.profile.vibratoryLine;
  localStorage.setItem(WEIGHT_GOAL_STORAGE_KEY, String(state.profile.vibratoryLine));
  state.profile.motivationalGoal = byId("motivationalGoal").value ? storedWeight(Number(byId("motivationalGoal").value)) : state.profile.motivationalGoal;
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
byId("addWalk").addEventListener("click", toggleAddWalk);
byId("todayOrb").addEventListener("click", () => activeScoreDate && openScore(activeScoreDate));
byId("explainToday").addEventListener("click", () => activeScoreDate && openScore(activeScoreDate));
byId("closeScore").addEventListener("click", () => byId("scoreDialog").close());
byId("scoreDialog").addEventListener("click", event => {
  const dialog = event.currentTarget;
  const bounds = dialog.getBoundingClientRect();
  const clickedBackdrop =
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom;

  if (clickedBackdrop) dialog.close();
});
byId("weeklyButton").addEventListener("click", () => {
  buildLifestyleForm();
  byId("weeklyDialog").showModal();
});
byId("closeWeekly").addEventListener("click", () => byId("weeklyDialog").close());
byId("saveWeekly").addEventListener("click", saveWeekly);
window.addEventListener("focus", () => {
  if (syncLifestyleSummary()) renderAll(fields.date.value);
});
window.addEventListener("storage", event => {
  if (event.key === LIFESTYLE_SUMMARY_STORAGE_KEY && syncLifestyleSummary()) {
    renderAll(fields.date.value);
  }
  if (event.key === PREFERENCES_STORAGE_KEY) {
    unitSystem = loadUnitSystem();
    applyUnitSystem();
  }
});

function closePreferences() {
  byId("preferencesMenu").hidden = true;
  byId("preferencesToggle").setAttribute("aria-expanded", "false");
}

byId("preferencesToggle").addEventListener("click", event => {
  event.preventDefault();
  event.stopPropagation();
  const menu = byId("preferencesMenu");
  menu.hidden = !menu.hidden;
  byId("preferencesToggle").setAttribute("aria-expanded", String(!menu.hidden));
});
byId("preferencesMenu").addEventListener("click", event => event.stopPropagation());
byId("preferencesClose").addEventListener("click", closePreferences);
document.addEventListener("click", closePreferences);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closePreferences();
});

document.querySelectorAll('input[name="unitSystem"]').forEach(input => {
  input.addEventListener("change", () => {
    saveUnitSystem(input.value);
    applyUnitSystem();
  });
});

persist();
loadEntry(isoDate());
renderAll();
applyUnitSystem();
