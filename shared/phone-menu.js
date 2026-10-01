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
  const header = document.createElement('div');
  header.className = 'motionc-phone-menu-header';
  // Quiet vector silhouette following Mo's tuft, round body and small feet.
  const mo = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  mo.setAttribute('viewBox', '0 0 80 88');
  mo.setAttribute('aria-hidden', 'true');
  mo.setAttribute('focusable', 'false');
  mo.classList.add('motionc-menu-mo');
  const outline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  outline.setAttribute('d', 'M18 42C18 27 28 12 47 5Q60 0 56 9L49 16Q66 9 62 19L53 26C62 32 67 41 66 52Q77 57 76 65L68 64Q70 72 62 76Q73 80 67 85L48 85Q41 84 43 79L32 79Q35 86 26 87L12 86Q6 83 15 78Q6 74 12 64Q2 60 6 51Q9 46 18 42Z');
  mo.append(outline);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'motionc-phone-menu-close';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close MotionC menu');
  close.addEventListener('click', () => dialog.close());
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Phone navigation');
  for (const [label, href, description] of [['DAILY','/daily/','Record today'],['SUMMARY','/dashboard/','See your progress'],['COMPASS','/compass/','See your direction'],['LIBRARY','/library/','Explore & understand'],['DEMO','/demo/','See MotionC in action']]) {
    if (label === 'DEMO') nav.append(document.createElement('hr'));
    const a = document.createElement('a');
    a.href = href;
    const name = document.createElement('span');
    name.className = 'motionc-menu-destination';
    name.textContent = label;
    const detail = document.createElement('small');
    detail.textContent = description;
    a.append(name, detail);
    if (label === 'DEMO') a.className = 'motionc-menu-demo';
    if (label === 'DEMO') {
      // A fixed entry context, never an account identifier or arbitrary return URL.
      const setDemoEntry = signedIn => { a.href = signedIn ? '/demo/?entry=phone-menu-member' : '/demo/'; };
      setDemoEntry(Boolean(window.MotionCAccountReady?.owner));
      window.addEventListener('motionc:account-ready', () => setDemoEntry(Boolean(window.MotionCAccountReady?.owner)));
      window.addEventListener('motionc:account-changing', () => setDemoEntry(false));
      a.addEventListener('click', async event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        let signedIn = Boolean(window.MotionCAccountReady?.owner);
        try {
          if (window.MotionCSupabase?.getSession) signedIn = Boolean((await window.MotionCSupabase.getSession())?.user?.id);
        } catch { signedIn = false; }
        setDemoEntry(signedIn);
        location.assign(a.href);
      });
    }
    if (location.pathname.startsWith(href)) a.setAttribute('aria-current', 'page');
    a.addEventListener('click', () => dialog.close());
    nav.append(a);
  }
  header.append(mo, heading, close);
  const content = document.createElement('div');
  content.className = 'motionc-phone-menu-content';
  content.append(nav);
  dialog.append(header, content);
  // Keep the original preference controller and its My Check-In links accessible.
  const preferences = document.getElementById('preferencesToggle') || document.getElementById('summaryPreferencesToggle');
  const preferencesPanel = preferences && document.getElementById(preferences.getAttribute('aria-controls'));
  if (preferences && preferencesPanel) {
    preferences.replaceChildren(document.createTextNode('Preferences'));
    preferences.classList.add('motionc-phone-preferences');
    // Close navigation before the existing preference click handler runs.
    preferences.addEventListener('click', () => dialog.close(), true);
    content.append(preferences);
    document.body.append(preferencesPanel);
    preferencesPanel.classList.add('motionc-phone-preferences-panel');
    new MutationObserver(() => {
      if (!preferencesPanel.hidden) preferencesPanel.querySelector('button, a, input')?.focus();
      else if (preferencesPanel.contains(document.activeElement) || document.activeElement === preferences) button.focus();
    }).observe(preferencesPanel, { attributes: true, attributeFilter: ['hidden'] });
  }
  const signature = document.createElement('div');
  signature.className = 'motionc-menu-signature';
  const mark = document.createElement('span');
  mark.className = 'motionc-menu-mark';
  mark.textContent = 'MC';
  mark.setAttribute('aria-hidden', 'true');
  const motto = document.createElement('span');
  motto.textContent = 'Motion Creates Change';
  signature.append(mark, motto);
  content.append(signature);
  let scrollStyles = null;
  let unlockTimer;
  const unlockPage = () => {
    if (!scrollStyles) return;
    for (const [element, value, priority] of scrollStyles) {
      if (value) element.style.setProperty('overflow', value, priority);
      else element.style.removeProperty('overflow');
    }
    scrollStyles = null;
  };
  button.addEventListener('click', () => {
    clearTimeout(unlockTimer);
    if (!scrollStyles) {
      scrollStyles = [document.documentElement, document.body].map(element => [element, element.style.getPropertyValue('overflow'), element.style.getPropertyPriority('overflow')]);
      for (const [element] of scrollStyles) element.style.setProperty('overflow', 'hidden', 'important');
    }
    dialog.showModal();
    button.setAttribute('aria-expanded', 'true');
  });
  dialog.addEventListener('close', () => {
    button.setAttribute('aria-expanded', 'false');
    // Retain scroll isolation while the top-layer exit transition finishes.
    unlockTimer = setTimeout(unlockPage, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 230);
  });
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
  window.addEventListener('pageshow', event => { if (event.persisted) { if (dialog.open) dialog.close(); clearTimeout(unlockTimer); unlockPage(); } });
  document.body.append(button, dialog);
  document.documentElement.dataset.motioncPhoneNav = 'ready';
})();
