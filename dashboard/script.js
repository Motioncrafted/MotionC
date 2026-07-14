window.addEventListener('load', () => {
    const button = document.getElementById("kscore-button");
    const drawer = document.querySelector('.input-drawer');
    const overlay = document.querySelector('.drawer-overlay');
    const kscoreBtn = document.getElementById('kscore-button');

    console.log("Dashboard JS loaded, kscoreBtn =", kscoreBtn);

    if (!kscoreBtn) {
        console.error("ERROR: #kscore-button not found in DOM");
        return;
    }




// Toggle drawer open/close when tapping the hotspot
button.addEventListener("click", () => {
    drawer.classList.toggle("open");
    overlay.classList.toggle("open");
});

// Close drawer when tapping outside
overlay.addEventListener("click", () => {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
});

    
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

