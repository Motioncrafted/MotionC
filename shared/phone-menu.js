/* Presentation only: use existing routes and the shared, orientation-stable policy. */
(() => {
  if (document.documentElement.dataset.motioncPresentation !== 'phone') return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'motionc-phone-menu-button';
  button.setAttribute('aria-label', 'Open MotionC navigation');
  const logo = document.createElement('img');
  logo.src = '/images/nav/motionc-logo.png';
  logo.alt = '';
  button.append(logo);
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', 'motioncPhoneMenu');
  button.setAttribute('aria-expanded', 'false');
  const dialog = document.createElement('dialog');
  dialog.id = 'motioncPhoneMenu';
  dialog.className = 'motionc-phone-menu';
  dialog.setAttribute('aria-labelledby', 'motioncPhoneMenuTitle');
  const heading = document.createElement('h2');
  heading.id = 'motioncPhoneMenuTitle';
  heading.textContent = 'MotionC Menu';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'motionc-phone-menu-close';
  close.textContent = 'Close';
  close.addEventListener('click', () => dialog.close());
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Phone navigation');
  for (const [label, href] of [['DAILY','/daily/'],['SUMMARY','/dashboard/'],['COMPASS','/compass/'],['LIBRARY','/library/'],['DEMO','/demo/']]) {
    if (label === 'DEMO') nav.append(document.createElement('hr'));
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    if (location.pathname.startsWith(href)) a.setAttribute('aria-current', 'page');
    a.addEventListener('click', () => dialog.close());
    nav.append(a);
  }
  dialog.append(heading, close, nav);
  // Keep the original preference controller and its My Check-In links accessible.
  const preferences = document.getElementById('preferencesToggle') || document.getElementById('summaryPreferencesToggle');
  const preferencesPanel = preferences && document.getElementById(preferences.getAttribute('aria-controls'));
  if (preferences && preferencesPanel) {
    preferences.replaceChildren(document.createTextNode('Preferences'));
    preferences.classList.add('motionc-phone-preferences');
    // Close navigation before the existing preference click handler runs.
    preferences.addEventListener('click', () => dialog.close(), true);
    dialog.append(preferences);
    document.body.append(preferencesPanel);
    preferencesPanel.classList.add('motionc-phone-preferences-panel');
    new MutationObserver(() => {
      if (!preferencesPanel.hidden) preferencesPanel.querySelector('button, a, input')?.focus();
      else if (preferencesPanel.contains(document.activeElement) || document.activeElement === preferences) button.focus();
    }).observe(preferencesPanel, { attributes: true, attributeFilter: ['hidden'] });
  }
  button.addEventListener('click', () => {
    dialog.showModal();
    button.setAttribute('aria-expanded', 'true');
  });
  dialog.addEventListener('close', () => button.setAttribute('aria-expanded', 'false'));
  const outside = event => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  let beganOutside = false;
  dialog.addEventListener('pointerdown', event => { beganOutside = event.target === dialog && outside(event); });
  dialog.addEventListener('click', event => {
    if (beganOutside && event.target === dialog && outside(event)) dialog.close();
    beganOutside = false;
  });
  window.addEventListener('pageshow', event => { if (event.persisted && dialog.open) dialog.close(); });
  document.body.append(button, dialog);
  document.documentElement.dataset.motioncPhoneNav = 'ready';
})();
