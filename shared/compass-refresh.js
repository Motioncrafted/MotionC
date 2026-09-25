/* Current-day persistence only. The production engine and history format remain authoritative. */
(() => {
  'use strict';
  const SOURCE = 'motionc-daily-prototype-v1', ACTIVE = 'motionc-auth-active-user';
  // Account restore/clear uses this same origin-wide lock in motionc-supabase.js.
  const LOCK = 'motionc-member-state-v1';
  let generation = 0, pending = null, rerun = false;
  const owner = () => {
    const active = localStorage.getItem(ACTIVE);
    return active && active === window.MotionCAccountReady?.owner ? active : null;
  };
  const empty = error => ({ previous: null, current: null, history: null, saved: false, changed: false, error });

  // The existing Daily import, shared with Summary rather than a second lifestyle model.
  // Only source-save code calls this; a Compass refresh never mutates member evidence.
  function reconcileLifestyle(state, summary, week, now = new Date()) {
    if (!Number.isFinite(Number(summary?.score))) return false;
    state.weeks = state.weeks || {};
    const summaryWeek = summary.week || week, existing = state.weeks[summaryWeek];
    if (existing?.summaryUpdatedAt === summary.updatedAt && existing?.scoreLogicVersion === 4) return false;
    const maximum = Number(summary.maximumScore) > 0 ? Number(summary.maximumScore) : 24;
    const values = Object.fromEntries(Object.entries(summary.values || {}).map(([key, value]) => {
      const numeric = Number(value);
      return [key, Number.isFinite(numeric) ? Math.max(1, Math.min(3, Math.round(numeric * 3))) : 1];
    }));
    state.weeks[summaryWeek] = {
      ...existing, values: Object.keys(values).length ? values : existing?.values || {},
      score: Math.min(10, Math.round(Number(summary.score) / maximum * 10 * 2) / 2),
      assessed: true, summaryScore: Number(summary.score), summaryUpdatedAt: summary.updatedAt,
      scoreLogicVersion: 4, lifestyleScale: 3, updatedAt: now.toISOString()
    };
    return true;
  }

  function evaluate(expectedGeneration, allowWrite) {
    const C = window.CompassV2, H = window.CompassV2History;
    if (!C || !H) throw new Error('Compass dependencies unavailable');
    const currentOwner = owner(), now = new Date();
    const raw = currentOwner ? localStorage.getItem(SOURCE) : null;
    const state = raw ? JSON.parse(raw) : {};
    if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('Invalid Compass source');
    const result = C.calculate(state, { asOf: C.dayKey(now) });
    let presentation = empty('account-not-ready');
    if (currentOwner && expectedGeneration === generation && owner() === currentOwner) {
      if (raw !== localStorage.getItem(SOURCE)) {
        rerun = true;
        presentation = empty('save-failed');
      } else if (!allowWrite) {
        // Never substitute an unsafe localStorage lease for a cross-tab mutex.
        presentation = empty('save-failed');
      } else {
        presentation = H.observe({ storage: localStorage, owner: currentOwner, ready: true, result, state, now });
      }
    }
    return { owner: currentOwner, state, result, presentation };
  }

  // All failures resolve, never reject into a member save handler. No timers/backfill.
  function refresh() {
    if (pending) { rerun = true; return pending; }
    const expectedGeneration = generation;
    pending = Promise.resolve().then(async () => {
      try {
        const locks = window.navigator?.locks;
        return locks?.request
          ? await locks.request(LOCK, () => evaluate(expectedGeneration, true))
          : evaluate(expectedGeneration, false);
      } catch {
        console.warn('MotionC Compass refresh unavailable; source save is unchanged.');
        return null;
      }
    }).finally(() => {
      pending = null;
      if (rerun) { rerun = false; void refresh(); }
    });
    return pending;
  }
  window.MotionCCompassRefresh = Object.freeze({ refresh, reconcileLifestyle });
  window.addEventListener('motionc:account-changing', () => { generation++; });
  for (const event of ['motionc:account-ready', 'motionc:cloud-restored']) window.addEventListener(event, () => { void refresh(); });
  window.addEventListener('storage', event => {
    if (event.key === SOURCE) void refresh();
    if (event.key === ACTIVE || event.key === null) generation++;
  });
})();
