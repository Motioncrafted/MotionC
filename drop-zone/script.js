const sprayButton = document.getElementById("sprayButton");
const sprayMist = document.getElementById("sprayMist");

sprayButton.addEventListener("click", () => {

    console.log("SPRAY IT clicked!");

    sprayMist.style.opacity = "1";

    setTimeout(() => {
        sprayMist.style.opacity = "0";
    }, 1000);

});
