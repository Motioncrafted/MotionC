import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
// Analytics loads independently: import, storage, network and initialization failures cannot block account sync.
function launchAnalytics(session) {
  void import("/shared/motionc-analytics.js?v=20260922-phase1").then(module => {
    window.MotionCAnalytics = { recordLibrarySearch: module.recordLibrarySearch };
    return module.startMotionCAnalytics(supabase, session);
  }).catch(() => console.warn("MotionC analytics: initialization-unavailable"));
}

const SUPABASE_URL = "https://fzduvafeshrrouaejots.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Kg00R81ExPx9Z1-Wcd-Ffg_mQaXHRrI";
const ACTIVE_USER_KEY = "motionc-auth-active-user";
const DATA_PREFIX = "motionc-";
const AUTH_PREFIX = "motionc-auth-";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Sync lifetime follows authentication, not the lifetime of an open page.
let authenticatedUserId;
let syncGeneration = 0;
let syncWorker = null;
let bootToken = null;
let reconcileTimer = null;
let localTransition = false;
const pendingSync = new Set();

function cancelledSync() {
  const error = new Error("Account changed before synchronization completed.");
  error.name = "AbortError";
  error.code = "MOTIONC_SYNC_CANCELLED";
  return error;
}

function stopSynchronization() {
  syncGeneration++;
  if (reconcileTimer !== null) clearTimeout(reconcileTimer);
  reconcileTimer = null;
  if (syncWorker) {
    clearInterval(syncWorker.timer);
    document.removeEventListener("visibilitychange", syncWorker.onHidden);
    window.removeEventListener("pagehide", syncWorker.onPageHide);
    syncWorker = null;
  }
  pendingSync.forEach(operation => operation.controller.abort());
  bootToken = null;
  window.MotionCAccountReady = null;
}

window.addEventListener("motionc:account-changing", stopSynchronization);

function beginSyncOperation(userId) {
  const operation = { userId, generation: syncGeneration, controller: new AbortController() };
  pendingSync.add(operation);
  return operation;
}

function assertSyncCurrent(operation, requireLocalOwner = true) {
  if (operation.controller.signal.aborted || operation.generation !== syncGeneration ||
      authenticatedUserId !== operation.userId ||
      (requireLocalOwner && localStorage.getItem(ACTIVE_USER_KEY) !== operation.userId)) {
    throw cancelledSync();
  }
}

async function verifySyncSession(operation, requireLocalOwner = true) {
  assertSyncCurrent(operation, requireLocalOwner);
  const session = await getSession();
  assertSyncCurrent(operation, requireLocalOwner);
  if (session?.user?.id !== operation.userId) throw cancelledSync();
}

function schedulePageSync() {
  if (localTransition || location.pathname.includes("/auth")) return;
  if (syncWorker || bootToken?.generation === syncGeneration) return;
  if (reconcileTimer !== null) clearTimeout(reconcileTimer);
  reconcileTimer = setTimeout(() => {
    reconcileTimer = null;
    void bootPageSync().catch(error => {
      if (error.code === "MOTIONC_SYNC_CANCELLED" || error.name === "AbortError") return;
      console.error("MotionC account bridge failed", error);
      accountBadge("Account needs attention");
    });
  }, 0);
}

function observeAuthentication(_event, session) {
  const nextUserId = session?.user?.id || null;
  if (authenticatedUserId !== undefined && authenticatedUserId !== nextUserId) {
    // Synchronous cancellation only: never await Supabase while its auth lock is held.
    window.dispatchEvent(new Event("motionc:account-changing"));
  }
  authenticatedUserId = nextUserId;
  schedulePageSync();
}

window.addEventListener("storage", event => {
  if (event.key !== ACTIVE_USER_KEY && event.key !== null) return;
  if (localStorage.getItem(ACTIVE_USER_KEY) !== authenticatedUserId) {
    window.dispatchEvent(new Event("motionc:account-changing"));
  }
  schedulePageSync();
});


