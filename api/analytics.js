import { PRODUCTION_ORIGINS, PAGE_TITLES, TOPICS, canonicalPath, referralHost } from '../shared/analytics-policy.js';
import { FALLBACK_ARTICLES } from '../shared/analytics-articles.js';

const DATABASE = 'https://fzduvafeshrrouaejots.supabase.co';
const KEY = 'sb_publishable_Kg00R81ExPx9Z1-Wcd-Ffg_mQaXHRrI';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const articleTitles = new Map();
async function titleFor(path, headers) {
  if (Object.hasOwn(PAGE_TITLES, path)) return PAGE_TITLES[path];
  if (Object.hasOwn(FALLBACK_ARTICLES, path)) return FALLBACK_ARTICLES[path];
  const cached = articleTitles.get(path);
  if (cached && cached.until > Date.now()) return cached.title;
  const slug = path.slice('/library/article/'.length);
  const response = await fetch(`${DATABASE}/rest/v1/library_articles?select=title&slug=eq.${encodeURIComponent(slug)}&status=eq.published&published_at=lte.${encodeURIComponent(new Date().toISOString())}&limit=1`, {
    headers, signal: AbortSignal.timeout(2500)
  });
  if (!response.ok) return null;
  const rows = await response.json();
  const title = typeof rows[0]?.title === 'string' ? rows[0].title.slice(0, 200) : null;
  if (title) {
    if (articleTitles.size >= 300) articleTitles.clear();
    articleTitles.set(path, { title, until: Date.now() + 60000 });
  }
  return title;
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Vary', 'Origin');
  const origin = `https://${req.headers.host || ''}`;
  // Vercel runtime environment is server-provided, not supplied by browser payload.
  const enabled = process.env.VERCEL_ENV === 'production' && PRODUCTION_ORIGINS.includes(origin);
  if (req.method === 'GET') return res.status(200).json({ enabled, version: 2 });
  if (req.method !== 'POST') return res.status(405).json({ accepted: false });
  if (!enabled || req.headers.origin !== origin || req.headers['sec-fetch-site'] !== 'same-origin')
    return res.status(403).json({ accepted: false });
  try {
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return res.status(400).json({ accepted: false });
    if (Number(req.headers['content-length'] || 0) > 4096) return res.status(413).json({ accepted: false });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || Array.isArray(body) || JSON.stringify(body).length > 4096) return res.status(400).json({ accepted: false });
    const headers = { apikey: KEY, 'Content-Type': 'application/json', Origin: origin, 'X-MotionC-Collection': 'phase1-v2' };
    let registered = false;
    if (req.headers.authorization) {
      if (!/^Bearer [A-Za-z0-9_.-]+$/.test(req.headers.authorization)) return res.status(401).json({ accepted: false });
      headers.Authorization = req.headers.authorization;
      const response = await fetch(`${DATABASE}/auth/v1/user`, { headers, signal: AbortSignal.timeout(2500) });
      if (!response.ok) return res.status(401).json({ accepted: false });
      const user = await response.json();
      if (!user.id || user.app_metadata?.role === 'owner') return res.status(403).json({ accepted: false });
      registered = !user.is_anonymous;
    }
    let table, row;
    if (body.kind === 'search') {
      if (body.topic !== 'unclassified' && !Object.hasOwn(TOPICS, body.topic)) return res.status(400).json({ accepted: false });
      if (!Number.isInteger(body.results_count) || body.results_count < 0 || body.results_count > 32767) return res.status(400).json({ accepted: false });
      table = 'site_search_events';
      row = { area: 'library', query: body.topic, results_count: body.results_count, collection_version: 2 };
    } else if (body.kind === 'event') {
      const path = canonicalPath(body.path), entry = canonicalPath(body.entry_path);
      if (!path || !entry || !uuid(body.visitor_id) || !uuid(body.session_id) ||
          !['session_start', 'page_view', 'heartbeat'].includes(body.event_type) ||
          !['phone', 'tablet', 'desktop'].includes(body.device_class) ||
          !['first_time', 'returning'].includes(body.browser_recognition) ||
          !Number.isInteger(body.active_seconds) || body.active_seconds < 0 || body.active_seconds > 15 ||
          (body.event_type !== 'heartbeat' && body.active_seconds !== 0)) return res.status(400).json({ accepted: false });
      const [title, entryTitle] = await Promise.all([titleFor(path, headers), titleFor(entry, headers)]);
      if (!title || !entryTitle) return res.status(400).json({ accepted: false });
      table = 'site_analytics_events';
      row = { visitor_id: body.visitor_id, session_id: body.session_id, event_type: body.event_type,
        path, entry_path: entry, page_title: title, active_seconds: body.active_seconds,
        device_class: body.device_class, is_registered: registered,
        browser_recognition: body.browser_recognition, navigation_source: body.navigation_source === 'summary' ? 'summary' : null,
        referrer_host: referralHost('https://' + body.referrer_host), collection_version: 2 };
    } else return res.status(400).json({ accepted: false });
    // Public key + original user JWT preserve database RLS. No service key/bypass.
    const response = await fetch(`${DATABASE}/rest/v1/${table}`, {
      method: 'POST', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(row), signal: AbortSignal.timeout(2500)
    });
    let accepted = response.ok;
    if (!accepted && response.status === 409 && row.event_type === 'session_start') {
      const error = await response.json();
      // The partial unique index is the authority, including concurrent inserts
      // and retries after a committed write whose acknowledgement was lost.
      // Other uniqueness/RLS failures must never be acknowledged as successful.
      accepted = error.code === '23505' &&
        error.message === 'duplicate key value violates unique constraint "site_analytics_v2_session_start_unique"';
    }
    return res.status(accepted ? 200 : 503).json({ accepted });
  } catch { return res.status(503).json({ accepted: false }); }
}
