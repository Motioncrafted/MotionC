const COLORS = ["#d52b69", "#ee7512", "#ffbf22"];
const FONTS = [
  "'Segoe Print', 'Comic Sans MS', cursive",
  "'Comic Sans MS', cursive"
];
const SIZE_SCALES = { small: 0.52, medium: 0.76, large: 1 };
const PLACEMENT_SPOTS = [
  { left: 5, top: 14 }, { left: 29, top: 14 }, { left: 53, top: 14 },
  { left: 5, top: 28 }, { left: 29, top: 28 }, { left: 53, top: 28 },
  { left: 5, top: 42 }, { left: 29, top: 42 }, { left: 53, top: 42 },
  { left: 5, top: 55 }, { left: 29, top: 55 }, { left: 53, top: 55 }
];
const WALL_CAPACITY = 10;
const MIN_VISIBLE_POSTS = 8;
const VISITOR_POST_LIMIT = 3;
const LEGACY_WALL_STORAGE_KEY = "motionc-drop-zone-wall-v1";
const WALL_STORAGE_KEY = "motionc-visitor-commons-wall-v1";

const message = document.getElementById("message");
const messageCount = document.getElementById("messageCount");
const sprayButton = document.getElementById("sprayButton");
const tagLayer = document.getElementById("tagLayer");
const commonHistory = document.getElementById("commonHistory");
const historyState = document.getElementById("historyState");
const emojiToggle = document.getElementById("emojiToggle");
const emojiMenu = document.getElementById("emojiMenu");
const mistTarget = document.getElementById("mistTarget");
const sprayStream = document.getElementById("sprayStream");
const purpleCan = document.getElementById("purpleCan");
const preferencesStorageKey = "motionc-preferences-v1";
const preferencesToggle = document.getElementById("preferencesToggle");
const preferencesMenu = document.getElementById("preferencesMenu");
const preferencesClose = document.getElementById("preferencesClose");
const mobileMoreToggle = document.getElementById("mobileMoreToggle");
const mobileMoreMenu = document.getElementById("mobileMoreMenu");
const commonsTab = document.getElementById("commonsTab");
const myWallTab = document.getElementById("myWallTab");
const myWallInvitation = document.getElementById("myWallInvitation");
const invitationClose = document.getElementById("invitationClose");
const wallViewDescription = document.getElementById("wallViewDescription");
const visitorPostLimit = document.getElementById("visitorPostLimit");
const visitorAccountActions = document.getElementById("visitorAccountActions");

let selectedColor = COLORS[0];
let selectedFont = FONTS[0];
let selectedSize = "large";
let spraying = false;
let spraySequence = 0;
let wallTags = [];
let historyTags = [];
let currentSession = null;
let currentWall = "commons";

messageCount.textContent = message.value.length;

function sanitizeMessage(value) {
  const allowedEmoji = currentSession && currentWall === "private"
    ? ["🎉", "😊", "💪", "👟", "⭐", "👍", "😎"]
    : ["🎉", "😊"];
  return value.replace(
    /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu,
    emoji => allowedEmoji.includes(emoji.replace("\uFE0F", "")) ? emoji : ""
  );
}

message.addEventListener("input", () => {
  const clean = sanitizeMessage(message.value);
  if (clean !== message.value) message.value = clean;
  messageCount.textContent = message.value.length;
  sprayButton.disabled = spraying || !message.value.trim();
});

document.querySelectorAll("[data-font]").forEach(button => {
  button.addEventListener("click", () => {
    if (!button.dataset.font) return;
    selectedFont = button.dataset.font;
    document.querySelectorAll("[data-font]").forEach(item =>
      item.classList.toggle("selected", item === button)
    );
    saveWallPreferences();
  });
});

document.querySelectorAll("[data-color]").forEach(button => {
  button.addEventListener("click", () => {
    if (!button.dataset.color) return;
    selectedColor = button.dataset.color;
    document.querySelectorAll("[data-color]").forEach(item =>
      item.classList.toggle("selected", item === button)
    );
    saveWallPreferences();
  });
});

