const STORAGE_KEY = "motionc-daily-prototype-v1";
const LIFESTYLE_SUMMARY_STORAGE_KEY = "motionc-lifestyle-summary-v1";
const PREFERENCES_STORAGE_KEY = "motionc-preferences-v1";
const WEIGHT_GOAL_STORAGE_KEY = "motionc-weight-goal-v1";
const WEEKLY_NUDGE_STORAGE_KEY = "motionc-weekly-checkin-nudge-v1";
const KG_PER_LB = 0.45359237;
const KM_PER_MI = 1.609344;
const CM_PER_IN = 2.54;
const ML_PER_FL_OZ = 29.5735;
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
const WEEKLY_REFLECTIONS = [
  "I may not be there yet, but I’m closer than I was yesterday.",
  "Change Happens One Step at a Time.",
  "All Truly Great Thoughts are Conceived While Walking.",
  "Strive for <u>Progress</u>, not Perfection.",
  "MotionC wasn’t built in one giant leap. It was built the same way change happens: one deliberate step at a time.",
  "MotionC doesn’t punish the gap. It welcomes the return.",
  "I Don’t Know Where I Am Going, But I Sure Ain’t Lost."
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
const displayHeight = inches => unitSystem === "metric" ? inches * CM_PER_IN : inches;
const storedHeight = value => unitSystem === "metric" ? value / CM_PER_IN : value;
const weightUnit = () => unitSystem === "metric" ? "kg" : "lb";
const distanceUnit = () => unitSystem === "metric" ? "km" : "mi";
const waistUnit = () => unitSystem === "metric" ? "cm" : "in";
const hydrationUnit = () => unitSystem === "metric" ? "mL" : "oz";
const displayHydration = ounces => unitSystem === "metric" ? ounces * ML_PER_FL_OZ : ounces;
const storedHydration = value => unitSystem === "metric" ? value / ML_PER_FL_OZ : value;
const formatWeight = pounds => `${displayWeight(Number(pounds)).toFixed(1)} ${weightUnit()}`;
const formatDistance = miles => `${displayDistance(Number(miles)).toFixed(2)} ${distanceUnit()}`;
const fields = {
  date: byId("entryDate"),
  weight: byId("weight"),
  distance: byId("distance"),
  minutes: byId("minutes"),
  walkingHr: byId("walkingHr"),
  steps: byId("steps"),
  restingHr: byId("restingHr"),
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
  byId("heightUnit").textContent = waistUnit();
  byId("startWeightUnit").textContent = weightUnit();
  byId("lineWeightUnit").textContent = weightUnit();
  byId("goalWeightUnit").textContent = weightUnit();
  const hydrationInput = byId("hydrationInput");
  hydrationInput.max = unitSystem === "metric" ? "4750" : "160";
  hydrationInput.step = unitSystem === "metric" ? "10" : "1";
  hydrationInput.setAttribute("aria-label", unitSystem === "metric" ? "Millilitres of water consumed today" : "Fluid ounces of water consumed today");
  byId("hydrationUnit").textContent = `${hydrationUnit()} consumed today`;
  document.querySelectorAll('input[name="unitSystem"]').forEach(input => {
    input.checked = input.value === unitSystem;
  });
  if (fields.date.value) loadEntry(fields.date.value);
  renderAll(fields.date.value || isoDate());
  refreshWalkingCalculator(true);
}

let state = loadState();
syncLifestyleSummary();
let activeScoreDate = null;
let addingWalk = false;
let editingWalkIndex = null;
let calendarViewDate = new Date();
let weeklyNudgeDisplayWeek = null;
let weeklyNudgeSuppressedWeek = null;

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
  const lifestyleAssessed = weeklyScore !== null && weeklyScore !== undefined && Number.isFinite(Number(weeklyScore));
  const lifestyle = lifestyleAssessed
    ? Math.min(10, roundHalf(Number(weeklyScore)))
    : null;
  const maximum = lifestyleAssessed ? 30 : 20;
  const total = roundHalf(food + movement + (lifestyle ?? 0));
  const percent = Math.round(total / maximum * 100);
  return { food, movement, lifestyle, lifestyleAssessed, total, maximum, percent, color: colorFor(percent) };
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

function emptyState() {
  return {
    entries: {},
    weeks: {},
    profile: {},
    dailyGauges: {}
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const loaded = saved ? JSON.parse(saved) : emptyState();
    loaded.entries = loaded.entries || {};
    loaded.weeks = loaded.weeks || {};
    loaded.profile = loaded.profile || {};

    // Profile Info on Summary predates the shared Daily profile for some
    // accounts. Recover those measurements once, without overwriting an
    // established starting-weight baseline.
    try {
      const summary = JSON.parse(localStorage.getItem("motionc-mcp-summary-v1"));
      const measurements = summary?.measurementData;
      const summaryWeight = Number(measurements?.weightLbs);
      const summaryWaist = Number(measurements?.waistInches);
      const summaryHeight = Number(measurements?.heightInches);
      const summaryAge = Number(measurements?.age);
      if (!(Number(loaded.profile.startWeight) > 0) && summaryWeight > 0) loaded.profile.startWeight = summaryWeight;
      if (summaryWeight > 0) loaded.profile.currentWeight = summaryWeight;
      if (!(Number(loaded.profile.waist) > 0) && summaryWaist > 0) loaded.profile.waist = summaryWaist;
      if (!(Number(loaded.profile.heightInches) > 0) && summaryHeight > 0) loaded.profile.heightInches = summaryHeight;
      if (!(Number(loaded.profile.age) > 0) && summaryAge > 0) loaded.profile.age = summaryAge;
      if (!loaded.profile.sex && measurements?.sex) loaded.profile.sex = measurements.sex;
    } catch {
      // Summary Profile is optional; Daily remains usable without it.
    }
    const sharedRealGoal = Number(localStorage.getItem(WEIGHT_GOAL_STORAGE_KEY));
    if (sharedRealGoal > 0) {
      loaded.profile = loaded.profile || {};
      loaded.profile.realGoal = sharedRealGoal;
    } else if (!(Number(loaded.profile.realGoal) > 0) && Number(loaded.profile.vibratoryLine) > 0) {
      // The former editable VZ value becomes the initial Real Goal once.
      loaded.profile.realGoal = Number(loaded.profile.vibratoryLine);
    }
    if (Number(loaded.profile.realGoal) > 0) loaded.profile.vibratoryLine = Number(loaded.profile.realGoal) + 4;
    loaded.dailyGauges = loaded.dailyGauges || {};
    Object.values(loaded.dailyGauges).forEach(gauges => {
      const hydration = gauges?.hydration;
      if (hydration && Number.isFinite(Number(hydration.value)) && hydration.unit !== "oz") {
        hydration.value = Number(hydration.value) * 10;
        hydration.unit = "oz";
      }
    });
    return loaded;
  } catch {
    return emptyState();
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateProfileReminder() {
  const reminder = byId("profileReminder");
  if (!reminder) return;
  const profile = state.profile || {};
  const complete =
    Number(profile.age) > 0 &&
    Boolean(profile.sex) &&
    Number(profile.heightInches) > 0 &&
    (Number(profile.currentWeight) > 0 || Number(profile.startWeight) > 0) &&
    Number(profile.waist) > 0;
  reminder.hidden = complete;
}

function syncLifestyleSummary() {
  try {
    const summary = JSON.parse(localStorage.getItem(LIFESTYLE_SUMMARY_STORAGE_KEY));
    if (!Number.isFinite(Number(summary?.score))) return false;
    const summaryWeek = summary.week || weekKey(new Date());

    const existing = state.weeks[summaryWeek];
    if (existing?.summaryUpdatedAt === summary.updatedAt && existing?.scoreLogicVersion === 4) return false;

    const maximumScore = Number(summary.maximumScore) > 0 ? Number(summary.maximumScore) : 24;
    const score = Math.min(10, roundHalf(Number(summary.score) / maximumScore * 10));

    const values = Object.fromEntries(Object.entries(summary.values || {}).map(([key, value]) => {
      const numeric = Number(value);
      return [key, Number.isFinite(numeric) ? Math.max(1, Math.min(3, Math.round(numeric * 3))) : 1];
    }));
    state.weeks[summaryWeek] = {
      ...existing,
      values: Object.keys(values).length ? values : existing?.values || {},
      score,
      assessed: true,
      summaryScore: Number(summary.score),
      summaryUpdatedAt: summary.updatedAt,
      scoreLogicVersion: 4,
      lifestyleScale: 3,
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
  const savedWeek = state.weeks[key];
  if (savedWeek && savedWeek.assessed !== false && Number.isFinite(Number(savedWeek.score))) return savedWeek;

  const latestAssessed = Object.values(state.weeks || {})
    .filter(week => week?.assessed === true && Number.isFinite(Number(week.score)))
    .sort((a, b) => String(b.updatedAt || b.summaryUpdatedAt || "").localeCompare(String(a.updatedAt || a.summaryUpdatedAt || "")))[0];
  return latestAssessed || { values: {}, score: null, assessed: false };
}

function currentWeekIsComplete() {
  const currentWeek = state.weeks?.[weekKey(new Date())];
  return currentWeek?.assessed === true && Number.isFinite(Number(currentWeek.score));
}

function loadWeeklyNudgeState() {
  try {
    const saved = JSON.parse(localStorage.getItem(WEEKLY_NUDGE_STORAGE_KEY));
    return saved && typeof saved === "object" ? saved : { weeks: {} };
  } catch {
    return { weeks: {} };
  }
}

function saveWeeklyNudgeState(nudgeState) {
  localStorage.setItem(WEEKLY_NUDGE_STORAGE_KEY, JSON.stringify(nudgeState));
}

function localDayAfter(value) {
  const date = value ? new Date(value) : new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
}

function renderWeeklyCheckinNudge() {
  const nudge = byId("weeklyCheckinNudge");
  const current = byId("weeklyCheckinCurrent");
  if (!nudge || !current) return;

  if (currentWeekIsComplete()) {
    nudge.hidden = true;
    current.hidden = false;
    return;
  }

  current.hidden = true;
  const now = new Date();
  const currentWeekKey = weekKey(now);
  if (weeklyNudgeSuppressedWeek === currentWeekKey) {
    nudge.hidden = true;
    return;
  }
  if (weeklyNudgeDisplayWeek === currentWeekKey) {
    nudge.hidden = false;
    return;
  }
  const nudgeState = loadWeeklyNudgeState();
  nudgeState.weeks = nudgeState.weeks || {};
  const weekState = nudgeState.weeks[currentWeekKey] || {};

  if (!weekState.initialShownAt) {
    weekState.initialShownAt = now.toISOString();
    nudgeState.weeks[currentWeekKey] = weekState;
    saveWeeklyNudgeState(nudgeState);
    weeklyNudgeDisplayWeek = currentWeekKey;
    nudge.hidden = false;
    return;
  }

  const thursday = addDays(startOfWeek(now), 4);
  thursday.setHours(0, 0, 0, 0);
  const followupAfter = localDayAfter(weekState.remindLaterAt || weekState.initialShownAt);
  const followupDate = followupAfter > thursday ? followupAfter : thursday;
  const canShowFollowup = !weekState.followupShownAt && now >= followupDate && now.getDay() !== 0;

  if (canShowFollowup) {
    weekState.followupShownAt = now.toISOString();
    nudgeState.weeks[currentWeekKey] = weekState;
    saveWeeklyNudgeState(nudgeState);
    weeklyNudgeDisplayWeek = currentWeekKey;
    nudge.hidden = false;
    return;
  }

  nudge.hidden = true;
}

function openWeeklyCheckin() {
  weeklyNudgeSuppressedWeek = weekKey(new Date());
  weeklyNudgeDisplayWeek = null;
  byId("weeklyCheckinNudge").hidden = true;
  buildLifestyleForm();
  const dialog = byId("weeklyDialog");
  if (dialog.open) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function postponeWeeklyCheckin() {
  const nudgeState = loadWeeklyNudgeState();
  const currentWeekKey = weekKey(new Date());
  nudgeState.weeks = nudgeState.weeks || {};
  const weekState = nudgeState.weeks[currentWeekKey] || {};
  weekState.initialShownAt = weekState.initialShownAt || new Date().toISOString();
  weekState.remindLaterAt = new Date().toISOString();
  nudgeState.weeks[currentWeekKey] = weekState;
  saveWeeklyNudgeState(nudgeState);
  weeklyNudgeSuppressedWeek = currentWeekKey;
  weeklyNudgeDisplayWeek = null;
  byId("weeklyCheckinNudge").hidden = true;
}

function scoreForEntry(entry) {
  const weekly = weeklyForDate(entry.date);
  return calculateEntry(entry, weekly.assessed === false ? null : weekly.score);
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(dateFromIso(value));
}

function formatFullDate(value) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(dateFromIso(value));
}

function formatMilestoneDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(dateFromIso(value));
}

function walksForEntry(entry) {
  if (!entry) return [];
  if (Array.isArray(entry.walks)) return entry.walks;
  if (Number(entry.distance) > 0 || Number(entry.minutes) > 0) {
    return [{
      distance: Number(entry.distance || 0),
      minutes: Number(entry.minutes || 0),
      steps: Number(entry.steps) > 0 ? Number(entry.steps) : null,
      walkingHr: Number(entry.walkingHr) > 0 ? Number(entry.walkingHr) : null,
      recordedAt: entry.updatedAt || new Date().toISOString(),
      legacy: true
    }];
  }
  return [];
}

function syncWalkTotals(entry) {
  const walks = walksForEntry(entry);
  entry.walks = walks;
  entry.distance = Math.round(walks.reduce((sum, walk) => sum + Number(walk.distance || 0), 0) * 100) / 100;
  entry.minutes = walks.reduce((sum, walk) => sum + Number(walk.minutes || 0), 0);
  entry.steps = walks.length && walks.every(walk => Number(walk.steps) > 0)
    ? walks.reduce((sum, walk) => sum + Math.round(Number(walk.steps)), 0)
    : null;
  const allHrMeasured = walks.length && walks.every(walk => Number(walk.walkingHr) > 0 && Number(walk.minutes) > 0);
  entry.walkingHr = allHrMeasured
    ? Math.round(walks.reduce((sum, walk) => sum + Number(walk.walkingHr) * Number(walk.minutes), 0) / entry.minutes)
    : null;
  return entry;
}

function clearWalkFields() {
  fields.distance.value = "";
  fields.minutes.value = "";
  fields.walkingHr.value = "";
  fields.steps.value = "";
}

function loadEntry(dateValue) {
  const entry = state.entries[dateValue];
  addingWalk = false;
  editingWalkIndex = null;
  fields.date.value = dateValue;
  fields.weight.value = entry?.weight ? displayWeight(Number(entry.weight)).toFixed(1) : "";
  clearWalkFields();
  fields.restingHr.value = entry?.restingHr ?? "";
  fields.weightNote.value = entry?.weightNote ?? "";
  fields.observation.value = entry?.observation ?? "";
  fields.noRestaurant.checked = entry?.noRestaurant ?? true;
  fields.noFastFood.checked = entry?.noFastFood ?? true;
  fields.noJunkFood.checked = entry?.noJunkFood ?? true;
  fields.oneTreat.checked = entry?.oneTreat ?? true;
  updateWalkEntryMode();
  renderWalkBreakdown();
  renderToday(dateValue);
  loadDailyGauges(dateValue);
  renderDailyInsights(dateValue);
}

const DAILY_GAUGE_CONFIG = {
  hydration: { input: "hydrationInput", value: "hydrationValue", status: "hydrationStatus", miniChart: "hydrationMiniChart", label: "Hydration", unit: "oz", maximum: 160, color: "#075da8" },
  stress: { input: "stressInput", value: "stressValue", status: "stressStatus", miniChart: "stressMiniChart", label: "Stress", unit: "of 5", maximum: 5, color: "#dc4545" },
  sleep: { input: "sleepInput", value: "sleepValue", status: "sleepStatus", miniChart: "sleepMiniChart", label: "Sleep", unit: "hours", maximum: 12, color: "#315fa8" }
};

const weightNoteEmojiToggle = byId("weightNoteEmojiToggle");
const weightNoteEmojiMenu = byId("weightNoteEmojiMenu");

function setWeightNoteEmojiMenu(open) {
  weightNoteEmojiMenu.hidden = !open;
  weightNoteEmojiToggle.setAttribute("aria-expanded", String(open));
}

weightNoteEmojiToggle.addEventListener("click", () => {
  setWeightNoteEmojiMenu(weightNoteEmojiMenu.hidden);
});

document.querySelectorAll("[data-weight-note-emoji]").forEach(button => {
  button.addEventListener("click", () => {
    const input = fields.weightNote;
    const emoji = button.dataset.weightNoteEmoji;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const nextValue = `${input.value.slice(0, start)}${emoji}${input.value.slice(end)}`;
    if (nextValue.length > input.maxLength) return;
    input.value = nextValue;
    const cursor = start + emoji.length;
    input.focus();
    input.setSelectionRange(cursor, cursor);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    setWeightNoteEmojiMenu(false);
  });
});

document.addEventListener("click", event => {
  if (!event.target.closest(".weight-note-emoji-picker")) setWeightNoteEmojiMenu(false);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !weightNoteEmojiMenu.hidden) {
    setWeightNoteEmojiMenu(false);
    weightNoteEmojiToggle.focus();
  }
});

const INSIGHT_RULES = {
  hydrationLitresPerHour: 0.4,
  fluidOuncesPerLitre: 33.814,
  hydrationMinimumOunces: 10,
  sleepLookbackDays: 7,
  sleepMinimumEntries: 7,
  sleepAverageThreshold: 6,
  stressRecordedDays: 5,
  stressMinimumHighDays: 3,
  stressHighLevel: 4,
  maximumMessages: 2
};

function displayGaugeValue(key, value) {
  if (key === "hydration") return String(Math.round(displayHydration(Number(value))));
  if (key !== "sleep") return String(Number(value));
  return Number(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function setGaugeAppearance(key, value) {
  const input = byId(DAILY_GAUGE_CONFIG[key].input);
  const percent = ((Number(value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
  input.style.setProperty("--gauge-fill", `${Math.max(0, Math.min(100, percent))}%`);
}

function loadDailyGauges(dateValue) {
  const gauges = state.dailyGauges?.[dateValue] || {};
  Object.entries(DAILY_GAUGE_CONFIG).forEach(([key, config]) => {
    const input = byId(config.input);
    const saved = gauges[key];
    const recorded = saved && Number.isFinite(Number(saved.value));
    input.value = recorded ? (key === "hydration" ? Math.round(displayHydration(Number(saved.value))) : saved.value) : 0;
    byId(config.value).textContent = recorded ? displayGaugeValue(key, saved.value) : "—";
    byId(config.status).textContent = recorded
      ? `Updated ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(saved.updatedAt))}`
      : "Not recorded today";
    input.closest(".daily-gauge").classList.toggle("is-recorded", Boolean(recorded));
    setGaugeAppearance(key, input.value);
  });
  renderGaugeIndicators(dateValue);
}

function previewDailyGauge(key) {
  const config = DAILY_GAUGE_CONFIG[key];
  const value = Number(byId(config.input).value);
  byId(config.value).textContent = key === "hydration" ? String(Math.round(value)) : displayGaugeValue(key, value);
  setGaugeAppearance(key, value);
}

function stepDailyGauge(key, direction) {
  const input = byId(DAILY_GAUGE_CONFIG[key].input);
  const step = Number(input.step) || 1;
  const next = Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value) + (step * direction)));
  input.value = String(next);
  previewDailyGauge(key);
}

function saveDailyGauge(key) {
  const dateValue = fields.date.value || isoDate();
  const config = DAILY_GAUGE_CONFIG[key];
  const displayedValue = Number(byId(config.input).value);
  const value = key === "hydration" ? storedHydration(displayedValue) : displayedValue;
  state.dailyGauges = state.dailyGauges || {};
  state.dailyGauges[dateValue] = state.dailyGauges[dateValue] || {};
  state.dailyGauges[dateValue][key] = { value, ...(key === "hydration" ? { unit: "oz" } : {}), updatedAt: new Date().toISOString() };
  persist();
  loadDailyGauges(dateValue);
  renderDailyInsights(dateValue);
  renderMiniGaugeCharts();
}

function miniChartDateLabel(dateValue) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(dateFromIso(dateValue));
}

function renderMiniGaugeChart(key) {
  const config = DAILY_GAUGE_CONFIG[key];
  const chart = byId(config.miniChart);
  const today = dateFromIso(isoDate());
  const dates = Array.from({ length: 7 }, (_, index) => isoDate(addDays(today, index - 7)));
  const values = dates.map(date => {
    const saved = state.dailyGauges?.[date]?.[key];
    return saved && Number.isFinite(Number(saved.value)) ? Number(saved.value) : null;
  });
  const hasData = values.some(value => value !== null);
  const width = 190;
  const height = 72;
  const chartTop = 8;
  const chartBottom = 56;
  const slotWidth = width / dates.length;
  const bars = values.map((value, index) => {
    if (value === null) return `<rect class="mini-chart-missing" x="${(index * slotWidth + 7).toFixed(1)}" y="${chartBottom - 2}" width="${(slotWidth - 12).toFixed(1)}" height="2" rx="1"></rect>`;
    const barHeight = Math.max(3, (Math.min(config.maximum, value) / config.maximum) * (chartBottom - chartTop));
    const displayedUnit = key === "hydration" ? hydrationUnit() : config.unit;
    return `<rect x="${(index * slotWidth + 7).toFixed(1)}" y="${(chartBottom - barHeight).toFixed(1)}" width="${(slotWidth - 12).toFixed(1)}" height="${barHeight.toFixed(1)}" rx="3" fill="${config.color}"><title>${miniChartDateLabel(dates[index])}: ${displayGaugeValue(key, value)} ${displayedUnit}</title></rect>`;
  }).join("");
  chart.innerHTML = `<strong>${config.label} · previous 7 completed days</strong>${hasData ? `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${config.label} over the previous seven completed days"><line x1="0" y1="${chartBottom}" x2="${width}" y2="${chartBottom}" class="mini-chart-axis"></line>${bars}<text x="2" y="70">${miniChartDateLabel(dates[0])}</text><text x="188" y="70" text-anchor="end">${miniChartDateLabel(dates.at(-1))}</text></svg>` : `<span>No completed data yet</span>`}`;
}

function renderMiniGaugeCharts() {
  Object.keys(DAILY_GAUGE_CONFIG).forEach(renderMiniGaugeChart);
}

function completedGaugeSamples(key, beforeDate, calendarDays = null) {
  const before = dateFromIso(beforeDate);
  const earliest = calendarDays === null ? null : addDays(before, -calendarDays);
  return Object.entries(state.dailyGauges || {})
    .filter(([date, gauges]) => {
      const sampleDate = dateFromIso(date);
      return date < beforeDate && (!earliest || sampleDate >= earliest) && Number.isFinite(Number(gauges?.[key]?.value));
    })
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA));
}

function averageGaugeSamples(samples, key) {
  if (!samples.length) return null;
  return samples.reduce((sum, [, gauges]) => sum + Number(gauges[key].value), 0) / samples.length;
}

function setGaugeAverage(id, average, color, label) {
  const element = byId(id);
  const light = element.querySelector(".gauge-light");
  light.className = `gauge-light ${color}`;
  element.querySelector("span").textContent = label;
  element.setAttribute("aria-label", label);
}

function setGaugeTrend(id, arrow, label) {
  const element = byId(id);
  element.querySelector("b").textContent = arrow;
  element.querySelector("span").textContent = label;
  element.setAttribute("aria-label", label);
}

function renderGaugeIndicators(dateValue) {
  const sleepSamples = completedGaugeSamples("sleep", dateValue, 7);
  if (sleepSamples.length === 7) {
    const average = averageGaugeSamples(sleepSamples, "sleep");
    const color = average >= 7 ? "green" : average >= 6 ? "yellow" : average >= 5 ? "orange" : "red";
    setGaugeAverage("sleepAverage", average, color, `${displayGaugeValue("sleep", average)} hr avg`);
  } else {
    setGaugeAverage("sleepAverage", null, "pending", `Need ${7 - sleepSamples.length} more day${7 - sleepSamples.length === 1 ? "" : "s"}`);
  }

  const stressSamples = completedGaugeSamples("stress", dateValue, 7);
  if (stressSamples.length === 7) {
    const average = averageGaugeSamples(stressSamples, "stress");
    const color = average <= 1 ? "green" : average <= 2 ? "yellow" : average <= 3 ? "orange" : average <= 4 ? "red" : "deep-red";
    setGaugeAverage("stressAverage", average, color, `${average.toFixed(1)} avg`);
  } else {
    setGaugeAverage("stressAverage", null, "pending", `Need ${7 - stressSamples.length} more day${7 - stressSamples.length === 1 ? "" : "s"}`);
  }

  const sleepTrendSamples = completedGaugeSamples("sleep", dateValue, 6);
  if (sleepTrendSamples.length < 6) {
    setGaugeTrend("sleepTrend", "—", `Need ${6 - sleepTrendSamples.length} more day${6 - sleepTrendSamples.length === 1 ? "" : "s"}`);
  } else {
    const recent = averageGaugeSamples(sleepTrendSamples.slice(0, 3), "sleep");
    const previous = averageGaugeSamples(sleepTrendSamples.slice(3, 6), "sleep");
    const change = recent - previous;
    if (change >= 1) setGaugeTrend("sleepTrend", "↓↓", "Strong improvement");
    else if (change > .25) setGaugeTrend("sleepTrend", "↓", "Improvement");
    else if (change <= -1) setGaugeTrend("sleepTrend", "↑↑", "Strong decline");
    else if (change < -.25) setGaugeTrend("sleepTrend", "↑", "Decline");
    else setGaugeTrend("sleepTrend", "→", "Stable");
  }

  const selectedStress = state.dailyGauges?.[dateValue]?.stress;
  const yesterdayDate = isoDate(addDays(dateFromIso(dateValue), -1));
  const yesterdayStress = state.dailyGauges?.[yesterdayDate]?.stress;
  if (!selectedStress || !yesterdayStress) {
    setGaugeTrend("stressTrend", "—", "Need yesterday");
  } else {
    const change = Number(selectedStress.value) - Number(yesterdayStress.value);
    if (change <= -2) setGaugeTrend("stressTrend", "↓↓", "Strong improvement");
    else if (change <= -1) setGaugeTrend("stressTrend", "↓", "Improvement");
    else if (change >= 2) setGaugeTrend("stressTrend", "↑↑", "Strong increase");
    else if (change >= 1) setGaugeTrend("stressTrend", "↑", "Slight increase");
    else setGaugeTrend("stressTrend", "→", "No change");
  }

  const selectedDate = state.dailyGauges?.[dateValue]?.hydration;
  const yesterday = state.dailyGauges?.[yesterdayDate]?.hydration;
  if (!selectedDate || !yesterday) {
    setGaugeTrend("hydrationTrend", "—", "Need yesterday");
  } else {
    const change = Number(selectedDate.value) - Number(yesterday.value);
    if (change >= 20) setGaugeTrend("hydrationTrend", "↓↓", "Strong improvement");
    else if (change >= 10) setGaugeTrend("hydrationTrend", "↓", "Improvement");
    else if (change <= -20) setGaugeTrend("hydrationTrend", "↑↑", "Strong decline");
    else if (change <= -10) setGaugeTrend("hydrationTrend", "↑", "Slight decline");
    else setGaugeTrend("hydrationTrend", "→", "No change");
  }
}

function estimatedHydrationDeficit(dateValue) {
  const entry = state.entries[dateValue];
  const walkingMinutes = walksForEntry(entry).reduce((sum, walk) => sum + Number(walk.minutes || 0), 0);
  if (walkingMinutes <= 0) return 0;
  const ounces = ((walkingMinutes / 60) * INSIGHT_RULES.hydrationLitresPerHour) * INSIGHT_RULES.fluidOuncesPerLitre;
  return Math.round(ounces);
}

function buildDailyInsights(dateValue) {
  if (dateValue !== isoDate()) return [];
  const immediate = [];
  const patterns = [];
  const hydrationDeficit = estimatedHydrationDeficit(dateValue);

  if (hydrationDeficit >= INSIGHT_RULES.hydrationMinimumOunces) {
    immediate.push({
      priority: 100 + hydrationDeficit,
      html: `<strong>Estimated hydration deficit from today's walking: ${displayGaugeValue("hydration", hydrationDeficit)} ${hydrationUnit()}.</strong>`
    });
  }

  const sleepSamples = completedGaugeSamples("sleep", dateValue, INSIGHT_RULES.sleepLookbackDays);
  if (sleepSamples.length >= INSIGHT_RULES.sleepMinimumEntries) {
    const sleepValues = sleepSamples.map(([, gauges]) => Number(gauges.sleep.value));
    const sleepAverage = sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length;
    if (sleepAverage < INSIGHT_RULES.sleepAverageThreshold) {
      patterns.push({
        priority: INSIGHT_RULES.sleepAverageThreshold - sleepAverage,
        html: `<strong>A pattern worth noticing:</strong> Your sleep averaged ${displayGaugeValue("sleep", sleepAverage)} hours across ${sleepValues.length} recorded nights. <a href="/library/">Explore sleep articles in the MotionC Library</a>.`
      });
    }
  }

  const stressSamples = completedGaugeSamples("stress", dateValue).slice(0, INSIGHT_RULES.stressRecordedDays);
  if (stressSamples.length === INSIGHT_RULES.stressRecordedDays) {
    const highStressDays = stressSamples.filter(([, gauges]) => Number(gauges.stress.value) >= INSIGHT_RULES.stressHighLevel).length;
    if (highStressDays >= INSIGHT_RULES.stressMinimumHighDays) {
      patterns.push({
        priority: highStressDays / INSIGHT_RULES.stressRecordedDays,
        html: `<strong>Stress has remained elevated:</strong> ${highStressDays} of your last ${INSIGHT_RULES.stressRecordedDays} recorded days were level 4 or 5. <a href="/library/">Explore stress articles in the MotionC Library</a>.`
      });
    }
  }

  patterns.sort((a, b) => b.priority - a.priority);
  return [...immediate, ...patterns].slice(0, INSIGHT_RULES.maximumMessages);
}

function renderDailyInsights(dateValue) {
  const messages = buildDailyInsights(dateValue);
  byId("gaugeMessages").innerHTML = messages.map(message => `<p class="gauge-message">${message.html}</p>`).join("");
}

function readDayFields(existing = {}) {
  const enteredWeight = fields.weight.value ? Number(fields.weight.value) : null;
  const unchangedWeight = existing?.weight && enteredWeight === Number(displayWeight(Number(existing.weight)).toFixed(1));
  return {
    ...existing,
    date: fields.date.value,
    weight: enteredWeight === null ? null : unchangedWeight ? Number(existing.weight) : storedWeight(enteredWeight),
    restingHr: fields.restingHr.value ? Number(fields.restingHr.value) : null,
    weightNote: fields.weightNote.value.trim(),
    observation: fields.observation.value.trim(),
    noRestaurant: fields.noRestaurant.checked,
    noFastFood: fields.noFastFood.checked,
    noJunkFood: fields.noJunkFood.checked,
    oneTreat: fields.oneTreat.checked,
    updatedAt: new Date().toISOString()
  };
}

function readWalkFields() {
  return {
    distance: fields.distance.value ? storedDistance(Number(fields.distance.value)) : 0,
    minutes: fields.minutes.value ? Number(fields.minutes.value) : 0,
    walkingHr: fields.walkingHr.value ? Number(fields.walkingHr.value) : null,
    steps: fields.steps.value ? Math.round(Number(fields.steps.value)) : null,
    recordedAt: new Date().toISOString()
  };
}

function saveEntry() {
  if (!fields.date.value) return;
  const existing = state.entries[fields.date.value];
  const entry = readDayFields(existing || {});
  entry.walks = walksForEntry(existing).map(walk => ({ ...walk }));
  const walk = readWalkFields();
  const editingWalk = editingWalkIndex !== null;
  const addedWalk = addingWalk;
  const hasWalkInput = walk.distance > 0 || walk.minutes > 0;
  const creatingFirstWalk = entry.walks.length === 0 && hasWalkInput;

  if ((addedWalk || editingWalk) && !hasWalkInput) {
    byId("saveStatus").textContent = "Enter the distance or time for this walk.";
    return;
  }

  if (editingWalk) entry.walks[editingWalkIndex] = { ...entry.walks[editingWalkIndex], ...walk, legacy: false };
  else if (addedWalk || creatingFirstWalk) entry.walks.push(walk);

  syncWalkTotals(entry);
  state.entries[entry.date] = entry;
  persist();
  loadEntry(entry.date);
  byId("saveStatus").textContent = editingWalk
    ? "Walk updated. This date’s totals have been recalculated."
    : addedWalk
      ? "Walk added. This date’s totals and score are updated."
      : "Saved. This date’s dot and weekly summary are updated.";
  window.setTimeout(() => byId("saveStatus").textContent = "", 3000);
  renderAll(entry.date);
}

function updateWalkEntryMode() {
  const entry = state.entries[fields.date.value];
  const hasSavedWalk = walksForEntry(entry).length > 0;
  const addWalkButton = byId("addWalk");
  const enteringWalk = addingWalk || editingWalkIndex !== null;
  addWalkButton.hidden = !hasSavedWalk;
  addWalkButton.textContent = enteringWalk ? "Cancel walk changes" : "+ Add another walk";
  byId("saveEntry").textContent = editingWalkIndex !== null ? "Update walk" : "Save walk";
}

function toggleAddWalk() {
  if (addingWalk || editingWalkIndex !== null) {
    loadEntry(fields.date.value);
    byId("saveStatus").textContent = "";
    return;
  }
  if (!state.entries[fields.date.value]) return;
  addingWalk = true;
  clearWalkFields();
  updateWalkEntryMode();
  byId("saveStatus").textContent = "Enter only the new walk. It will remain separate and update this date’s totals.";
  fields.distance.focus();
}

function editWalk(index) {
  const walk = walksForEntry(state.entries[fields.date.value])[index];
  if (!walk) return;
  addingWalk = false;
  editingWalkIndex = index;
  fields.distance.value = walk.distance ? displayDistance(Number(walk.distance)).toFixed(2) : "";
  fields.minutes.value = walk.minutes || "";
  fields.walkingHr.value = walk.walkingHr || "";
  fields.steps.value = walk.steps || "";
  updateWalkEntryMode();
  byId("saveStatus").textContent = `Editing Walk ${index + 1}. Update the values and save.`;
  fields.distance.focus();
}

function deleteWalk(index) {
  const entry = state.entries[fields.date.value];
  const walks = walksForEntry(entry);
  if (!walks[index] || !window.confirm(`Remove Walk ${index + 1} from this day?`)) return;
  entry.walks = walks.filter((_, walkIndex) => walkIndex !== index);
  syncWalkTotals(entry);
  entry.updatedAt = new Date().toISOString();
  persist();
  loadEntry(entry.date);
  renderAll(entry.date);
  byId("saveStatus").textContent = "Walk removed. This date’s totals have been recalculated.";
}

function dailyStepsPerMile() {
  const samples = Object.values(state.entries)
    .flatMap(entry => walksForEntry(entry))
    .filter(walk => Number(walk.steps) > 0 && Number(walk.distance) > 0)
    .map(walk => Number(walk.steps) / Number(walk.distance))
    .filter(rate => rate >= 1400 && rate <= 3000)
    .sort((a, b) => a - b);
  if (samples.length < 3) return 2050;
  const middle = Math.floor(samples.length / 2);
  return samples.length % 2 ? samples[middle] : (samples[middle - 1] + samples[middle]) / 2;
}

function estimatedHrForWalk(walk, restingHr) {
  if (!(Number(walk.distance) > 0 && Number(walk.minutes) > 0)) return "Estimated";
  const pace = Number(walk.minutes) / Number(walk.distance);
  const resting = Number(restingHr) > 0 ? Number(restingHr) : 72;
  const effort = pace >= 20 ? [15, 30] : pace >= 18 ? [20, 36] : pace >= 16 ? [28, 45] : pace >= 14 ? [38, 58] : [48, 72];
  return `${Math.max(70, Math.round(resting + effort[0]))}–${Math.min(160, Math.round(resting + effort[1]))} bpm est.`;
}

function renderWalkBreakdown() {
  const entry = state.entries[fields.date.value];
  const walks = walksForEntry(entry);
  const section = byId("walkBreakdown");
  section.hidden = walks.length === 0;
  if (!walks.length) return;
  const totalDistance = walks.reduce((sum, walk) => sum + Number(walk.distance || 0), 0);
  const totalMinutes = walks.reduce((sum, walk) => sum + Number(walk.minutes || 0), 0);
  const legacyOnly = walks.length === 1 && walks[0].legacy;
  const stepsPerMile = dailyStepsPerMile();
  byId("walkBreakdownTitle").textContent = legacyOnly ? "Earlier daily total" : `${walks.length} walk${walks.length === 1 ? "" : "s"} recorded`;
  byId("walkBreakdownTotal").textContent = `${formatDistance(totalDistance)} · ${totalMinutes} min total`;
  byId("walkList").innerHTML = walks.map((walk, index) => `
    <article class="walk-row">
      <strong>${walk.legacy ? "Recorded total" : `Walk ${index + 1}`}</strong>
      <span class="walk-stat"><small>Distance</small><span>${formatDistance(walk.distance || 0)}</span></span>
      <span class="walk-stat"><small>Time</small><span>${Number(walk.minutes || 0)} min</span></span>
      <span class="walk-stat"><small>Steps</small><span>${Number(walk.steps) > 0 ? Math.round(Number(walk.steps)).toLocaleString() : `≈${Math.round(Number(walk.distance || 0) * stepsPerMile / 10) * 10}`}</span></span>
      <span class="walk-stat"><small>Avg HR</small><span>${Number(walk.walkingHr) > 0 ? `${Math.round(Number(walk.walkingHr))} bpm` : estimatedHrForWalk(walk, entry.restingHr)}</span></span>
      <span class="walk-actions"><button type="button" data-walk-action="edit" data-walk-index="${index}">Edit</button><button type="button" data-walk-action="delete" data-walk-index="${index}">Delete</button></span>
    </article>
  `).join("");
}

function renderToday(dateValue) {
  const entry = state.entries[dateValue];
  const orb = byId("todayOrb");
  orb.className = "score-orb";
  if (!entry) {
    byId("todayPercent").textContent = "—";
    byId("todayColor").textContent = "Save this entry to create your dot";
    orb.classList.add("future");
    return;
  }
  const score = scoreForEntry(entry);
  orb.classList.add(score.color);
  byId("todayPercent").textContent = `${score.percent}%`;
  byId("todayColor").textContent = `${colorLabel(score.color)} · ${score.total}/30`;
  activeScoreDate = dateValue;
}

function renderCalendar() {
  const focus = calendarViewDate;
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

function weekNotesHtml(entries, emptyMessage) {
  const notes = entries.filter(entry => entry.weightNote || entry.observation);
  if (!notes.length) return `<p class="no-week-notes">${emptyMessage}</p>`;

  return notes.map(entry => {
    const comments = [];
    if (entry.weightNote) {
      comments.push(`<span><b>Weight note:</b> ${escapeHtml(entry.weightNote)}</span>`);
    }
    if (entry.observation) {
      comments.push(`<span><b>Observation:</b> ${escapeHtml(entry.observation)}</span>`);
    }
    return `<p class="week-note"><strong>${formatShortDate(entry.date)}:</strong>${comments.join("")}</p>`;
  }).join("");
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
  byId("weeklyNotes").innerHTML = weekNotesHtml(summary.entries, "No notes recorded this week.");

  const previous = byId("previousWeeks");
  previous.replaceChildren();
  const previousWeekKeys = [...new Set(
    Object.values(state.entries)
      .filter(entry => dateFromIso(entry.date) < start)
      .map(entry => weekKey(dateFromIso(entry.date)))
  )].sort((a, b) => b.localeCompare(a));

  if (!previousWeekKeys.length) {
    previous.innerHTML = '<p class="no-week-notes">No previous weeks recorded yet.</p>';
  }

  previousWeekKeys.forEach(key => {
    const weekStart = dateFromIso(key);
    const weekEnd = addDays(weekStart, 6);
    const old = weeklySummary(weekStart);
    const block = document.createElement("div");
    block.className = "previous-week";
    block.innerHTML = `<strong>${formatShortDate(isoDate(weekStart))}–${formatShortDate(isoDate(weekEnd))}</strong>
      <p>${formatDistance(old.totalDistance)} · ${old.average || 0}% average · ${old.entries.length} entries</p>
      <div class="previous-week-notes">
        <span class="previous-week-notes-title">Notes</span>
        ${weekNotesHtml(old.entries, "No notes recorded.")}
      </div>`;
    previous.append(block);
  });
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
  const weightedEntries = entries.filter(item => Number(item.weight) > 0);
  const lowestEntry = weightedEntries.reduce((lowestSoFar, entry) =>
    !lowestSoFar || Number(entry.weight) <= Number(lowestSoFar.weight) ? entry : lowestSoFar
  , null);
  const lowest = lowestEntry ? Number(lowestEntry.weight) : null;
  const latestWeight = weightedEntries.length ? Number(weightedEntries.at(-1).weight) : null;
  const startWeight = Number(state.profile.startWeight);
  const totalMiles = entries.reduce((sum, item) => sum + Number(item.distance || 0), 0);
  const longest = longestWalk();
  const greenDays = entries.filter(item => ["green", "light-green"].includes(scoreForEntry(item).color)).length;
  const availableDots = entries.length;
  const positivePercentage = availableDots ? Math.round(greenDays / availableDots * 100) : 0;
  const realGoal = state.profile.realGoal;
  const hasStartWeight = Number.isFinite(startWeight) && startWeight > 0;
  const hasRealGoal = Number.isFinite(Number(realGoal)) && Number(realGoal) > 0;
  const displayedStart = hasStartWeight ? displayWeight(startWeight) : 0;
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
  const loss = hasStartWeight && latestWeight !== null
    ? displayWeight(Math.max(0, startWeight - latestWeight))
    : null;
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
    { label: "Total Weight Lost", reached: hasStartWeight && latestWeight !== null, detail: hasStartWeight && latestWeight !== null ? `${formatWeight(startWeight)} start → ${formatWeight(latestWeight)} latest (${loss.toFixed(1)} ${weightUnit()} lost)` : "Starting and latest weights needed" },
    { label: "Lowest Recorded Weight", reached: lowest !== null, detail: lowest !== null ? `${formatWeight(lowest)} · ${formatMilestoneDate(lowestEntry.date)}` : "No weight recorded" },
    { label: "Real Goal", reached: hasRealGoal, detail: hasRealGoal ? formatWeight(realGoal) : "Set your goal in Weekly check-in or on Summary" },
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

let calculatorMode = "distance";

function latestRecordedWeight() {
  return Object.values(state.entries)
    .filter(entry => Number(entry.weight) > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.weight || state.profile.startWeight;
}

function recentWalkingSpeed() {
  const walks = Object.values(state.entries).filter(entry =>
    Number(entry.distance) > 0 && Number(entry.minutes) > 0
  );
  const miles = walks.reduce((sum, entry) => sum + Number(entry.distance), 0);
  const minutes = walks.reduce((sum, entry) => sum + Number(entry.minutes), 0);
  return minutes > 0 ? miles / (minutes / 60) : 3;
}

function calculatorValues() {
  return {
    distance: Number(byId("calcDistance").value),
    time: Number(byId("calcTime").value),
    speed: Number(byId("calcSpeed").value),
    weight: Number(byId("calcWeight").value)
  };
}

function refreshWalkingCalculator(resetValues = false) {
  byId("calcDistanceUnit").textContent = distanceUnit();
  byId("calcSpeedUnit").textContent = unitSystem === "metric" ? "km/h" : "mph";
  byId("calcWeightUnit").textContent = weightUnit();
  byId("calcLossUnit").textContent = weightUnit();

  if (resetValues) {
    const latestWeight = Number(latestRecordedWeight());
    byId("calcWeight").value = latestWeight > 0 && Number.isFinite(latestWeight) ? displayWeight(latestWeight).toFixed(1) : "";
    byId("calcSpeed").value = displayDistance(recentWalkingSpeed()).toFixed(2);
    byId("calcDistance").value = "";
    byId("calcTime").value = "";
    byId("calcTargetLoss").value = "";
  }

  calculateWalk();
}

function setCalculatorMode(mode) {
  calculatorMode = ["distance", "time", "speed", "calories"].includes(mode) ? mode : "distance";
  const requirements = {
    distance: ["speed", "time"],
    time: ["distance", "speed"],
    speed: ["distance", "time"],
    calories: ["distance", "weight"]
  };

  document.querySelectorAll("[data-calc-mode]").forEach(button => {
    button.classList.toggle("active", button.dataset.calcMode === calculatorMode);
  });
  document.querySelectorAll("[data-calc-field]").forEach(label => {
    const field = label.dataset.calcField;
    label.classList.toggle("is-required", requirements[calculatorMode].includes(field));
    label.classList.toggle("is-output", field === calculatorMode && calculatorMode !== "calories");
  });
  calculateWalk();
}

function calculateWalk() {
  const values = calculatorValues();
  const labels = {
    distance: "Estimated distance",
    time: "Estimated walking time",
    speed: "Estimated walking speed",
    calories: "Estimated energy used"
  };
  byId("calcResultLabel").textContent = labels[calculatorMode];

  let result = "";
  if (calculatorMode === "distance" && values.speed > 0 && values.time > 0) {
    result = `${(values.speed * values.time / 60).toFixed(2)} ${distanceUnit()}`;
  } else if (calculatorMode === "time" && values.distance > 0 && values.speed > 0) {
    result = `${Math.round(values.distance / values.speed * 60)} minutes`;
  } else if (calculatorMode === "speed" && values.distance > 0 && values.time > 0) {
    result = `${(values.distance / (values.time / 60)).toFixed(2)} ${unitSystem === "metric" ? "km/h" : "mph"}`;
  } else if (calculatorMode === "calories" && values.distance > 0 && values.weight > 0) {
    const miles = storedDistance(values.distance);
    const pounds = storedWeight(values.weight);
    result = `${Math.round(.57 * pounds * miles)} kcal`;
  }

  const missing = {
    distance: "Enter walking time",
    time: "Enter distance",
    speed: "Enter distance and time",
    calories: "Enter distance and weight"
  };
  byId("calcResult").textContent = result || missing[calculatorMode];
  renderWalkingProjection();
}

function renderWalkingProjection() {
  const targetDisplay = Number(byId("calcTargetLoss").value);
  const weightDisplay = Number(byId("calcWeight").value);
  const output = byId("projectionResults");
  if (!(targetDisplay > 0) || !(weightDisplay > 0)) {
    output.textContent = "Enter a desired loss to see a planning estimate.";
    return;
  }

  const targetPounds = storedWeight(targetDisplay);
  const weightPounds = storedWeight(weightDisplay);
  const estimatedCalories = targetPounds * 3500;
  const caloriesPerMile = .57 * weightPounds;
  const estimatedMiles = estimatedCalories / caloriesPerMile;
  const recordedMiles = Object.values(state.entries).reduce((sum, entry) => sum + Number(entry.distance || 0), 0);
  const progress = Math.min(100, recordedMiles / estimatedMiles * 100);

  output.innerHTML = `
    <strong>${displayDistance(estimatedMiles).toFixed(1)} ${distanceUnit()}</strong> estimated walking distance<br>
    ${Math.round(estimatedCalories).toLocaleString()} estimated kcal<br>
    ${displayDistance(recordedMiles).toFixed(1)} ${distanceUnit()} recorded · ${progress.toFixed(1)}% of distance estimate
  `;
}

function setupWalkingCalculator() {
  document.querySelectorAll("[data-calc-mode]").forEach(button => {
    button.addEventListener("click", () => setCalculatorMode(button.dataset.calcMode));
  });
  ["calcDistance", "calcTime", "calcSpeed", "calcWeight", "calcTargetLoss"].forEach(id => {
    byId(id).addEventListener("input", calculateWalk);
  });
  setCalculatorMode("distance");
}

function promiseLine(label, passed) {
  return `<li><span>${label}</span><strong>${passed ? "✓" : "✕"}</strong></li>`;
}

function openScore(dateValue) {
  const entry = state.entries[dateValue];
  if (!entry) return;
  const score = scoreForEntry(entry);
  const weekly = weeklyForDate(dateValue);
  const scaledLifestyleValue = value => weekly.lifestyleScale === 3 ? Number(value) : Number(value) * 3;
  const needsAttention = Object.entries(weekly.values || {}).filter(([, value]) => scaledLifestyleValue(value) <= 1).map(([key]) => LIFESTYLE_ITEMS.find(item => item[0] === key)?.[1]).filter(Boolean);
  const couldStrengthen = Object.entries(weekly.values || {}).filter(([, value]) => scaledLifestyleValue(value) > 1 && scaledLifestyleValue(value) < 3).map(([key]) => LIFESTYLE_ITEMS.find(item => item[0] === key)?.[1]).filter(Boolean);
  const dailyImpact = score.food >= 8 ? "Strong positive" : score.food >= 6 ? "Mild negative" : "Needs attention";
  const moveImpact = score.movement >= 9 ? "Strong positive" : score.movement >= 5 ? "Positive" : "Limited movement";
  const lifestyleImpact = score.lifestyleAssessed
    ? (score.lifestyle >= 8 ? "Strong" : score.lifestyle >= 6 ? "Moderate" : "Moderate negative")
    : "Not included";
  const lifestyleDetail = score.lifestyleAssessed
    ? (needsAttention.length
      ? `Needs attention: ${escapeHtml(needsAttention.slice(0, 3).join(", "))}.`
      : couldStrengthen.length
        ? `Could strengthen: ${escapeHtml(couldStrengthen.slice(0, 3).join(", "))}.`
        : "Your weekly lifestyle is supporting today’s dot.")
    : "Complete the Lifestyle Profile to include this section in the Daily score.";
  const conclusion = score.lifestyleAssessed
    ? (score.lifestyle < 6 ? "This week’s lifestyle is lowering the overall result slightly." : "Your weekly foundation is supporting today’s choices.")
    : "Lifestyle is not included until the profile is completed.";
  byId("scoreDetails").innerHTML = `
    <p class="eyebrow">${escapeHtml(formatFullDate(dateValue).toUpperCase())}</p>
    <div class="score-summary"><span class="dot ${score.color}"></span><div><h2>${score.percent}% · ${colorLabel(score.color)}</h2><span>${score.total}/${score.maximum} assessed points</span></div></div>
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
      ${walksForEntry(entry).length > 1 ? walksForEntry(entry).map((walk, index) => `<li><span>Walk ${index + 1}</span><strong>${formatDistance(walk.distance || 0)} · ${Number(walk.minutes || 0)} min</strong></li>`).join("") : ""}
    </ul><p class="impact">Impact: ${moveImpact}</p></section>
    <section class="score-section"><header><h3>Your lifestyle this week</h3><strong>${score.lifestyleAssessed ? `${score.lifestyle}/10` : "Not assessed"}</strong></header>
      <p>${lifestyleDetail}</p><p class="impact">Impact: ${lifestyleImpact}</p></section>
    <p class="score-conclusion">${score.movement >= 8 ? "Your movement was strong today. " : ""}${conclusion}</p>`;
  byId("scoreDialog").showModal();
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function buildLifestyleForm() {
  const week = weeklyForDate(isoDate());
  const choiceFor = key => {
    const value = Number(week.values?.[key]);
    if (!Number.isFinite(value)) return 2;
    if (week.lifestyleScale === 3) return Math.max(1, Math.min(3, Math.round(value)));
    return Math.max(1, Math.min(3, Math.round(value * 3)));
  };
  const choices = {
    sleep: ["Usually sleep less than 6 hours", "Usually sleep around 6 hours", "Usually sleep 7–8 hours each night"],
    hydration: ["Rarely drink enough water", "Drink some water but could improve", "Drink enough water most days"],
    nutrition: ["Mostly unhealthy food choices", "A mix of healthy and unhealthy choices", "Mostly healthy food choices"],
    activity: ["Rarely exercise", "Exercise occasionally", "Exercise regularly"],
    stress: ["High stress most days", "Moderate stress most days", "Stress is usually well managed"],
    alcohol: ["High alcohol intake", "Moderate alcohol intake", "Low alcohol intake"],
    smoking: ["Current smoker", "Former smoker", "Non-smoker"],
    movement: ["Average under 3,000 steps per day", "Average 3,000–8,000 steps per day", "Average over 8,000 steps per day"]
  };
  byId("lifestyleGrid").innerHTML = LIFESTYLE_ITEMS.map(([key, label]) => `
    <label>${label}
      <select data-lifestyle="${key}">
        ${choices[key].map((choice, index) => `<option value="${index + 1}" ${choiceFor(key) === index + 1 ? "selected" : ""}>${choice}</option>`).join("")}
      </select>
    </label>`).join("");
  const setOptionalMeasurement = (id, storedValue, display) => {
    const value = Number(storedValue);
    byId(id).value = value > 0 && Number.isFinite(value) ? display(value).toFixed(1) : "";
  };
  byId("weeklyAge").value = Number(state.profile.age) > 0 ? String(state.profile.age) : "";
  byId("weeklySex").value = state.profile.sex || "";
  setOptionalMeasurement("weeklyHeight", state.profile.heightInches, displayHeight);
  setOptionalMeasurement("weeklyWaist", state.profile.waist, displayWaist);
  setOptionalMeasurement("startingWeight", state.profile.startWeight, displayWeight);
  setOptionalMeasurement("realGoal", state.profile.realGoal, displayWeight);
  setOptionalMeasurement("motivationalGoal", state.profile.motivationalGoal, displayWeight);
  updateWeeklyProfileStatus(true);
  updateWeeklyScorePreview();
  document.querySelectorAll("[data-lifestyle]").forEach(select => select.addEventListener("change", updateWeeklyScorePreview));
  ["weeklyAge", "weeklySex", "weeklyHeight", "startingWeight", "weeklyWaist"].forEach(id => {
    byId(id)[id === "weeklySex" ? "onchange" : "oninput"] = () => updateWeeklyProfileStatus(false);
  });
}

function updateWeeklyScorePreview() {
  const score = [...document.querySelectorAll("[data-lifestyle]")]
    .reduce((sum, select) => sum + Number(select.value || 0), 0);
  byId("weeklyScorePreview").textContent = String(score);
}

function updateWeeklyProfileStatus(setInitialOpenState = false) {
  const complete =
    Number(byId("weeklyAge").value) > 0 &&
    Boolean(byId("weeklySex").value) &&
    Number(byId("weeklyHeight").value) > 0 &&
    Number(byId("startingWeight").value) > 0 &&
    Number(byId("weeklyWaist").value) > 0;
  const details = byId("weeklyProfile");
  byId("weeklyProfileStatus").textContent = complete ? "Complete" : "Needs information";
  details.classList.toggle("is-incomplete", !complete);
  if (setInitialOpenState) details.open = !complete;
}

function saveWeekly() {
  const values = {};
  document.querySelectorAll("[data-lifestyle]").forEach(select => values[select.dataset.lifestyle] = Number(select.value));
  const lifestyleScore = Object.values(values).reduce((sum, value) => sum + value, 0);
  const score = Math.min(10, roundHalf(lifestyleScore / 24 * 10));
  const updatedAt = new Date().toISOString();
  const currentWeek = weekKey(new Date());
  state.weeks[currentWeek] = { values, score, summaryScore: lifestyleScore, assessed: true, scoreLogicVersion: 4, lifestyleScale: 3, updatedAt };
  state.profile.age = byId("weeklyAge").value ? Number(byId("weeklyAge").value) : state.profile.age;
  state.profile.sex = byId("weeklySex").value || state.profile.sex;
  state.profile.heightInches = byId("weeklyHeight").value ? storedHeight(Number(byId("weeklyHeight").value)) : state.profile.heightInches;
  state.profile.startWeight = byId("startingWeight").value ? storedWeight(Number(byId("startingWeight").value)) : state.profile.startWeight;
  state.profile.waist = byId("weeklyWaist").value ? storedWaist(Number(byId("weeklyWaist").value)) : state.profile.waist;
  state.profile.realGoal = byId("realGoal").value ? storedWeight(Number(byId("realGoal").value)) : state.profile.realGoal;
  if (Number(state.profile.realGoal) > 0) {
    state.profile.vibratoryLine = Number(state.profile.realGoal) + 4;
    localStorage.setItem(WEIGHT_GOAL_STORAGE_KEY, String(state.profile.realGoal));
  }
  state.profile.motivationalGoal = byId("motivationalGoal").value ? storedWeight(Number(byId("motivationalGoal").value)) : state.profile.motivationalGoal;
  state.profile.updatedAt = updatedAt;
  localStorage.setItem(LIFESTYLE_SUMMARY_STORAGE_KEY, JSON.stringify({
    week: currentWeek,
    score: lifestyleScore,
    maximumScore: 24,
    baseScore: lifestyleScore / 24 * 10,
    values: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value / 3])),
    updatedAt
  }));
  persist();
  byId("weeklyDialog").close();
  renderAll(fields.date.value);
}

function renderAll(dateValue = isoDate()) {
  const now = new Date();
  byId("heroWeekday").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(now);
  byId("heroDate").textContent = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(now);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor((now - yearStart) / 604800000);
  byId("weeklyReflection").innerHTML = WEEKLY_REFLECTIONS[weekNumber % WEEKLY_REFLECTIONS.length];
  updateProfileReminder();
  renderWeeklyCheckinNudge();
  renderToday(dateValue);
  renderCalendar();
  renderWeekly();
  renderMilestones();
  renderDailyInsights(dateValue);
  renderMiniGaugeCharts();
}

fields.date.addEventListener("change", () => {
  if (!fields.date.value) return;
  calendarViewDate = dateFromIso(fields.date.value);
  loadEntry(fields.date.value);
  renderCalendar();
});
byId("goToToday").addEventListener("click", () => {
  const today = isoDate();
  fields.date.value = today;
  calendarViewDate = dateFromIso(today);
  loadEntry(today);
  renderCalendar();
});
byId("previousMonth").addEventListener("click", () => {
  calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1, 12);
  renderCalendar();
});
byId("nextMonth").addEventListener("click", () => {
  calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1, 12);
  renderCalendar();
});
byId("calendarToday").addEventListener("click", () => {
  calendarViewDate = new Date();
  renderCalendar();
});
Object.keys(DAILY_GAUGE_CONFIG).forEach(key => {
  byId(DAILY_GAUGE_CONFIG[key].input).addEventListener("input", () => previewDailyGauge(key));
});
byId("saveHydration").addEventListener("click", () => saveDailyGauge("hydration"));
byId("saveStress").addEventListener("click", () => saveDailyGauge("stress"));
byId("saveSleep").addEventListener("click", () => saveDailyGauge("sleep"));
document.querySelectorAll("[data-gauge-step]").forEach(button => {
  button.addEventListener("click", () => stepDailyGauge(button.dataset.gaugeStep, Number(button.dataset.direction)));
});
byId("gaugeInfoButton").addEventListener("click", () => {
  const info = byId("gaugeInfo");
  info.hidden = !info.hidden;
  byId("gaugeInfoButton").setAttribute("aria-expanded", String(!info.hidden));
});
byId("saveEntry").addEventListener("click", saveEntry);
byId("addWalk").addEventListener("click", toggleAddWalk);
byId("openWalkCalculator").addEventListener("click", () => {
  const calculator = byId("walkCalculator");
  calculator.hidden = false;
  byId("openWalkCalculator").setAttribute("aria-expanded", "true");
  byId("calcTime").focus();
});
byId("closeWalkCalculator").addEventListener("click", () => {
  byId("walkCalculator").hidden = true;
  byId("openWalkCalculator").setAttribute("aria-expanded", "false");
  byId("openWalkCalculator").focus();
});
byId("walkList").addEventListener("click", event => {
  const button = event.target.closest("button[data-walk-action]");
  if (!button) return;
  const index = Number(button.dataset.walkIndex);
  if (button.dataset.walkAction === "edit") editWalk(index);
  if (button.dataset.walkAction === "delete") deleteWalk(index);
});
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
byId("weeklyButton").addEventListener("click", openWeeklyCheckin);
byId("weeklyCheckinUpdate").addEventListener("click", openWeeklyCheckin);
byId("weeklyCheckinLater").addEventListener("click", postponeWeeklyCheckin);
byId("closeWeekly").addEventListener("click", () => {
  const dialog = byId("weeklyDialog");
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
});
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
  if (event.key === "Escape") {
    closePreferences();
    const calculator = byId("walkCalculator");
    if (!calculator.hidden) {
      calculator.hidden = true;
      byId("openWalkCalculator").setAttribute("aria-expanded", "false");
      byId("openWalkCalculator").focus();
    }
  }
});

document.querySelectorAll('input[name="unitSystem"]').forEach(input => {
  input.addEventListener("change", () => {
    saveUnitSystem(input.value);
    applyUnitSystem();
  });
});

function scheduleDailyGaugeReset() {
  const scheduledDate = isoDate();
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 50);
  window.setTimeout(() => {
    if (fields.date.value === scheduledDate) {
      fields.date.value = isoDate();
      loadEntry(fields.date.value);
      renderAll(fields.date.value);
    }
    scheduleDailyGaugeReset();
  }, nextMidnight.getTime() - now.getTime());
}

persist();
loadEntry(isoDate());
renderAll();
setupWalkingCalculator();
applyUnitSystem();
scheduleDailyGaugeReset();
