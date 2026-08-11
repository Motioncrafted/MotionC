import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://fzduvafeshrrouaejots.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Kg00R81ExPx9Z1-Wcd-Ffg_mQaXHRrI";
const ACTIVE_USER_KEY = "motionc-auth-active-user";
const DATA_PREFIX = "motionc-";
const AUTH_PREFIX = "motionc-auth-";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function dataKeys() {
  return Object.keys(localStorage).filter((key) => key.startsWith(DATA_PREFIX) && !key.startsWith(AUTH_PREFIX));
}

export function captureLocalState() {
  const storage = {};
  dataKeys().sort().forEach((key) => { storage[key] = localStorage.getItem(key); });
  return { schemaVersion: 1, storage };
}

export function clearLocalState() {
  dataKeys().forEach((key) => localStorage.removeItem(key));
}

export function makeFreshState() {
  return {
    schemaVersion: 1,
    storage: {
      "motionc-daily-prototype-v1": JSON.stringify({ entries: {}, weeks: {}, profile: {}, dailyGauges: {} })
    }
  };
}

export function applyLocalState(state) {
  clearLocalState();
  Object.entries(state?.storage || {}).forEach(([key, value]) => {
    if (key.startsWith(DATA_PREFIX) && !key.startsWith(AUTH_PREFIX) && typeof value === "string") {
      localStorage.setItem(key, value);
    }
  });
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function readCloudState(userId) {
  const { data, error } = await supabase
    .from("motionc_user_state")
    .select("state, revision, updated_at")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function saveCloudState(userId, state = captureLocalState()) {
  const current = await readCloudState(userId);
  const { error } = await supabase.from("motionc_user_state").upsert({
    user_id: userId,
    state,
    revision: Number(current?.revision || 0) + 1,
    updated_at: new Date().toISOString()
  });
  if (error) throw error;
  return state;
}

export async function activateUser(userId, state) {
  applyLocalState(state);
  localStorage.setItem(ACTIVE_USER_KEY, userId);
  await saveCloudState(userId, state);
}

export async function signOutAndClear() {
  const session = await getSession();
  if (session?.user?.id && localStorage.getItem(ACTIVE_USER_KEY) === session.user.id) {
    await saveCloudState(session.user.id);
  }
  await supabase.auth.signOut();
  clearLocalState();
  localStorage.removeItem(ACTIVE_USER_KEY);
}

function accountBadge(label, href = "/auth/") {
  const link = document.createElement("a");
  link.className = "motionc-account-badge";
  link.href = href;
  link.textContent = label;
  link.setAttribute("aria-label", `${label}. Open account switcher.`);
  document.body.appendChild(link);
  const style = document.createElement("style");
  style.textContent = `.motionc-account-badge{position:fixed;right:18px;bottom:18px;z-index:9999;padding:10px 14px;border:1px solid #c9d8d1;border-radius:999px;background:#fff;color:#164b3a;box-shadow:0 8px 24px rgba(20,55,45,.16);font:700 13px/1 system-ui;text-decoration:none}.motionc-account-badge:hover{background:#eff7f2}`;
  document.head.appendChild(style);
}

async function bootPageSync() {
  if (location.pathname.includes("/auth")) return;
  let session;
  try { session = await getSession(); } catch { accountBadge("Account offline"); return; }
  if (!session) { accountBadge("Local mode · Sign in"); return; }

  const userId = session.user.id;
  if (localStorage.getItem(ACTIVE_USER_KEY) !== userId) {
    const cloud = await readCloudState(userId);
    applyLocalState(Object.keys(cloud.state?.storage || {}).length ? cloud.state : makeFreshState());
    localStorage.setItem(ACTIVE_USER_KEY, userId);
    location.reload();
    return;
  }

  accountBadge(session.user.email || "MotionC account");
  let previous = JSON.stringify(captureLocalState());
  let busy = false;
  const syncIfChanged = async () => {
    const next = JSON.stringify(captureLocalState());
    if (busy || next === previous) return;
    busy = true;
    try { await saveCloudState(userId, JSON.parse(next)); previous = next; }
    catch (error) { console.error("MotionC cloud sync failed", error); }
    finally { busy = false; }
  };
  setInterval(syncIfChanged, 1500);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") syncIfChanged(); });
  window.addEventListener("pagehide", syncIfChanged);
}

window.MotionCSupabase = {
  supabase, captureLocalState, clearLocalState, makeFreshState, applyLocalState,
  getSession, readCloudState, saveCloudState, activateUser, signOutAndClear
};

bootPageSync().catch((error) => {
  console.error("MotionC account bridge failed", error);
  if (!location.pathname.includes("/auth")) accountBadge("Account needs attention");
});
