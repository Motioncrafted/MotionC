import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
// Analytics loads independently: import, storage, network and initialization failures cannot block account sync.
function launchAnalytics(session) {
  void import("/shared/motionc-analytics.js?v=20260923-phase2").then(module => {
    window.MotionCAnalytics = { recordLibrarySearch: module.recordLibrarySearch, recordAction: module.recordAction };
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
// Presentation signal only; absence of account-ready does not mean signed out.
window.MotionCSignedOutReady = false;
let syncGeneration = 0;
let syncWorker = null;
let bootToken = null;
let reconcileTimer = null;
let localTransition = false;
const pendingSync = new Set();
const SyncLocal = window.MotionCSyncLocal;
let activeSync = null;
let requestedAgain = false;
let lastSyncResult = null;
let pageSyncTimer = null;
let statusCycle = null;
// Presentation deadline only: do not abort requests or change retained work.
const STATUS_WAIT_MS = 15000;
function checkingStatus(userId) {
  if (!userId || SyncLocal.owner() !== userId) return;
  if (statusCycle?.owner === userId && statusCycle.generation === syncGeneration) return;
  const cycle = { owner: userId, generation: syncGeneration, timer: null };
  statusCycle = cycle;
  publishStatus({ phase: 'checking', conflicts: SyncLocal.read(userId)?.conflicts || {} });
  cycle.timer = setTimeout(() => {
    if (statusCycle !== cycle || cycle.generation !== syncGeneration || SyncLocal.owner() !== userId) return;
    publishStatus({ phase: 'waiting', conflicts: SyncLocal.read(userId)?.conflicts || {} });
  }, STATUS_WAIT_MS);
}
function finishStatus(detail, operation) {
  assertSyncCurrent(operation);
  if (statusCycle?.timer) clearTimeout(statusCycle.timer);
  statusCycle = null;
  publishStatus(detail);
}

// Serialize account replacement with the UI-free Compass writer across tabs.
// Older browsers retain existing account behaviour; Compass itself fails closed without Web Locks.
const withMemberStateLock = action => navigator.locks?.request
  ? navigator.locks.request("motionc-member-state-v1", action)
  : Promise.reject(new Error("Safe synchronization requires browser Web Locks. Local work is retained."));
const withCloudSaveLock = action => navigator.locks?.request
  ? navigator.locks.request("motionc-cloud-save-v1", action)
  : Promise.reject(new Error("Safe synchronization requires browser Web Locks. Local work is retained."));

function cancelledSync() {
  const error = new Error("Account changed before synchronization completed.");
  error.name = "AbortError";
  error.code = "MOTIONC_SYNC_CANCELLED";
  return error;
}

function stopSynchronization() {
  window.MotionCSignedOutReady = false;
  syncGeneration++;
  if (pageSyncTimer !== null) clearTimeout(pageSyncTimer);
  pageSyncTimer = null;
  if (statusCycle?.timer) clearTimeout(statusCycle.timer);
  statusCycle = null;
  if (reconcileTimer !== null) clearTimeout(reconcileTimer);
  reconcileTimer = null;
  if (syncWorker) {
    clearInterval(syncWorker.timer);
    for (const [target,event,handler] of syncWorker.listeners) target.removeEventListener(event,handler);
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

function clearLocalStateUnlocked() {
  dataKeys().forEach((key) => SyncLocal.rawRemove(key));
}

export async function clearLocalState(expectedOwner = localStorage.getItem(ACTIVE_USER_KEY)) {
  window.dispatchEvent(new Event("motionc:account-changing"));
  await withMemberStateLock(() => {
    if (localStorage.getItem(ACTIVE_USER_KEY) !== expectedOwner) return;
    clearLocalStateUnlocked();
    localStorage.removeItem(ACTIVE_USER_KEY);
    // Called after a successful final sync, or an explicitly confirmed account deletion.
    for(const key of Object.keys(localStorage))if(key.startsWith(SyncLocal.key(expectedOwner,'')))SyncLocal.rawRemove(key);
  });
}

export function makeFreshState() {
  return {
    schemaVersion: 1,
    storage: {
      "motionc-daily-prototype-v1": JSON.stringify({ entries: {}, weeks: {}, profile: {}, dailyGauges: {} })
    }
  };
}

function applyLocalStateUnlocked(state, userId) {
  window.MotionCAccountReady = null;
  window.dispatchEvent(new Event("motionc:account-changing"));
  clearLocalStateUnlocked();
  Object.entries(state?.storage || {}).forEach(([key, value]) => {
    if (key.startsWith(DATA_PREFIX) && !key.startsWith(AUTH_PREFIX) && !key.startsWith("motionc-analytics-") && typeof value === "string") {
      SyncLocal.rawSet(key, value);
    }
  });
  localStorage.setItem(ACTIVE_USER_KEY, userId);
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
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || {state: makeFreshState(), revision: "-1"};
}

function publishStatus(detail) {
  window.dispatchEvent(new CustomEvent('motionc:sync-status',{detail}));
}

export async function saveCloudState(userId) {
  checkingStatus(userId);
  if (activeSync) {
    requestedAgain = true;
    await activeSync;
    if (authenticatedUserId !== userId) throw cancelledSync();
    return captureLocalState();
  }
  const operation=beginSyncOperation(userId);
  let completedResult;
  activeSync=(async()=>{
    return withCloudSaveLock(async()=>{
      await verifySyncSession(operation);
      // The durable intent journal also covers writers operating while the network is in flight.
      const result=await window.MotionCSyncEngine.synchronize({
        id:userId,local:SyncLocal,assertCurrent:()=>assertSyncCurrent(operation),
        readCloud:()=>readCloudState(userId,{signal:operation.controller.signal}),
        writeCloud:async(revision,state)=>{
          await verifySyncSession(operation);
          const {data,error}=await supabase.rpc('motionc_commit_state',{
            expected_revision:String(revision),next_state:state
          }).abortSignal(operation.controller.signal);
          if(error)throw error;
          return data;
        }
      });
      assertSyncCurrent(operation);
      lastSyncResult=result;
      SyncLocal.enable(userId);
      SyncLocal.acknowledgeReviews(result.cloud.state);
      const newlyReady=window.MotionCAccountReady?.owner!==userId;
      window.MotionCAccountReady={owner:userId};
      const changed=!window.MotionCSyncCore.equal(window.MotionCSyncCore.split(syncWorker?.lastView),window.MotionCSyncCore.split(result.view));
      if(syncWorker)syncWorker.lastView=result.view;
      completedResult=result;
      if(changed)window.dispatchEvent(new CustomEvent('motionc:cloud-restored',{detail:{owner:userId}}));
      if(newlyReady)window.dispatchEvent(new CustomEvent('motionc:account-ready',{detail:{owner:userId}}));
      return result.view;
    });
  })();
  try{return await activeSync;}
  catch(error){
    if(error.name!=='AbortError' && authenticatedUserId===userId && SyncLocal.owner()===userId){
      if (operation.generation === syncGeneration) {
        SyncLocal.enable(userId);
        finishStatus({phase:'waiting',error:true,conflicts:SyncLocal.read(userId)?.conflicts||{}},operation);
      }
    }
    throw error;
  }finally{
    activeSync=null;pendingSync.delete(operation);
    if (operation.generation === syncGeneration) {
      if(requestedAgain){requestedAgain=false;setTimeout(()=>void syncNow(),0);}
      else if(completedResult && pageSyncTimer === null && !completedResult.pending) finishStatus(completedResult,operation);
    }
  }
}

export async function syncNow() {
  const id=authenticatedUserId;
  if(!id||SyncLocal.owner()!==id||localTransition)return;
  try{await saveCloudState(id);}catch(error){if(error.name!=='AbortError')console.warn('MotionC sync unavailable; local work retained.');}
}

export async function activateUser(userId, _state) {
  // Re-signing into the same account must not discard local pending work.
  if(SyncLocal.owner()!==userId){
    const oldOwner=SyncLocal.owner();
    if(oldOwner)SyncLocal.rawSet(SyncLocal.key(oldOwner,'suspended'),JSON.stringify(captureLocalState()));
    const operation=beginSyncOperation(userId);
    try{
      const cloud=await readCloudState(userId);
      await verifySyncSession(operation,false);
      const suspended=SyncLocal.rawGet(SyncLocal.key(userId,'suspended'));
      const restored=suspended?JSON.parse(suspended):cloud.state;
      await withMemberStateLock(()=>{
        assertSyncCurrent(operation,false);
        clearLocalStateUnlocked();SyncLocal.apply(restored);localStorage.setItem(ACTIVE_USER_KEY,userId);
        if(!suspended)SyncLocal.checkpoint(userId,{version:1,base:cloud.state,revision:String(cloud.revision),view:cloud.state,conflicts:{},covered:[]});
      });
    }finally{pendingSync.delete(operation);}
  }
  await saveCloudState(userId);
  SyncLocal.rawRemove(SyncLocal.key(userId,'suspended'));
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
      if(Object.keys(lastSyncResult?.conflicts||{}).length||SyncLocal.operations(userId).length||SyncLocal.reviews().some(SyncLocal.pendingReview)){
        if(!statusCycle)publishStatus(lastSyncResult||{pending:true});
        throw new Error('Local work needs synchronization or review before sign-out.');
      }
    }
    const current = await getSession();
    if ((current?.user?.id || null) !== userId || authenticatedUserId !== userId) throw cancelledSync();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    const after = await getSession();
    // A different tab may already have signed in again: never clear that account.
    if (!after && authenticatedUserId === null &&
        (!localStorage.getItem(ACTIVE_USER_KEY) || localStorage.getItem(ACTIVE_USER_KEY) === userId)) {
      await clearLocalState(userId);
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
      location.assign("/");
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
  checkingStatus(SyncLocal.owner());
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
      const suspendedOwner=SyncLocal.owner();
      if(suspendedOwner)SyncLocal.rawSet(SyncLocal.key(suspendedOwner,'suspended'),JSON.stringify(captureLocalState()));
      await withMemberStateLock(() => {
        if (authenticatedUserId !== null) throw cancelledSync();
        clearLocalStateUnlocked();
        localStorage.removeItem(ACTIVE_USER_KEY);
      });
      document.querySelector(".motionc-preferences-signout")?.remove();
      if (hadPersonalState) { location.reload(); return; }
      accountBadge("Local mode · Sign in");
      window.MotionCSignedOutReady = true;
      window.dispatchEvent(new Event("motionc:signed-out-ready"));
      return;
    }

    const userId = session.user.id;
    operation = beginSyncOperation(userId);
    if (localStorage.getItem(ACTIVE_USER_KEY) !== userId) {
      await activateUser(userId);
      location.reload();return;
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
    const worker={userId,generation:syncGeneration,listeners:[],lastView:null};
    syncWorker=worker;
    const on=(target,event,fn)=>{target.addEventListener(event,fn);worker.listeners.push([target,event,fn]);};
    const request=()=>{
      checkingStatus(userId);
      if(pageSyncTimer !== null)clearTimeout(pageSyncTimer);
      pageSyncTimer=setTimeout(()=>{pageSyncTimer=null;void syncNow();},120);
    };
    on(window,'pageshow',request);on(window,'online',request);
    on(document,'visibilitychange',()=>{if(document.visibilityState==='visible')request();});
    on(window,'motionc:local-change',request);
    on(window,'storage',e=>{if((e.key?.startsWith('MotionCSync.v1:')&&(/:op:|:checkpoint$/.test(e.key)))||e.key?.startsWith('motionc-'))request();});
    worker.timer=setInterval(()=>{if(!document.hidden)void syncNow();},30000);
    await saveCloudState(userId);
    assertSyncCurrent(operation);
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
  supabase, captureLocalState, clearLocalState, makeFreshState,
  getSession, readCloudState, saveCloudState, activateUser, signOutAndClear, syncNow
};

// Supabase delivers INITIAL_SESSION and cross-tab SIGNED_OUT/SIGNED_IN events.
// The callback only updates/cancels local state; asynchronous work is deferred.
supabase.auth.onAuthStateChange(observeAuthentication);
