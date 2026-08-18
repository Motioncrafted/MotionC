const VISITOR_KEY = "motionc-analytics-visitor-v1";
const SESSION_KEY = "motionc-analytics-session-v1";
const ENTRY_KEY = "motionc-analytics-entry-v1";
const HEARTBEAT_SECONDS = 15;

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
}

function getOrCreate(storage, key) {
  let value = storage.getItem(key);
  if (!validUuid(value)) {
    value = crypto.randomUUID();
    storage.setItem(key, value);
  }
  return value;
}

function referrerHost() {
  if (!document.referrer) return null;
  try {
    const host = new URL(document.referrer).hostname.toLowerCase();
    return host === location.hostname.toLowerCase() ? null : host.slice(0, 255);
  } catch { return null; }
}

function deviceClass() {
  if (matchMedia("(max-width: 640px)").matches) return "phone";
  if (matchMedia("(max-width: 1024px)").matches) return "tablet";
  return "desktop";
}

function cleanPath() {
  return `${location.pathname}${location.search}`.slice(0, 500);
}

export function startMotionCAnalytics(supabase, { isRegistered = false } = {}) {
  if (!supabase || location.pathname.startsWith("/owner/")) return;

  const visitorId = getOrCreate(localStorage, VISITOR_KEY);
  const newSession = !validUuid(sessionStorage.getItem(SESSION_KEY));
  const sessionId = getOrCreate(sessionStorage, SESSION_KEY);
  const entryPath = sessionStorage.getItem(ENTRY_KEY) || cleanPath();
  sessionStorage.setItem(ENTRY_KEY, entryPath);

  const params = new URLSearchParams(location.search);
  const base = {
    visitor_id: visitorId,
    session_id: sessionId,
    path: cleanPath(),
    page_title: document.title.slice(0, 200),
    entry_path: entryPath.slice(0, 500),
    referrer_host: referrerHost(),
    is_registered: Boolean(isRegistered),
    device_class: deviceClass(),
    utm_source: params.get("utm_source")?.slice(0, 100) || null,
    utm_medium: params.get("utm_medium")?.slice(0, 100) || null,
    utm_campaign: params.get("utm_campaign")?.slice(0, 150) || null
  };

  const record = (eventType, activeSeconds = 0, overrides = {}) => {
    supabase.from("site_analytics_events").insert({
      ...base,
      ...overrides,
      event_type: eventType,
      active_seconds: activeSeconds
    }).then(({ error }) => {
      if (error) console.warn("MotionC analytics unavailable", error.message);
    });
  };

  if (newSession) record("session_start");
  record("page_view");
  window.addEventListener("motionc:analytics-pageview", (event) => {
    const detail = event.detail || {};
    if (typeof detail.path !== "string" || !detail.path.startsWith("/")) return;
    record("page_view", 0, {
      path: detail.path.slice(0, 500),
      page_title: String(detail.title || document.title).slice(0, 200)
    });
  });

  let visibleSince = document.visibilityState === "visible" ? Date.now() : null;
  const heartbeat = () => {
    if (visibleSince === null || document.visibilityState !== "visible") return;
    const elapsed = Math.min(HEARTBEAT_SECONDS, Math.floor((Date.now() - visibleSince) / 1000));
    if (elapsed >= 5) record("heartbeat", elapsed);
    visibleSince = Date.now();
  };
  const timer = setInterval(heartbeat, HEARTBEAT_SECONDS * 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      heartbeat();
      visibleSince = null;
    } else {
      visibleSince = Date.now();
    }
  });
  window.addEventListener("pagehide", () => {
    heartbeat();
    clearInterval(timer);
  });
}
