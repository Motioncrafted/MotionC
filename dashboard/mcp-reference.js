/* Phone-only reference. Read the rendered authoritative result; never score it. */
(() => {
  'use strict';
  if (document.documentElement.dataset.motioncPresentation !== 'phone') return;
  const gauge = document.getElementById('mcp-ring');
  const value = document.getElementById('display-mcp-ring');
  const zone = document.getElementById('mcp-zone-status');
  if (!gauge || !value || !zone) return;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'mcp-reference-trigger';
  trigger.setAttribute('aria-label', 'MCP zones quick reference');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', 'mcp-reference');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = '<span aria-hidden="true">ⓘ</span>';
  // A sibling keeps the button outside the gauge's role="img" accessibility tree.
  gauge.after(trigger);

  const dialog = document.createElement('dialog');
  dialog.id = 'mcp-reference';
  dialog.setAttribute('aria-labelledby', 'mcp-reference-title');
  dialog.innerHTML = `
    <button type="button" class="mcp-reference-close" aria-label="Close MCP zones">×</button>
    <h2 id="mcp-reference-title">MCP ZONES</h2>
    <dl class="mcp-reference-zones">
      <div><dt><i class="mcp-reference-core" aria-hidden="true"></i>Core Zone</dt><dd>&lt;25</dd></div>
      <div><dt><i class="mcp-reference-healthy" aria-hidden="true"></i>Healthy</dt><dd>25–35</dd></div>
      <div><dt><i class="mcp-reference-elevated" aria-hidden="true"></i>Elevated</dt><dd>35–43</dd></div>
      <div><dt><i class="mcp-reference-watch" aria-hidden="true"></i>Watch Zone</dt><dd>&gt;43</dd></div>
    </dl>
    <p class="mcp-reference-current" aria-live="polite"></p>
    <a class="mcp-reference-link" href="/library/?article=understanding-mcp-score&amp;from=summary">Read the MCP Library article <span aria-hidden="true">→</span></a>`;
  document.body.append(dialog);
  const current = dialog.querySelector('.mcp-reference-current');
  const refresh = () => {
    current.textContent = gauge.classList.contains('is-assessed')
      ? `Your MCP: ${value.textContent.trim()} · ${zone.textContent.trim()}`
      : 'Your MCP: Not assessed';
  };
  new MutationObserver(() => { if (dialog.open) refresh(); })
    .observe(gauge, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });

  let scrollStyles = null;
  let returnPosition;
  const unlock = () => {
    if (!scrollStyles) return;
    for (const [element, value, priority] of scrollStyles) {
      if (value) element.style.setProperty('overflow', value, priority);
      else element.style.removeProperty('overflow');
    }
    scrollStyles = null;
  };
  trigger.addEventListener('click', () => {
    if (dialog.open) return;
    // Reuse the Library's handwriting face, loaded only for this phone reference.
    if (!document.getElementById('mcp-reference-font')) {
      const font = document.createElement('link');
      font.id = 'mcp-reference-font';
      font.rel = 'stylesheet';
      font.href = 'https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap';
      document.head.append(font);
    }
    refresh();
    returnPosition = { x: scrollX, y: scrollY };
    scrollStyles = [document.documentElement, document.body].map(element =>
      [element, element.style.getPropertyValue('overflow'), element.style.getPropertyPriority('overflow')]);
    for (const [element] of scrollStyles) element.style.setProperty('overflow', 'hidden', 'important');
    dialog.showModal();
    trigger.setAttribute('aria-expanded', 'true');
  });
  dialog.querySelector('.mcp-reference-close').addEventListener('click', () => dialog.close());
  // Same native-dialog/backdrop interaction as the Phone menu.
  const outside = event => {
    const b = dialog.getBoundingClientRect();
    return event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom;
  };
  let beganOutside = false;
  dialog.addEventListener('pointerdown', event => { beganOutside = event.target === dialog && outside(event); });
  dialog.addEventListener('click', event => {
    if (beganOutside && event.target === dialog && outside(event)) dialog.close();
    beganOutside = false;
  });
  dialog.addEventListener('close', () => {
    unlock();
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus({ preventScroll: true });
    if (returnPosition) window.scrollTo({ left: returnPosition.x, top: returnPosition.y, behavior: 'instant' });
  });
  dialog.querySelector('a').addEventListener('click', () => dialog.close());
  window.addEventListener('pageshow', event => {
    if (event.persisted) { if (dialog.open) dialog.close(); unlock(); }
  });
})();
