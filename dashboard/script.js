window.addEventListener('DOMContentLoaded', () => {
    const drawer = document.querySelector('.input-drawer');
    const overlay = document.querySelector('.drawer-overlay');
    const kscoreBtn = document.getElementById('kscore-button');

    console.log("Dashboard JS loaded, kscoreBtn =", kscoreBtn);

    if (!kscoreBtn) {
        console.error("ERROR: #kscore-button not found in DOM");
        return;
    }

    // Open drawer
    kscoreBtn.addEventListener('click', () => {
        console.log("Blue box clicked");
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
});
