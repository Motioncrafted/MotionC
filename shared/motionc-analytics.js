import { PRODUCTION_ORIGINS, canonicalPath, navigationSource, searchTopic, referralHost } from './analytics-policy.js?v=20260922-phase1';

export const EXCLUDE_KEY = 'motionc-analytics-exclude-v1';
const BROWSER_KEY = 'motionc-analytics-browser-v2';
const SESSION_KEY = 'motionc-analytics-session-v2';
const SESSION_MS = 30 * 60 * 1000;
const BROWSER_MS = 90 * 24 * 60 * 60 * 1000;
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
let client, auth = null, authKnown = false, production = false, initialized = false;
let disabled = false, currentPath = null, visibleSince = null, interval = null;
let generation = 0, pending = 0, sessionStarted = null, pageAnnounced = false;
const controllers = new Set();
const diagnostics = new Set();
function diagnostic(code) {
  if (!diagnostics.has(code)) { diagnostics.add(code); console.warn(`MotionC analytics: ${code}`); }
}
function guard(fn) { return (...args) => { try { return fn(...args); } catch { diagnostic('unavailable'); return undefined; } }; }
export function getAnalyticsExclusion() {
  try { return { available: true, excluded: localStorage.getItem(EXCLUDE_KEY) === 'true' }; }
  catch { return { available: false, excluded: null }; }
}
function cancelPending() {
  generation++;
  controllers.forEach(controller => controller.abort());
  visibleSince = null;
  sessionStarted = null;
}
export function setAnalyticsExclusion(excluded) {
  try {
    localStorage.setItem(EXCLUDE_KEY, excluded ? 'true' : 'false');
    const state = getAnalyticsExclusion();
    if (!state.available || state.excluded !== excluded) throw new Error();
    resetSession(); cancelPending(); pageAnnounced = false;
    window.dispatchEvent(new Event('motionc:analytics-exclusion'));
    if (!excluded) resume();
    return state;
  } catch { cancelPending(); disabled = true; return { available: false, excluded: null }; }
}
function resetSession() { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* No application storage touched. */ } }
export function analyticsAllowed() {
  try {
    const state = getAnalyticsExclusion();
    return Boolean(!disabled && production && authKnown && state.available && !state.excluded &&
      auth?.user?.app_metadata?.role !== 'owner' && currentPath);
  } catch { return false; }
}
function read(storage, key) {
  const text = storage.getItem(key); // Storage exceptions propagate to the isolated guard.
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}
function deviceClass() {
  return matchMedia('(max-width: 640px)').matches ? 'phone' : matchMedia('(max-width: 1024px)').matches ? 'tablet' : 'desktop';
}
function context(touch = false) {
  if (!analyticsAllowed()) return null;
  try {
    const now = Date.now();
    let browser = read(localStorage, BROWSER_KEY);
    if (!browser || !uuid(browser.id) || !Number.isFinite(browser.created) ||
        browser.created > now || now - browser.created >= BROWSER_MS) {
      browser = { id: crypto.randomUUID(), created: now, recognized: false };
      localStorage.setItem(BROWSER_KEY, JSON.stringify(browser));
    }
    let session = read(sessionStorage, SESSION_KEY);
    const valid = session && uuid(session.id) && session.browser === browser.id &&
      Number.isFinite(session.lastActivity) && session.lastActivity <= now && now - session.lastActivity < SESSION_MS &&
      canonicalPath(session.entry) === session.entry && ['phone', 'tablet', 'desktop'].includes(session.device) &&
      ['first_time', 'returning'].includes(session.recognition);
    if (!valid) {
      if (!touch) return null;
      session = { id: crypto.randomUUID(), browser: browser.id, lastActivity: now,
        entry: currentPath, device: deviceClass(), recognition: browser.recognized === true ? 'returning' : 'first_time' };
      sessionStarted = null;
    }
    if (touch) session.lastActivity = now;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { browser, session };
  } catch { disabled = true; diagnostic('storage-unavailable'); return null; }
}
async function request(body, stamp = generation) {
  if (!analyticsAllowed() || stamp !== generation || pending >= 4) return false;
  const controller = new AbortController(); controllers.add(controller); pending++;
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch('/api/analytics', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(auth?.access_token ? { Authorization: `Bearer ${auth.access_token}` } : {}) },
      body: JSON.stringify(body), keepalive: true
    });
    const result = response.ok ? await response.json() : null;
    if (!result?.accepted) diagnostic('delivery-unavailable');
    return Boolean(result?.accepted && stamp === generation && analyticsAllowed());
  } catch { diagnostic('delivery-unavailable'); return false; }
  finally { clearTimeout(timeout); controllers.delete(controller); pending--; }
}
function eventPayload(type, ctx, seconds) {
  return { kind: 'event', event_type: type, visitor_id: ctx.browser.id, session_id: ctx.session.id,
    path: currentPath, entry_path: ctx.session.entry, device_class: ctx.session.device,
    browser_recognition: ctx.session.recognition, navigation_source: navigationSource(location.search),
    referrer_host: referralHost(document.referrer), active_seconds: seconds };
}
function accepted(ctx, stamp) {
  if (stamp !== generation || !analyticsAllowed()) return;
  try {
    const browser = read(localStorage, BROWSER_KEY);
    if (browser?.id === ctx.browser.id && !browser.recognized) {
      browser.recognized = true;
      localStorage.setItem(BROWSER_KEY, JSON.stringify(browser));
    }
  } catch { disabled = true; diagnostic('storage-unavailable'); }
}
function record(type, seconds = 0, touch = false) {
  const ctx = context(touch);
  if (!ctx) return;
  const stamp = generation;
  if (!ctx.session.started && sessionStarted !== ctx.session.id) {
    sessionStarted = ctx.session.id;
    void request(eventPayload('session_start', ctx, 0), stamp).then(ok => {
      if (ok) {
        accepted(ctx, stamp);
        try {
          const saved = read(sessionStorage, SESSION_KEY);
          if (stamp === generation && saved?.id === ctx.session.id) {
            saved.started = true; sessionStorage.setItem(SESSION_KEY, JSON.stringify(saved));
          }
        } catch { disabled = true; diagnostic('storage-unavailable'); }
      }
      else if (stamp === generation) sessionStarted = null;
    }).catch(() => diagnostic('delivery-unavailable'));
  }
  void request(eventPayload(type, ctx, seconds), stamp).then(ok => {
    if (ok) accepted(ctx, stamp);
  }).catch(() => diagnostic('delivery-unavailable'));
}
// All search writers use this gate; raw text never reaches fetch, storage or logs.
export function recordLibrarySearch(input, resultsCount) {
  try {
    if (!analyticsAllowed() || typeof input !== 'string' || !input.trim()) return;
    const count = Number.isFinite(resultsCount) ? Math.max(0, Math.min(32767, Math.trunc(resultsCount))) : 0;
    void request({ kind: 'search', topic: searchTopic(input), results_count: count }).catch(() => diagnostic('delivery-unavailable'));
  } catch { diagnostic('unavailable'); }
}
function heartbeat() {
  if (visibleSince === null) return;
  const now = Date.now(), seconds = Math.min(15, Math.floor((now - visibleSince) / 1000));
  visibleSince = document.visibilityState === 'visible' ? now : null;
  if (seconds >= 1) record('heartbeat', seconds);
}
function resume() {
  if (!analyticsAllowed()) return;
  record('page_view', 0, true);
  pageAnnounced = true;
  visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
}
function install() {
  if (interval !== null) return;
  interval = setInterval(guard(heartbeat), 15000);
  document.addEventListener('visibilitychange', guard(() => {
    if (document.visibilityState === 'hidden') heartbeat();
    else { context(true); visibleSince = Date.now(); }
  }));
  window.addEventListener('pagehide', guard(() => { heartbeat(); clearInterval(interval); interval = null; }));
  window.addEventListener('pageshow', guard(event => {
    if (event.persisted) { interval = setInterval(guard(heartbeat), 15000); resume(); }
  }));
  // Input presence only; never read keys, coordinates, targets, values or content.
  let lastTouch = 0;
  const activity = guard(() => {
    if (Date.now() - lastTouch < 1000) return;
    lastTouch = Date.now();
    const before = context(false);
    if (!before) { resume(); return; }
    context(true);
  });
  ['pointerdown', 'keydown', 'scroll'].forEach(type => window.addEventListener(type, activity, { passive: true, capture: type === 'scroll' }));
  window.addEventListener('motionc:analytics-pageview', guard(event => {
    const next = canonicalPath(event.detail?.path);
    if (!next) return;
    heartbeat(); currentPath = next; resume();
  }));
  window.addEventListener('storage', guard(event => {
    if (event.key === EXCLUDE_KEY || event.key === null) {
      cancelPending(); resetSession(); pageAnnounced = false;
      if (analyticsAllowed()) resume();
      window.dispatchEvent(new Event('motionc:analytics-exclusion'));
    }
  }));
}
async function refreshAuth(knownSession) {
  const stamp = ++generation;
  authKnown = false;
  try {
    // The shared bridge/auth callback already has a session. Never take an
    // additional network-backed auth lock for telemetry; the server validates
    // the JWT and checks the current user before every authenticated insert.
    let next = knownSession;
    if (next === undefined) {
      const { data, error } = await client.auth.getSession();
      if (error) return;
      next = data.session;
    }
    if (stamp !== generation) return;
    auth = next; authKnown = true;
    if (auth?.user?.app_metadata?.role === 'owner') { cancelPending(); resetSession(); pageAnnounced = false; return; }
    if (!pageAnnounced) resume();
    else visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
  } catch { diagnostic('auth-unavailable'); }
}
export async function startMotionCAnalytics(supabase, initialSession) {
  try {
    if (initialized) return;
    initialized = true; client = supabase;
    currentPath = canonicalPath(location.pathname);
    if (!client || !currentPath || !PRODUCTION_ORIGINS.includes(location.origin)) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch('/api/analytics', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
      const configuration = response.ok ? await response.json() : null;
      production = configuration?.enabled === true && configuration?.version === 2;
    } finally { clearTimeout(timeout); }
    if (!production) return;
    install();
    client.auth.onAuthStateChange((_event, nextSession) => {
      authKnown = false; cancelPending();
      setTimeout(() => { void refreshAuth(nextSession); }, 0);
    });
    await refreshAuth(initialSession);
  } catch { diagnostic('initialization-unavailable'); }
}
