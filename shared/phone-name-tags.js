/* No account lookup or storage: present the existing account bridge's DOM output. */
(() => {
  'use strict';
  if (document.documentElement.dataset.motioncPresentation !== 'phone') return;
  const hero = document.querySelector('.hero');
  const library = document.getElementById('phoneLibrary');
  if (!hero && !library) return;
  let source, tag;

  function fit() {
    if (!tag) return;
    tag.style.fontSize = '';
    tag.style.maxWidth = '';
    const host = hero || library;
    const rect = host.getBoundingClientRect();
    let available = rect.width - 40;
    if (library) {
      const back = library.querySelector('a[aria-label="Go back to Summary"]');
      available = rect.right - 20 - (back.getBoundingClientRect().right + 16);
    }
    const size = parseFloat(getComputedStyle(tag).fontSize);
    tag.style.maxWidth = Math.max(1, available) + 'px';
    if (tag.scrollWidth > available) {
      tag.style.fontSize = (size * Math.max(1, available - 2) / tag.scrollWidth) + 'px';
    }
  }

  function render() {
    if (!source || !tag) return;
    tag.removeAttribute('data-account-visible');
    if (tag !== source) {
      tag.textContent = source.textContent;
      tag.setAttribute('href', source.getAttribute('href') || '/auth/');
      tag.setAttribute('aria-label', source.getAttribute('aria-label') || 'MotionC account');
    }
    // Only show the signed-in account treatment supplied by accountBadge().
    if (new URL(source.href, location.origin).searchParams.get('manage') !== '1') return;
    fit();
    tag.setAttribute('data-account-visible', '');
  }

  function attach() {
    source = hero ? hero.querySelector('.member-sign-in') : document.querySelector('.motionc-menu-account, .motionc-account-badge');
    if (!source) return false;
    // Daily's original date block keeps its exact geometry, including landscape.
    // Its new visual link mirrors that one authoritative account output.
    tag = document.createElement('a');
    tag.classList.add('phone-name-tag');
    (hero || library).append(tag);
    new MutationObserver(render).observe(source, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['href', 'aria-label']
    });
    new ResizeObserver(fit).observe(hero || library);
    render();
    return true;
  }

  if (!attach()) {
    const discovery = new MutationObserver(() => { if (attach()) discovery.disconnect(); });
    discovery.observe(document.body, { childList: true, subtree: true });
  }
  window.addEventListener('motionc:account-changing', () => tag?.removeAttribute('data-account-visible'));
  window.addEventListener('resize', fit);
  document.fonts.ready.then(fit);
})();