function dataKeys() {
  return Object.keys(localStorage).filter((key) =>
    key.startsWith(DATA_PREFIX) &&
    !key.startsWith(AUTH_PREFIX) &&
    !key.startsWith("motionc-analytics-") &&
    key !== "motionc-visitor-commons-wall-v1"
  );
}

function hasPersonalLocalState() {
  return dataKeys().some((key) => {
    // Daily creates this reminder metadata before authentication finishes.
    // Still clear it on sign-out, but it cannot require a page reload by itself:
    // the next document would recreate it and restart the cleanup/reload loop.
    if (key === "motionc-weekly-checkin-nudge-v1") return false;
    if (key !== "motionc-daily-prototype-v1") return true;
    try {
      const daily = JSON.parse(localStorage.getItem(key) || "{}");
      return ["entries", "weeks", "profile", "dailyGauges", "scratchPads"]
        .some((section) => Object.keys(daily?.[section] || {}).length > 0);
    } catch {
      return true;
    }
  });
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
  window.MotionCAccountReady = null;
  window.dispatchEvent(new Event("motionc:account-changing"));
  clearLocalState();
  Object.entries(state?.storage || {}).forEach(([key, value]) => {
    if (key.startsWith(DATA_PREFIX) && !key.startsWith(AUTH_PREFIX) && !key.startsWith("motionc-analytics-") && typeof value === "string") {
      localStorage.setItem(key, value);
    }
  });
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function readCloudState(userId, { signal } = {}) {
  let query = supabase.from("motionc_user_state")
    .select("state, revision, updated_at").eq("user_id", userId);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.single();
  if (error) throw error;
  return data;
}

export async function saveCloudState(userId, state = captureLocalState()) {
  const operation = beginSyncOperation(userId);
  try {
    await verifySyncSession(operation);
    const current = await readCloudState(userId, { signal: operation.controller.signal });
    // Authentication may change while the revision read is in flight.
    await verifySyncSession(operation);
    const { error } = await supabase.from("motionc_user_state").upsert({
      user_id: userId,
      state,
      revision: Number(current?.revision || 0) + 1,
      updated_at: new Date().toISOString()
    }).abortSignal(operation.controller.signal);
    assertSyncCurrent(operation);
    if (error) throw error;
    return state;
  } finally {
    pendingSync.delete(operation);
  }
}

export async function activateUser(userId, state) {
  const operation = beginSyncOperation(userId);
  try {
    await verifySyncSession(operation, false);
    // No await between the ownership check and applying this account's state.
    applyLocalState(state);
    localStorage.setItem(ACTIVE_USER_KEY, userId);
  } finally { pendingSync.delete(operation); }
  await saveCloudState(userId, state);
  schedulePageSync();
}

export async function signOutAndClear() {
  localTransition = true;
  window.dispatchEvent(new Event("motionc:account-changing"));
  try {
    const session = await getSession();
    const userId = session?.user?.id || null;
    if (userId && localStorage.getItem(ACTIVE_USER_KEY) === userId) {
      // Preserve the existing final save, with all background workers stopped.
      await saveCloudState(userId);
    }
    const current = await getSession();
    if ((current?.user?.id || null) !== userId || authenticatedUserId !== userId) throw cancelledSync();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    const after = await getSession();
    // A different tab may already have signed in again: never clear that account.
    if (!after && authenticatedUserId === null &&
        (!localStorage.getItem(ACTIVE_USER_KEY) || localStorage.getItem(ACTIVE_USER_KEY) === userId)) {
      clearLocalState();
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  } finally {
    localTransition = false;
    schedulePageSync();
  }
}

function accountBadge(label, href = "/auth/") {
  const signedIn = href.includes("manage=1");
  const returnPath = `${location.pathname}${location.search}${location.hash}`;
  const accountHref = signedIn
    ? `${href}${href.includes("?") ? "&" : "?"}next=${encodeURIComponent(returnPath)}`
    : href;
  const landingAccount = document.querySelector(".member-sign-in");
  if (landingAccount) {
    landingAccount.href = accountHref;
    landingAccount.textContent = signedIn ? label : "Sign In";
    landingAccount.setAttribute(
      "aria-label",
      signedIn ? `${label}. Open account management.` : "Sign in to your MotionC account."
    );
    return;
  }

  const menu = document.querySelector(
    "#preferencesMenu, #summaryPreferencesMenu, #walkingPreferencesMenu, #enginePreferencesMenu"
  );
  if (menu) {
    let link = menu.querySelector(".motionc-menu-account");
    if (!link) {
      link = document.createElement("a");
      link.className = "motionc-menu-account";
      menu.prepend(link);
    }
    link.href = accountHref;
    link.textContent = signedIn ? label : "Sign in";
    link.dataset.accountState = signedIn ? "signed-in" : "signed-out";
    link.setAttribute(
      "aria-label",
      signedIn ? `${label}. Open account management.` : "Sign in to your MotionC account."
    );
    if (!document.getElementById("motionc-menu-account-style")) {
      const menuStyle = document.createElement("style");
      menuStyle.id = "motionc-menu-account-style";
      menuStyle.textContent = `.motionc-menu-account{display:block;margin:0 0 14px;padding:0 0 12px;border-bottom:1px solid #cad7d1;color:#164b3a;font:800 14px/1.25 system-ui;text-decoration:none;overflow-wrap:anywhere}.motionc-menu-account::before{display:block;margin-bottom:4px;color:#73827b;font:700 10px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;content:"MotionC account"}.motionc-menu-account:hover{color:#1f7659;text-decoration:underline}`;
      document.head.appendChild(menuStyle);
    }
    return;
  }

  const existingBadge = document.querySelector(".motionc-account-badge");
  const link = existingBadge || document.createElement("a");
  link.className = "motionc-account-badge";
  link.href = accountHref;
  link.textContent = label;
  link.setAttribute("aria-label", `${label}. Open account switcher.`);
  if (existingBadge) return;
  document.body.appendChild(link);
  const style = document.createElement("style");
  style.textContent = `.motionc-account-badge{position:fixed;right:18px;bottom:18px;z-index:9999;padding:10px 14px;border:1px solid #c9d8d1;border-radius:999px;background:#fff;color:#164b3a;box-shadow:0 8px 24px rgba(20,55,45,.16);font:700 13px/1 system-ui;text-decoration:none}.motionc-account-badge:hover{background:#eff7f2}`;
  document.head.appendChild(style);
}

function installPreferenceSignOut() {
  const menu = document.querySelector(
    "#preferencesMenu, #summaryPreferencesMenu, #walkingPreferencesMenu, #enginePreferencesMenu"
  );
  if (!menu || menu.querySelector(".motionc-preferences-signout")) return;

  const action = document.createElement("button");
  action.className = "motionc-preferences-signout";
  action.type = "button";
  action.textContent = "Sign out";
  action.addEventListener("click", async () => {
    action.disabled = true;
    action.textContent = "Signing out…";
    try {
      await signOutAndClear();
      location.assign("/landing-page/");
    } catch (error) {
      console.error("MotionC sign out failed", error);
      action.disabled = false;
      action.textContent = "Sign out";
    }
  });
  menu.appendChild(action);

  if (!document.getElementById("motionc-preferences-account-style")) {
    const style = document.createElement("style");
    style.id = "motionc-preferences-account-style";
    style.textContent = `.motionc-preferences-signout{display:block;width:100%;margin-top:14px;padding:12px 2px 2px;border:0;border-top:1px solid #cad7d1;border-radius:0;background:transparent;color:#8a3d35;font:800 13px/1.2 system-ui;text-align:left;cursor:pointer}.motionc-preferences-signout:hover{color:#a63d32;text-decoration:underline}.motionc-preferences-signout:disabled{opacity:.65;cursor:wait}`;
    document.head.appendChild(style);
  }
}

async function bootPageSync() {
  if (location.pathname.includes("/auth") || localTransition || syncWorker) return;
  const token = { generation: syncGeneration };
  bootToken = token;
  let operation;
  try {
    const session = await getSession();
    if (token.generation !== syncGeneration || bootToken !== token || localTransition) return;
    if ((session?.user?.id || null) !== authenticatedUserId) {
      observeAuthentication("SESSION_CHECK", session);
      // Allow reconciliation after this invocation releases its boot token.
      setTimeout(schedulePageSync, 0);
      return;
    }
    launchAnalytics(session);
    if (!session) {
      const hadPersonalState = hasPersonalLocalState();
      clearLocalState();
      localStorage.removeItem(ACTIVE_USER_KEY);
      document.querySelector(".motionc-preferences-signout")?.remove();
      if (hadPersonalState) { location.reload(); return; }
      accountBadge("Local mode · Sign in");
      return;
    }

    const userId = session.user.id;
    operation = beginSyncOperation(userId);
    if (localStorage.getItem(ACTIVE_USER_KEY) !== userId) {
      const cloud = await readCloudState(userId, { signal: operation.controller.signal });
      await verifySyncSession(operation, false);
      applyLocalState(Object.keys(cloud.state?.storage || {}).length ? cloud.state : makeFreshState());
      localStorage.setItem(ACTIVE_USER_KEY, userId);
      location.reload();
      return;
    }

    let accountLabel = session.user.user_metadata?.username || "MotionC account";
    try {
      const { data: profile } = await supabase.from("motionc_profiles")
        .select("display_name").eq("user_id", userId).abortSignal(operation.controller.signal).maybeSingle();
      if (profile?.display_name) accountLabel = profile.display_name;
    } catch { /* Keep the private email out of the site identity. */ }
    await verifySyncSession(operation);
    accountBadge(accountLabel, "/auth/?manage=1");
    installPreferenceSignOut();
    const worker = { userId, generation: syncGeneration, previous: JSON.stringify(captureLocalState()), busy: false };
    const isCurrent = () => syncWorker === worker && worker.generation === syncGeneration &&
      authenticatedUserId === userId && localStorage.getItem(ACTIVE_USER_KEY) === userId;
    const syncIfChanged = async () => {
      if (!isCurrent() || worker.busy) return;
      const next = JSON.stringify(captureLocalState());
      if (next === worker.previous) return;
      worker.busy = true;
      try {
        await saveCloudState(userId, JSON.parse(next));
        if (isCurrent()) worker.previous = next;
      } catch (error) {
        if (isCurrent() && error.code !== "MOTIONC_SYNC_CANCELLED" && error.name !== "AbortError") {
          console.error("MotionC cloud sync failed", error);
        }
      } finally { worker.busy = false; }
    };
    worker.onHidden = () => { if (document.visibilityState === "hidden") void syncIfChanged(); };
    worker.onPageHide = () => { void syncIfChanged(); };
    syncWorker = worker;
    worker.timer = setInterval(syncIfChanged, 1500);
    document.addEventListener("visibilitychange", worker.onHidden);
    window.addEventListener("pagehide", worker.onPageHide);
    window.MotionCAccountReady = { owner: userId };
    window.dispatchEvent(new CustomEvent("motionc:account-ready", { detail: { owner: userId } }));
  } catch (error) {
    if (token.generation === syncGeneration) throw error;
  } finally {
    if (operation) pendingSync.delete(operation);
    if (bootToken === token) bootToken = null;
  }
}

window.MotionCSupabase = {
  supabase, captureLocalState, clearLocalState, makeFreshState, applyLocalState,
  getSession, readCloudState, saveCloudState, activateUser, signOutAndClear
};

// Supabase delivers INITIAL_SESSION and cross-tab SIGNED_OUT/SIGNED_IN events.
// The callback only updates/cancels local state; asynchronous work is deferred.
supabase.auth.onAuthStateChange(observeAuthentication);