document.querySelectorAll("[data-size]").forEach(button => {
  button.addEventListener("click", () => {
    selectedSize = button.dataset.size;
    document.querySelectorAll("[data-size]").forEach(item =>
      item.classList.toggle("selected", item === button)
    );
    saveWallPreferences();
  });
});

emojiToggle.addEventListener("click", () => {
  const open = emojiMenu.hidden;
  emojiMenu.hidden = !open;
  emojiToggle.setAttribute("aria-expanded", String(open));
});

document.querySelectorAll("[data-emoji]").forEach(button => {
  button.addEventListener("click", () => {
    const spacer = message.value && !message.value.endsWith(" ") ? " " : "";
    const next = `${message.value}${spacer}${button.dataset.emoji}`;
    if (next.length <= 60) message.value = next;
    messageCount.textContent = message.value.length;
    emojiMenu.hidden = true;
    emojiToggle.setAttribute("aria-expanded", "false");
    message.focus();
  });
});

function sizeFor(text, sizeChoice = "large") {
  const baseSize = text.length <= 18 ? 2.65
    : text.length <= 38 ? 2.2
    : text.length <= 60 ? 1.8
    : 1.48;
  return `${(baseSize * (SIZE_SCALES[sizeChoice] || 1)).toFixed(3)}vw`;
}

function widthFor(text) {
  if (text.length > 60) return "25%";
  if (text.length > 38) return "23%";
  return "20%";
}

function applyWallTagStyles(element, tag) {
  element.style.setProperty("--tag-color", tag.color);
  element.style.setProperty("--tag-left", `${tag.left}%`);
  element.style.setProperty("--tag-top", `${tag.top}%`);
  element.style.setProperty("--tag-angle", `${tag.rotation}deg`);
  element.style.setProperty("--tag-font", tag.font);
  element.style.setProperty("--tag-size", tag.size);
  element.style.setProperty("--tag-width", tag.width);
  element.style.setProperty("--tag-shift-x", "0px");
  element.style.setProperty("--tag-shift-y", "0px");
}

function createWallTag(tag, reveal = true) {
  const element = document.createElement("span");
  element.className = `wall-tag${reveal ? " revealed" : ""}`;
  applyWallTagStyles(element, tag);
  element.textContent = tag.text;
  tagLayer.append(element);
  if (reveal) requestAnimationFrame(() => fitTagToWall(element));
  return element;
}

function fitTagToWall(element) {
  const layer = tagLayer.getBoundingClientRect();
  const tag = element.getBoundingClientRect();
  const safe = {
    left: layer.left + layer.width * 0.025,
    right: layer.left + layer.width * 0.79,
    top: layer.top + layer.height * 0.12,
    bottom: layer.top + layer.height * 0.71
  };
  let shiftX = 0;
  let shiftY = 0;

  if (tag.left < safe.left) shiftX += safe.left - tag.left;
  if (tag.right + shiftX > safe.right) shiftX -= tag.right + shiftX - safe.right;
  if (tag.top < safe.top) shiftY += safe.top - tag.top;
  if (tag.bottom + shiftY > safe.bottom) shiftY -= tag.bottom + shiftY - safe.bottom;

  element.style.setProperty("--tag-shift-x", `${shiftX}px`);
  element.style.setProperty("--tag-shift-y", `${shiftY}px`);
}

function overlapScore(box, occupiedBoxes) {
  const padding = Math.max(8, tagLayer.getBoundingClientRect().width * 0.008);
  return occupiedBoxes.reduce((score, occupied) => {
    const overlapWidth = Math.max(
      0,
      Math.min(box.right + padding, occupied.right) - Math.max(box.left - padding, occupied.left)
    );
    const overlapHeight = Math.max(
      0,
      Math.min(box.bottom + padding, occupied.bottom) - Math.max(box.top - padding, occupied.top)
    );
    return score + overlapWidth * overlapHeight;
  }, 0);
}

