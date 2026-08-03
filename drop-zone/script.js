const COLORS = ["#d52b69", "#ee7512", "#ffbf22"];
const FONTS = [
  "'Segoe Print', 'Comic Sans MS', cursive",
  "'Comic Sans MS', cursive"
];
const SAFE_SPOTS = [
  { left: 8, top: 18 }, { left: 27, top: 20 },
  { left: 48, top: 18 }, { left: 53, top: 27 },
  { left: 12, top: 34 }, { left: 34, top: 37 },
  { left: 56, top: 40 }, { left: 7, top: 49 },
  { left: 29, top: 52 }, { left: 51, top: 54 }
];
const WALL_CAPACITY = SAFE_SPOTS.length;
const MIN_VISIBLE_POSTS = 8;

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

let selectedColor = COLORS[0];
let selectedFont = FONTS[0];
let spraying = false;
let spraySequence = 0;
let wallTags = [];
let historyTags = [];

messageCount.textContent = message.value.length;

function sanitizeMessage(value) {
  return value.replace(
    /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu,
    emoji => ["🎉", "🔥"].includes(emoji.replace("\uFE0F", "")) ? emoji : ""
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
    selectedFont = button.dataset.font;
    document.querySelectorAll("[data-font]").forEach(item =>
      item.classList.toggle("selected", item === button)
    );
  });
});

document.querySelectorAll("[data-color]").forEach(button => {
  button.addEventListener("click", () => {
    selectedColor = button.dataset.color;
    document.querySelectorAll("[data-color]").forEach(item =>
      item.classList.toggle("selected", item === button)
    );
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

function sizeFor(text) {
  if (text.length <= 18) return "2.65vw";
  if (text.length <= 38) return "2.2vw";
  if (text.length <= 60) return "1.8vw";
  return "1.48vw";
}

function widthFor(text) {
  if (text.length > 60) return "25%";
  if (text.length > 38) return "23%";
  return "20%";
}

function createWallTag(tag) {
  const element = document.createElement("span");
  element.className = "wall-tag revealed";
  element.style.setProperty("--tag-color", tag.color);
  element.style.setProperty("--tag-left", `${tag.left}%`);
  element.style.setProperty("--tag-top", `${tag.top}%`);
  element.style.setProperty("--tag-angle", `${tag.rotation}deg`);
  element.style.setProperty("--tag-font", tag.font);
  element.style.setProperty("--tag-size", tag.size);
  element.style.setProperty("--tag-width", tag.width);
  element.textContent = tag.text;
  tagLayer.append(element);
  return element;
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
    commonHistory.append(article);
  });
}

async function loadHistory() {
  try {
    const response = await fetch("/api/tags", { cache: "no-store" });
    if (!response.ok) throw new Error("History unavailable");
    const payload = await response.json();
    historyTags = payload.tags || [];
    renderHistory();
  } catch {
    historyState.classList.add("error");
    historyState.textContent = "Commons will be available after its database is connected.";
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
  try {
    const response = await fetch("/api/tags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: tag.text, color: tag.color, font: tag.font })
    });
    if (!response.ok) throw new Error("Save failed");
    const payload = await response.json();
    historyTags = [payload.tag, ...historyTags.filter(item => item.id !== payload.tag.id)];
  } catch {
    historyTags = [{
      id: tag.id,
      text: tag.text,
      color: tag.color,
      font: tag.font,
      createdAt: new Date().toISOString()
    }, ...historyTags];
  }
  renderHistory();
}

function spray() {
  const text = message.value.trim();
  if (!text || spraying) return;

  spraying = true;
  sprayButton.disabled = true;
  sprayButton.textContent = "SPRAYING…";

  const spot = SAFE_SPOTS[spraySequence % SAFE_SPOTS.length];
  spraySequence += 1;
  const tag = {
    id: crypto.randomUUID(),
    text,
    color: selectedColor,
    font: selectedFont,
    left: spot.left + (-1.8 + Math.random() * 3.6),
    top: spot.top + (-1.4 + Math.random() * 2.8),
    rotation: wallTags.length % 5 === 4
      ? (Math.random() > .5 ? 1 : -1) * (20 + Math.random() * 17)
      : -11 + Math.random() * 22,
    size: sizeFor(text),
    width: widthFor(text)
  };

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
  }, 850);

  window.setTimeout(() => mistTarget.classList.remove("active"), 2700);
  window.setTimeout(() => {
    spraying = false;
    sprayButton.disabled = !message.value.trim();
    sprayButton.textContent = "SPRAY IT!";
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

syncUnitChoices();
sprayButton.addEventListener("click", spray);
loadHistory();
