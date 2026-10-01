/* Presentation policy only. Load before paint; never reclassify on resize.
   Phase 1 consumer: Library. No authentication, user data or calculations. */
(() => {
  'use strict';
  // Deliberately outside the synchronized "motionc-" localStorage namespace.
  const overrideKey = 'MotionC.presentationOverride.v1';
  const valid = value => value === 'phone' || value === 'full';
  const requested = new URLSearchParams(location.search).get('presentation');
  let override = null;
  try {
    if (requested === 'auto') localStorage.removeItem(overrideKey);
    else if (valid(requested)) localStorage.setItem(overrideKey, requested);
    const saved = localStorage.getItem(overrideKey);
    if (valid(saved)) override = saved;
  } catch { /* Classification still works when browser storage is unavailable. */ }
  if (valid(requested)) override = requested;
  if (requested === 'auto') override = null;

  const ua = navigator.userAgent || '';
  const iPad = /iPad/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const shortSide = Math.min(screen.width, screen.height);
  const compactScreen = shortSide > 0 && shortSide <= 600;
  const mobileSignal = navigator.userAgentData?.mobile === true ||
    /iPhone|iPod|Android.*Mobile/i.test(ua);
  const compactTouch = navigator.maxTouchPoints > 0 &&
    matchMedia('(pointer: coarse)').matches && matchMedia('(hover: none)').matches;
  const phone = !iPad && compactScreen && (mobileSignal || compactTouch);
  document.documentElement.dataset.motioncPresentation = override || (phone ? 'phone' : 'full');
})();
