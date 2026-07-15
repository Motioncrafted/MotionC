// Drawer elements
const drawer = document.querySelector('.input-drawer');
const overlay = document.querySelector('.drawer-overlay');
const hotspot = document.getElementById('kscore-button');
const closeBtn = document.querySelector('.drawer-close-btn');
const form = document.getElementById('kscore-form');

// Open drawer
hotspot.addEventListener('click', () => {
    drawer.classList.add('open');
    overlay.classList.add('open');
});

// Close drawer
closeBtn.addEventListener('click', () => {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
});

overlay.addEventListener('click', () => {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
});

// Form submission + K‑Score calculation
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const weight = parseFloat(document.getElementById('weight').value);
    const waist = parseFloat(document.getElementById('waist').value);
    const heightFeet = parseFloat(document.getElementById('height-feet').value);
    const heightInches = parseFloat(document.getElementById('height-inches').value);
    const age = parseFloat(document.getElementById('age').value);
    const sex = document.getElementById('sex').value;

    const sleep = form.querySelectorAll("input[name='sleep']:checked");
    const hydration = form.querySelectorAll("input[name='hydration']:checked");
    const activity = form.querySelectorAll("input[name='activity']:checked");

    const heightTotal = heightFeet * 12 + heightInches;

    let kScore = 0;

    // Basic K‑Score logic
    if (!isNaN(weight) && !isNaN(waist) && !isNaN(heightTotal)) {
        kScore += (heightTotal / waist) * 10;
    }

    if (!isNaN(age)) {
        kScore -= age * 0.2;
    }

    if (sex === "male") kScore += 3;
    if (sex === "female") kScore += 5;

    kScore += sleep.length + hydration.length + activity.length;

    alert("Your updated K‑Score: " + Math.round(kScore));

    drawer.classList.remove('open');
    overlay.classList.remove('open');
});
