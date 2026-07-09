const sprayButton = document.getElementById("sprayButton");
const imageStage = document.querySelector(".image-stage");

let sprayInterval = null;

function createSprayBurst() {
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement("span");
        particle.className = "spray-particle";

        particle.style.left = "76%";
        particle.style.top = "77%";

        const x = -80 - Math.random() * 90;
        const y = -40 + Math.random() * 80;

        particle.style.setProperty("--x", `${x}px`);
        particle.style.setProperty("--y", `${y}px`);

        imageStage.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 650);
    }
}

function startSpraying() {
    console.log("SPRAY STARTED");

    createSprayBurst();

    sprayInterval = setInterval(() => {
        createSprayBurst();
    }, 60);
}

function stopSpraying() {
    console.log("SPRAY STOPPED");

    clearInterval(sprayInterval);
    sprayInterval = null;
}

sprayButton.addEventListener("mousedown", startSpraying);
sprayButton.addEventListener("mouseup", stopSpraying);
sprayButton.addEventListener("mouseleave", stopSpraying);
