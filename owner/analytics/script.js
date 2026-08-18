import { supabase } from "/shared/motionc-supabase.js";

const gate = document.querySelector("#gate");
const dashboard = document.querySelector("#dashboard");
const period = document.querySelector("#period");
const status = document.querySelector("#status");

function deny(title, detail, action = "Sign in") {
  gate.innerHTML = `<p class="eyebrow">Private owner page</p><h1>${title}</h1><p>${detail}</p><p><a class="return-link" href="/auth/?mode=signin&next=%2Fowner%2Fanalytics%2F">${action}</a></p>`;
}

function counts(rows, key, fallback = "Unknown") {
  const map = new Map();
  rows.forEach((row) => { const value = row[key] || fallback; map.set(value, (map.get(value) || 0) + 1); });
  return [...map.entries()].sort((a,b) => b[1] - a[1]);
}

function ranked(id, items, empty = "No visits yet") {
  document.querySelector(id).innerHTML = items.length
    ? items.slice(0, 7).map(([name,value]) => `<li><span>${escapeHtml(name)}</span><b>${value.toLocaleString()}</b></li>`).join("")
    : `<li><span>${empty}</span></li>`;
}

function escapeHtml(value) {
  const div = document.createElement("div"); div.textContent = value; return div.innerHTML;
}

async function fetchRows(days) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await supabase.from("site_analytics_events")
      .select("occurred_at,session_id,event_type,path,page_title,entry_path,referrer_host,is_registered,active_seconds")
      .gte("occurred_at", since).order("occurred_at", { ascending: true }).range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

async function render() {
  status.textContent = "Refreshing…";
  const days = Number(period.value);
  const rows = await fetchRows(days);
  const starts = rows.filter((r) => r.event_type === "session_start");
  const views = rows.filter((r) => r.event_type === "page_view");
  const articleViews = views.filter((r) => r.path.startsWith("/library/article/"));
  const areaViews = views.filter((r) => !r.path.startsWith("/library/article/"));
  const sessionIds = new Set(rows.map((r) => r.session_id));
  const registeredIds = new Set(rows.filter((r) => r.is_registered).map((r) => r.session_id));
  const activeSeconds = rows.reduce((sum,r) => sum + Number(r.active_seconds || 0), 0);
  document.querySelector("#visits").textContent = (starts.length || sessionIds.size).toLocaleString();
  document.querySelector("#visitors").textContent = Math.max(0, sessionIds.size - registeredIds.size).toLocaleString();
  document.querySelector("#registered").textContent = registeredIds.size.toLocaleString();
  document.querySelector("#views").textContent = views.length.toLocaleString();
  document.querySelector("#active").textContent = `${Math.round(activeSeconds / 60).toLocaleString()}m`;
  ranked("#pages", counts(areaViews, "path"));
  ranked("#articles", counts(articleViews, "page_title"), "No articles opened yet");
  ranked("#entries", counts(starts.length ? starts : views, "entry_path"));
  ranked("#sources", counts(starts.length ? starts : views, "referrer_host", "Direct / unknown"));

  const byDay = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toLocaleDateString("en-CA", { month:"short", day:"numeric" });
    byDay.set(d, 0);
  }
  (starts.length ? starts : views).forEach((r) => {
    const d = new Date(r.occurred_at).toLocaleDateString("en-CA", { month:"short", day:"numeric" });
    if (byDay.has(d)) byDay.set(d, byDay.get(d) + 1);
  });
  const max = Math.max(1, ...byDay.values());
  document.querySelector("#daily").innerHTML = [...byDay].map(([day,value]) => `<span class="bar" title="${value} visits"><b>${value}</b><i style="height:${Math.max(3,value/max*110)}px"></i><small>${day}</small></span>`).join("");
  status.textContent = `Updated ${new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}.`;
}

async function boot() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) { deny("Sign in required", "Use your MotionC account to open this page."); return; }
  if (data.user.app_metadata?.role !== "owner") { deny("Owner access only", "This signed-in account does not have owner permission.", "Return to site"); return; }
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;
  gate.hidden = true; dashboard.hidden = false;
  await render();
  period.addEventListener("change", () => render().catch((e) => { status.textContent = `Analytics could not refresh: ${e.message}`; }));
}

boot().catch((error) => deny("Analytics unavailable", error.message, "Return to site"));
