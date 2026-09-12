(() => {
  const button = document.getElementById('waistMeasurementInfo');
  const tip = document.getElementById('waistMeasurementTip');
  let pinned = false;
  let timer;
  const isOpen = () => tip.matches(':popover-open');
  function position() {
    const r = button.getBoundingClientRect();
    const v = window.visualViewport;
    const left = v ? v.offsetLeft : 0;
    const top = v ? v.offsetTop : 0;
    const width = v ? v.width : innerWidth;
    const height = v ? v.height : innerHeight;
    tip.style.maxWidth = `${width - 24}px`;
    tip.style.maxHeight = `${height - 24}px`;
    const t = tip.getBoundingClientRect();
    tip.style.left = `${Math.max(left + 12, Math.min(r.left, left + width - t.width - 12))}px`;
    const y = r.bottom + 8 + t.height <= top + height - 12 ? r.bottom + 8 : r.top - t.height - 8;
    tip.style.top = `${Math.max(top + 12, y)}px`;
  }
  function show() {
    clearTimeout(timer);
    if (!isOpen()) tip.showPopover();
    button.setAttribute('aria-expanded', 'true');
    position();
  }
  function hide() {
    clearTimeout(timer);
    if (isOpen()) tip.hidePopover();
    pinned = false;
    button.setAttribute('aria-expanded', 'false');
  }
  button.addEventListener('click', () => {
    if (pinned && isOpen()) hide();
    else { pinned = true; show(); }
  });
  for (const element of [button, tip]) {
    element.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') show();
    });
    element.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse' && !pinned) timer = setTimeout(hide, 150);
    });
  }
  tip.addEventListener('toggle', () => {
    button.setAttribute('aria-expanded', String(isOpen()));
    if (!isOpen()) pinned = false;
  });
  document.addEventListener('pointerdown', event => {
    if (!button.contains(event.target) && !tip.contains(event.target)) hide();
  });
  document.addEventListener('focusin', event => {
    if (!button.contains(event.target) && !tip.contains(event.target)) hide();
  });
  document.addEventListener('scroll', () => { if (isOpen()) position(); }, true);
  window.addEventListener('resize', () => { if (isOpen()) position(); });
  window.visualViewport?.addEventListener('resize', () => { if (isOpen()) position(); });
})();
