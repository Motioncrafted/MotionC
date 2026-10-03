/* Root presentation only. Authentication and member initialization remain in the existing bridge. */
(() => {
  'use strict';
  if (!['/', '/index.html'].includes(location.pathname) ||
      document.documentElement.dataset.motioncPresentation !== 'phone') return;

  const message = document.getElementById('phoneEntryMessage');
  const retry = document.getElementById('phoneEntryRetry');
  let generation = 0;
  let leaving = false;

  async function enter() {
    const attempt = ++generation;
    leaving = false;
    retry.hidden = true;
    message.textContent = 'Opening MotionC…';
    let timer;
    try {
      const session = await Promise.race([
        import('/shared/motionc-supabase.js?v=20261002-sync1').then(bridge => bridge.getSession()),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Entry timed out')), 12000);
        })
      ]);
      if (attempt !== generation || leaving) return;
      // A failed or malformed response is not evidence that the user signed out.
      if (session !== null && !session?.user?.id) throw new Error('Session unavailable');
      leaving = true;
      location.replace(session?.user?.id
        ? '/dashboard/'
        : '/auth/?mode=signin&next=%2Fdashboard%2F');
    } catch {
      if (attempt !== generation || leaving) return;
      message.textContent = 'MotionC could not check your sign-in. Please try again.';
      retry.hidden = false;
    } finally {
      clearTimeout(timer);
    }
  }

  retry.addEventListener('click', enter);
  window.addEventListener('pagehide', () => { generation++; leaving = true; });
  window.addEventListener('pageshow', event => { if (event.persisted) void enter(); });
  void enter();
})();
