// Public, bounded vocabulary. No input text is returned as a topic.
export const PRODUCTION_ORIGINS = ['https://www.motionc.me', 'https://motionc.me'];
export const PAGE_TITLES = Object.freeze({
  '/': 'MotionC', '/landing-page/': 'MotionC', '/daily/': 'Daily',
  '/dashboard/': 'Summary', '/walking/': 'Walking', '/compass/': 'Compass',
  '/engine-room/': 'Engine Room', '/library/': 'Library', '/drop-zone/': 'Drop Zone'
});
export const TOPICS = Object.freeze({
  walking: ['walking', 'walk', 'walks'], sleep: ['sleep'], hydration: ['hydration', 'water'],
  nutrition: ['nutrition', 'food'], compass: ['compass', 'lifestyle compass'],
  motionc: ['motionc', 'mcp'], 'mo-explainers': ['mo', 'mo explainers'],
  'mo-comix': ['mo comix'], habits: ['habits', 'habit'],
  'weekly-check-in': ['weekly check-in', 'weekly check in'],
  'drop-zone': ['drop zone'], 'lifestyle-24': ['lifestyle 24']
});
export function searchTopic(input) {
  if (typeof input !== 'string' || input.length > 100) return 'unclassified';
  const text = input.toLowerCase().trim().replace(/\s+/g, ' ');
  return Object.keys(TOPICS).find(key => TOPICS[key].includes(text)) || 'unclassified';
}
export function canonicalPath(input) {
  if (typeof input !== 'string' || !input.startsWith('/') || input.startsWith('//')) return null;
  const path = input.split(/[?#]/, 1)[0];
  const normalized = path.replace(/\/index\.html$/, '/').replace(/\/$/, '') + '/';
  if (Object.hasOwn(PAGE_TITLES, normalized)) return normalized;
  const article = /^\/library\/article\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(path);
  return article && article[1].length <= 160 ? `/library/article/${article[1]}` : null;
}
export function navigationSource(search) {
  try { return new URLSearchParams(search).get('from') === 'summary' ? 'summary' : null; }
  catch { return null; }
}
export function referralHost(value) {
  // Preserve only known public referral services; never arbitrary personal subdomains.
  const hosts = ['google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'facebook.com', 'instagram.com', 'youtube.com', 'reddit.com', 'linkedin.com', 't.co'];
  try {
    const host = new URL(value).hostname.toLowerCase();
    return hosts.find(known => host === known || host.endsWith('.' + known)) || null;
  } catch { return null; }
}
