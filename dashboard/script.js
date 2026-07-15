// Drawer toggle logic
const drawer = document.querySelector('.input-drawer');
const overlay = document.querySelector('.drawer-overlay');
const openBtn = document.getElementById('kscore-button');
const closeBtn = document.querySelector('.drawer-close-btn');

if (openBtn && drawer && overlay && closeBtn) {
    openBtn.addEventListener('click', () => {
        drawer.classList.add('open');
        overlay.classList.add('open');
    });

    closeBtn.addEventListener('click', () => {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
    });

    overlay.addEventListener('click', () => {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
    });
}
