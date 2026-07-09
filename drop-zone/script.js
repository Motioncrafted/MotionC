const sprayButton = document.getElementById("sprayButton");
const imageStage = document.querySelector(".image-stage");

sprayButton.addEventListener("click", () => {
    console.log("SPRAY IT clicked!");

    for (let i = 0; i < 40; i++) {
        const particle = document.createElement("span");
        particle.className = "spray-particle";

        particle.style.left = "69%";
        particle.style.top = "75%";

        const x = -80 - Math.random() * 90;
        const y = -40 + Math.random() * 80;

        particle.style.setProperty("--x", `${x}px`);
        particle.style.setProperty("--y", `${y}px`);

        imageStage.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 2000);
    }
});
