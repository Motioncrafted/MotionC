const drawer = document.querySelector('.input-drawer');
const overlay = document.querySelector('.drawer-overlay');
const kscoreBtn = document.getElementById('kscore-button');

// Open drawer
kscoreBtn.addEventListener('click', () => {
    drawer.classList.add('open');
    overlay.classList.add('open');
});

// Close drawer when clicking overlay
overlay.addEventListener('click', () => {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
});

// Close drawer with ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
    }
});