function chooseTagPlacement(tag, element, occupiedBoxes, startIndex = 0) {
  let best = null;

  PLACEMENT_SPOTS.forEach((spot, offset) => {
    const candidateIndex = (startIndex + offset) % PLACEMENT_SPOTS.length;
    const candidate = PLACEMENT_SPOTS[candidateIndex];
    tag.left = candidate.left;
    tag.top = candidate.top;
    applyWallTagStyles(element, tag);
    fitTagToWall(element);
    const box = element.getBoundingClientRect();
    const score = overlapScore(box, occupiedBoxes) + offset * 0.01;
    if (!best || score < best.score) {
      best = { left: candidate.left, top: candidate.top, score };
    }
  });

  tag.left = best.left;
  tag.top = best.top;
  applyWallTagStyles(element, tag);
  fitTagToWall(element);
  return element.getBoundingClientRect();
}

function arrangeWallTags() {
  const occupiedBoxes = [];
  wallTags.forEach((tag, index) => {
    const box = chooseTagPlacement(tag, tag.element, occupiedBoxes, index * 3);
    occupiedBoxes.push(box);
  });
  saveLocalWall();
}

function placeNewTag(tag) {
  const measuringTag = createWallTag(tag, false);
  measuringTag.style.visibility = "hidden";
  chooseTagPlacement(
    tag,
    measuringTag,
    wallTags
      .slice(wallTags.length >= WALL_CAPACITY ? 1 : 0)
      .map(item => item.element.getBoundingClientRect()),
    spraySequence * 3
  );
  measuringTag.remove();
}

function storableTag(tag) {
  const { element, ...stored } = tag;
  return stored;
}

function saveLocalWall() {
  try {
    localStorage.setItem(WALL_STORAGE_KEY, JSON.stringify(wallTags.map(storableTag)));
  } catch {
    // The shared database remains the source of truth when browser storage is unavailable.
  }
}

function syncVisitorPostLimit() {
  const atLimit = !currentSession && currentWall === "commons" && wallTags.length >= VISITOR_POST_LIMIT;
  visitorPostLimit.hidden = !atLimit;
  sprayButton.disabled = spraying || atLimit || !message.value.trim();
  sprayButton.hidden = atLimit;
  sprayButton.textContent = spraying ? "SPRAYING…" : "SPRAY IT!";
}

function validStoredTag(tag) {
  return tag && typeof tag.text === "string" && tag.text.trim() &&
    COLORS.includes(tag.color) && FONTS.includes(tag.font) &&
    Number.isFinite(Number(tag.left)) && Number.isFinite(Number(tag.top));
}

function renderWall(tags) {
  tagLayer.replaceChildren();
  wallTags = tags.slice(-WALL_CAPACITY).map(tag => {
    const normalized = {
      ...tag,
      rotation: Math.max(-18, Math.min(18, Number(tag.rotation) || 0)),
      size: tag.size || sizeFor(tag.text),
      width: tag.width || widthFor(tag.text)
    };
    normalized.element = createWallTag(normalized, false);
    return normalized;
  });
  spraySequence = wallTags.length;
  requestAnimationFrame(() => {
    wallTags.forEach(tag => fitTagToWall(tag.element));
  });
}

function restoreLocalWall() {
  try {
    if (!localStorage.getItem(WALL_STORAGE_KEY) && localStorage.getItem(LEGACY_WALL_STORAGE_KEY)) {
      localStorage.setItem(WALL_STORAGE_KEY, localStorage.getItem(LEGACY_WALL_STORAGE_KEY));
      localStorage.removeItem(LEGACY_WALL_STORAGE_KEY);
    }
    const stored = JSON.parse(localStorage.getItem(WALL_STORAGE_KEY));
    if (Array.isArray(stored)) renderWall(stored.filter(validStoredTag).slice(-VISITOR_POST_LIMIT));
  } catch {
    localStorage.removeItem(WALL_STORAGE_KEY);
  }
}

