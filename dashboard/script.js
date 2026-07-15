// =========================================
// MotionC dashboard drawer
// =========================================

const drawer = document.querySelector(".input-drawer");
const overlay = document.querySelector(".drawer-overlay");
const hotspot = document.getElementById("kscore-button");
const closeBtn = document.querySelector(".drawer-close-btn");
const form = document.getElementById("kscore-form");


// =========================================
// Drawer controls
// =========================================

function openDrawer() {
    drawer.classList.add("open");
    overlay.classList.add("open");

    drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
    drawer.classList.remove("open");
    overlay.classList.remove("open");

    drawer.setAttribute("aria-hidden", "true");
}

function toggleDrawer() {
    const isOpen = drawer.classList.contains("open");

    if (isOpen) {
        closeDrawer();
    } else {
        openDrawer();
    }
}


// MCP hotspot opens and closes the drawer
hotspot.addEventListener("click", toggleDrawer);


// X button closes the drawer
closeBtn.addEventListener("click", closeDrawer);


// Clicking outside the drawer closes it
overlay.addEventListener("click", closeDrawer);


// Escape key closes the drawer
document.addEventListener("keydown", (event) => {
    if (
        event.key === "Escape" &&
        drawer.classList.contains("open")
    ) {
        closeDrawer();
    }
});


// =========================================
// Temporary MCP calculation
// =========================================

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const weight = Number(
        document.getElementById("weight").value
    );

    const waist = Number(
        document.getElementById("waist").value
    );

    const heightFeet = Number(
        document.getElementById("height-feet").value
    );

    const heightInches = Number(
        document.getElementById("height-inches").value
    );

    const age = Number(
        document.getElementById("age").value
    );

    const sex = document.getElementById("sex").value;


    // Total imperial height in inches
    const totalHeightInches =
        heightFeet * 12 + heightInches;


    // Basic validation
    if (
        !Number.isFinite(weight) ||
        weight <= 0 ||
        !Number.isFinite(waist) ||
        waist <= 0 ||
        !Number.isFinite(totalHeightInches) ||
        totalHeightInches <= 0
    ) {
        alert("Please enter valid weight, waist and height values.");
        return;
    }


    let mcp = 0;


    /*
       Temporary MCP formula.

       We can replace this with the finalized
       Motion Core Prime model once the four
       dashboard values are connected.
    */
    mcp += (totalHeightInches / waist) * 10;


    if (Number.isFinite(age) && age > 0) {
        mcp -= age * 0.2;
    }


    if (sex === "male") {
        mcp += 3;
    }

    if (sex === "female") {
        mcp += 5;
    }


    // Existing lifestyle selections
    const sleepSelections =
        form.querySelectorAll(
            "input[name='sleep']:checked"
        ).length;

    const hydrationSelections =
        form.querySelectorAll(
            "input[name='hydration']:checked"
        ).length;

    const activitySelections =
        form.querySelectorAll(
            "input[name='activity']:checked"
        ).length;


    mcp +=
        sleepSelections +
        hydrationSelections +
        activitySelections;


    alert(
        "Your updated MCP: " +
        Math.round(mcp * 10) / 10
    );


    closeDrawer();
});