function layoutForHistoryTag(tag, index) {
  const existing = wallTags.find(item => item.id === tag.id);
  if (existing) return { ...existing, ...tag };
  const spot = PLACEMENT_SPOTS[index % PLACEMENT_SPOTS.length];
  return {
    ...tag,
    left: Number.isFinite(Number(tag.left)) ? Number(tag.left) : spot.left,
    top: Number.isFinite(Number(tag.top)) ? Number(tag.top) : spot.top,
    rotation: Number.isFinite(Number(tag.rotation)) ? Number(tag.rotation) : -8 + index * 3.5,
    size: tag.size || sizeFor(tag.text),
    width: tag.width || widthFor(tag.text)
  };
}

function restoreSharedWall(tags) {
  const visible = tags.slice(0, WALL_CAPACITY).reverse();
  renderWall(visible.map(layoutForHistoryTag));
}

function formatTime(createdAt) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  }).format(date);
}

function renderHistory() {
  commonHistory.replaceChildren();
  if (!historyTags.length) {
    const empty = document.createElement("p");
    empty.className = "history-state";
    empty.textContent = "The next sprayed win will appear here.";
    commonHistory.append(empty);
    return;
  }

  historyTags.forEach(tag => {
    const article = document.createElement("article");
    article.className = "history-tag";
    const text = document.createElement("p");
    text.textContent = tag.text;
    text.style.color = tag.color;
    text.style.fontFamily = tag.font;
    const time = document.createElement("time");
    time.dateTime = tag.createdAt;
    time.textContent = formatTime(tag.createdAt);
    article.append(text, time);
    if (currentWall === "private" && currentSession) {
      if (tag.isPinned) {
        const pin = document.createElement("span");
        pin.className = "history-pin";
        pin.textContent = "📌 Pinned";
        article.prepend(pin);
      }
      const actions = document.createElement("div");
      actions.className = "history-actions";
      actions.innerHTML = `
        <button type="button" data-wall-action="edit" data-id="${tag.id}">Edit</button>
        <button type="button" data-wall-action="pin" data-id="${tag.id}">${tag.isPinned ? "Unpin" : "Pin"}</button>
        <button type="button" data-wall-action="archive" data-id="${tag.id}">Archive</button>
        <button type="button" data-wall-action="delete" data-id="${tag.id}">Delete</button>`;
      article.append(actions);
    }
    commonHistory.append(article);
  });
}

async function loadHistory() {
  try {
    const table = currentWall === "commons" ? "commons_posts" : "private_wall_posts";
    let query = supabase.from(table).select("*");
    if (currentWall === "commons") {
      query = query.eq("status", "published").order("created_at", { ascending: false });
    } else {
      query = query.eq("is_archived", false)
        .order("is_pinned", { ascending: false })
        .order("pinned_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
    }
    query = query.limit(50);
    const { data, error } = await query;
    if (error) throw error;
    historyTags = (data || []).map(row => ({
      id: row.id, text: row.text, color: row.color, font: row.font,
      sizeChoice: row.size_choice, size: sizeFor(row.text, row.size_choice),
      width: `${Number(row.width_percent)}%`, left: Number(row.position_x),
      top: Number(row.position_y), rotation: Number(row.rotation), createdAt: row.created_at
      , isPinned: Boolean(row.is_pinned), pinnedAt: row.pinned_at
    }));
    renderHistory();
    restoreSharedWall(historyTags);
  } catch {
    historyState.classList.add("error");
    historyState.textContent = currentWall === "commons" ? "The Commons is temporarily unavailable." : "Your private wall is temporarily unavailable.";
  }
}

function buildMist(tag) {
  mistTarget.replaceChildren();
  mistTarget.style.setProperty("--target-left", `${tag.left}%`);
  mistTarget.style.setProperty("--target-top", `${tag.top}%`);
  mistTarget.style.setProperty("--paint", tag.color);
  for (let index = 0; index < 24; index += 1) {
    const particle = document.createElement("i");
    particle.style.setProperty("--cloud-index", index);
    mistTarget.append(particle);
  }
  mistTarget.classList.add("active");
}

function buildSpray(color) {
  sprayStream.replaceChildren();
  for (let index = 0; index < 120; index += 1) {
    const particle = document.createElement("i");
    particle.style.setProperty("--delay", `${Math.random() * 1.55}s`);
    particle.style.setProperty("--size", `${4 + Math.random() * 13}px`);
    particle.style.setProperty("--spread-x", `${-75 + Math.random() * 150}px`);
    particle.style.setProperty("--spread-y", `${-65 + Math.random() * 130}px`);
    particle.style.setProperty("--paint", color);
    sprayStream.append(particle);
  }
}

async function saveHistory(tag) {
  if (!currentSession) {
    historyTags = [{ ...tag }, ...historyTags];
    renderHistory();
    return;
  }
  try {
    const table = currentWall === "commons" ? "commons_posts" : "private_wall_posts";
    const record = {
      id: tag.id, user_id: currentSession.user.id, text: tag.text,
      color: tag.color, font: tag.font, size_choice: tag.sizeChoice,
      width_percent: Number.parseFloat(tag.width), position_x: tag.left,
      position_y: tag.top, rotation: tag.rotation
    };
    const { data, error } = await supabase.from(table).insert(record).select().single();
    if (error) throw error;
    historyTags = [{ ...tag, createdAt: data.created_at }, ...historyTags.filter(item => item.id !== tag.id)];
  } catch {
    historyState.classList.add("error");
    historyState.textContent = "That message stayed on this screen but could not be saved.";
  }
  renderHistory();
}

function spray() {
  const text = message.value.trim();
  if (!text || spraying || (!currentSession && currentWall === "commons" && wallTags.length >= VISITOR_POST_LIMIT)) {
    syncVisitorPostLimit();
    return;
  }

  spraying = true;
  sprayButton.disabled = true;
  sprayButton.textContent = "SPRAYING…";

  spraySequence += 1;
  const tag = {
    id: crypto.randomUUID(),
    text,
    color: selectedColor,
    font: selectedFont,
    left: 5,
    top: 14,
    rotation: wallTags.length % 5 === 4
      ? (Math.random() > .5 ? 1 : -1) * (13 + Math.random() * 5)
      : -11 + Math.random() * 22,
    size: sizeFor(text, selectedSize),
    sizeChoice: selectedSize,
    width: widthFor(text)
  };
  tag.createdAt = new Date().toISOString();
  placeNewTag(tag);

  buildMist(tag);
  buildSpray(tag.color);
  purpleCan.classList.add("spraying");
  saveHistory(tag);

  window.setTimeout(() => {
    if (wallTags.length >= WALL_CAPACITY) {
      const removableCount = Math.max(0, wallTags.length - MIN_VISIBLE_POSTS + 1);
      const removeCount = Math.min(1, removableCount);
      wallTags.splice(0, removeCount).forEach(oldTag => oldTag.element.remove());
    }
    tag.element = createWallTag(tag);
    wallTags.push(tag);
    if (!currentSession && currentWall === "commons") saveLocalWall();
    syncVisitorPostLimit();
  }, 850);

  window.setTimeout(() => mistTarget.classList.remove("active"), 2700);
  window.setTimeout(() => {
    spraying = false;
    syncVisitorPostLimit();
    purpleCan.classList.remove("spraying");
    sprayStream.replaceChildren();
  }, 3150);
}

function loadUnitSystem() {
  try {
    return JSON.parse(localStorage.getItem(preferencesStorageKey))?.unitSystem === "metric"
      ? "metric"
      : "imperial";
  } catch {
    return "imperial";
  }
}

function syncUnitChoices() {
  const selected = loadUnitSystem();
  document.querySelectorAll('input[name="unitSystem"]').forEach(input => {
    input.checked = input.value === selected;
  });
}

function closePreferences() {
  preferencesMenu.hidden = true;
  preferencesToggle.setAttribute("aria-expanded", "false");
}

preferencesToggle.addEventListener("click", event => {
  event.preventDefault();
  event.stopPropagation();
  const willOpen = preferencesMenu.hidden;
  if (willOpen) syncUnitChoices();
  preferencesMenu.hidden = !willOpen;
  preferencesToggle.setAttribute("aria-expanded", String(willOpen));
});

preferencesMenu.addEventListener("click", event => event.stopPropagation());
preferencesClose.addEventListener("click", closePreferences);

document.querySelectorAll('input[name="unitSystem"]').forEach(input => {
  input.addEventListener("change", () => {
    const unitSystem = input.value === "metric" ? "metric" : "imperial";
    localStorage.setItem(
      preferencesStorageKey,
      JSON.stringify({ unitSystem, updatedAt: new Date().toISOString() })
    );
    window.dispatchEvent(new CustomEvent("motionc:preferences-updated", { detail: { unitSystem } }));
  });
});

window.addEventListener("storage", event => {
  if (event.key === preferencesStorageKey) syncUnitChoices();
});

function setMobileMoreMenu(open) {
  mobileMoreMenu.hidden = !open;
  mobileMoreToggle.setAttribute("aria-expanded", String(open));
  mobileMoreToggle.setAttribute(
    "aria-label",
    open ? "Close more navigation" : "Open more navigation"
  );
}

mobileMoreToggle.addEventListener("click", event => {
  event.stopPropagation();
  setMobileMoreMenu(mobileMoreMenu.hidden);
});

document.addEventListener("click", event => {
  if (!preferencesMenu.hidden && !preferencesMenu.contains(event.target)) closePreferences();
  if (
    !mobileMoreMenu.hidden &&
    !mobileMoreMenu.contains(event.target) &&
    !mobileMoreToggle.contains(event.target)
  ) setMobileMoreMenu(false);
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (!preferencesMenu.hidden) {
    closePreferences();
    preferencesToggle.focus();
  }
  if (!mobileMoreMenu.hidden) {
    setMobileMoreMenu(false);
    mobileMoreToggle.focus();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 760 && !mobileMoreMenu.hidden) setMobileMoreMenu(false);
});

function setActiveTab(name) {
  currentWall = name;
  const commonsActive = name === "commons";
  commonsTab.classList.toggle("active", commonsActive);
  myWallTab.classList.toggle("active", !commonsActive);
  commonsTab.setAttribute("aria-selected", String(commonsActive));
  myWallTab.setAttribute("aria-selected", String(!commonsActive));
  document.querySelector(".wall-stage").classList.toggle("my-wall-mode", !commonsActive && Boolean(currentSession));
  wallViewDescription.textContent = commonsActive
    ? "A shared space to celebrate wins and inspire each other."
    : "Your private place for wins, milestones and memories.";
}

async function openCommons() {
  myWallInvitation.hidden = true;
  setActiveTab("commons");
  setMemberChoices(false);
  historyState.classList.remove("error");
  if (currentSession) await loadHistory();
  else {
    restoreLocalWall();
    historyTags = wallTags.map(storableTag).reverse();
    renderHistory();
  }
  syncVisitorPostLimit();
}

async function openMyWall() {
  if (!currentSession) {
    myWallInvitation.hidden = false;
    myWallInvitation.querySelector("a").focus();
    return;
  }
  myWallInvitation.hidden = true;
  setActiveTab("private");
  setMemberChoices(true);
  await loadWallPreferences();
  historyState.classList.remove("error");
  await loadHistory();
  syncVisitorPostLimit();
}

commonsTab.addEventListener("click", openCommons);
myWallTab.addEventListener("click", openMyWall);
invitationClose.addEventListener("click", openCommons);

function setMemberChoices(enabled) {
  document.querySelectorAll(".member-choice, [data-member-font]").forEach(button => {
    button.disabled = !enabled;
    button.classList.toggle("unlocked", enabled);
    if (button.dataset.memberEmoji) button.classList.toggle("locked", !enabled);
    if (button.dataset.memberColor || button.dataset.memberFont) {
      button.classList.toggle("locked-choice", !enabled);
    }
    if (button.dataset.memberColor) button.dataset.color = enabled ? button.dataset.memberColor : "";
    if (button.dataset.memberFont) button.dataset.font = enabled ? button.dataset.memberFont : "";
    if (button.dataset.memberEmoji) button.dataset.emoji = enabled ? button.dataset.memberEmoji : "";
  });
}

async function loadWallPreferences() {
  if (!currentSession) return;
  const { data } = await supabase.from("wall_preferences")
    .select("default_color, default_font, default_size")
    .eq("user_id", currentSession.user.id)
    .maybeSingle();
  if (!data) return;
  selectedColor = data.default_color || selectedColor;
  selectedFont = data.default_font || selectedFont;
  selectedSize = data.default_size || selectedSize;
  document.querySelectorAll("[data-color]").forEach(item => item.classList.toggle("selected", item.dataset.color === selectedColor));
  document.querySelectorAll("[data-font]").forEach(item => item.classList.toggle("selected", item.dataset.font === selectedFont));
  document.querySelectorAll("[data-size]").forEach(item => item.classList.toggle("selected", item.dataset.size === selectedSize));
}

async function saveWallPreferences() {
  if (!currentSession || currentWall !== "private") return;
  const { error } = await supabase.from("wall_preferences").upsert({
    user_id: currentSession.user.id,
    default_color: selectedColor,
    default_font: selectedFont,
    default_size: selectedSize,
    updated_at: new Date().toISOString()
  });
  if (error) console.error("My Wall preferences could not be saved", error);
}

commonHistory.addEventListener("click", async event => {
  const button = event.target.closest("[data-wall-action]");
  if (!button || currentWall !== "private" || !currentSession) return;
  const tag = historyTags.find(item => item.id === button.dataset.id);
  if (!tag) return;

  let operation;
  if (button.dataset.wallAction === "edit") {
    const revised = window.prompt("Edit your private wall message", tag.text);
    if (revised === null || !revised.trim()) return;
    operation = supabase.from("private_wall_posts").update({ text: revised.trim().slice(0, 60), updated_at: new Date().toISOString() }).eq("id", tag.id);
  } else if (button.dataset.wallAction === "pin") {
    const pinning = !tag.isPinned;
    operation = supabase.from("private_wall_posts").update({
      is_pinned: pinning,
      pinned_at: pinning ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }).eq("id", tag.id);
  } else if (button.dataset.wallAction === "archive") {
    operation = supabase.from("private_wall_posts").update({ is_archived: true, updated_at: new Date().toISOString() }).eq("id", tag.id);
  } else if (button.dataset.wallAction === "delete") {
    if (!window.confirm("Permanently delete this private wall message?")) return;
    operation = supabase.from("private_wall_posts").delete().eq("id", tag.id);
  }

  button.disabled = true;
  const { error } = await operation;
  if (error) {
    historyState.classList.add("error");
    historyState.textContent = "That private-wall change could not be saved.";
    button.disabled = false;
    return;
  }
  await loadHistory();
});

syncUnitChoices();
sprayButton.addEventListener("click", spray);
currentSession = await getSession().catch(() => null);
visitorAccountActions.hidden = Boolean(currentSession);
if (currentSession && new URLSearchParams(location.search).get("wall") === "my") await openMyWall();
else await openCommons();
import { supabase, getSession } from "../shared/motionc-supabase.js?v=20260820-1";
