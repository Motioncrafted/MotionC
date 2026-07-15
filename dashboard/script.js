"use strict";

/* =========================================
   MotionC Dashboard
   ========================================= */


/* -----------------------------------------
   Main elements
   ----------------------------------------- */

const drawer = document.querySelector(".input-drawer");
const overlay = document.querySelector(".drawer-overlay");
const hotspot = document.getElementById("kscore-button");
const closeButton = document.querySelector(".drawer-close-btn");

const form = document.getElementById("kscore-form");

const calculateMcpButton =
    document.getElementById("calculate-mcp-btn");

const calculateLifestyleButton =
    document.getElementById("calculate-lifestyle-btn");


/* -----------------------------------------
   Measurement elements
   ----------------------------------------- */

const measurementSystemInputs =
    document.querySelectorAll(
        'input[name="measurementSystem"]'
    );

const imperialHeightFields =
    document.getElementById("imperial-height-fields");

const metricHeightFields =
    document.getElementById("metric-height-fields");

const weightInput = document.getElementById("weight");
const waistInput = document.getElementById("waist");

const heightFeetInput =
    document.getElementById("height-feet");

const heightInchesInput =
    document.getElementById("height-inches");

const heightCmInput =
    document.getElementById("height-cm");

const ageInput = document.getElementById("age");
const sexInput = document.getElementById("sex");


/* -----------------------------------------
   MCP information popup
   These elements will work once they are
   added to the matched HTML.
   ----------------------------------------- */

const mcpInfoButton =
    document.querySelector(".mcp-info-button");

const mcpInfoTooltip =
    document.querySelector(".mcp-info-tooltip");


/* =========================================
   Drawer controls
   ========================================= */

function isDrawerOpen() {
    return drawer?.classList.contains("open") ?? false;
}


function openDrawer() {
    if (!drawer || !overlay || !hotspot) {
        return;
    }

    drawer.classList.add("open");
    overlay.classList.add("open");

    /*
       This same active class will eventually
       produce the warm-gold active highlight.
       For now, the blue development box can
       remain visible in CSS.
    */
    hotspot.classList.add("active");

    drawer.setAttribute("aria-hidden", "false");
    hotspot.setAttribute("aria-expanded", "true");
}


function closeDrawer() {
    if (!drawer || !overlay || !hotspot) {
        return;
    }

    drawer.classList.remove("open");
    overlay.classList.remove("open");
    hotspot.classList.remove("active");

    drawer.setAttribute("aria-hidden", "true");
    hotspot.setAttribute("aria-expanded", "false");

    closeMcpInfo();
}


function toggleDrawer() {
    if (isDrawerOpen()) {
        closeDrawer();
    } else {
        openDrawer();
    }
}


/* MCP hotspot: mouse or touch */

hotspot?.addEventListener("click", toggleDrawer);


/*
   The MCP hotspot is currently a div with
   role="button", so Enter and Space should
   also operate it for keyboard users.
*/

hotspot?.addEventListener("keydown", (event) => {
    if (
        event.key === "Enter" ||
        event.key === " "
    ) {
        event.preventDefault();
        toggleDrawer();
    }
});


/* X button */

closeButton?.addEventListener("click", closeDrawer);


/* Outside overlay */

overlay?.addEventListener("click", closeDrawer);


/* Escape key */

document.addEventListener("keydown", (event) => {
    if (
        event.key === "Escape" &&
        isDrawerOpen()
    ) {
        closeDrawer();
    }
});


/* =========================================
   MCP information popup
   ========================================= */

function openMcpInfo() {
    if (!mcpInfoButton || !mcpInfoTooltip) {
        return;
    }

    mcpInfoTooltip.classList.add("open");
    mcpInfoButton.setAttribute(
        "aria-expanded",
        "true"
    );
}


function closeMcpInfo() {
    if (!mcpInfoButton || !mcpInfoTooltip) {
        return;
    }

    mcpInfoTooltip.classList.remove("open");
    mcpInfoButton.setAttribute(
        "aria-expanded",
        "false"
    );
}


function toggleMcpInfo(event) {
    event.stopPropagation();

    if (!mcpInfoTooltip) {
        return;
    }

    if (mcpInfoTooltip.classList.contains("open")) {
        closeMcpInfo();
    } else {
        openMcpInfo();
    }
}


/*
   Click/tap support.
   Hover and keyboard-focus visibility will
   also be handled in CSS.
*/

mcpInfoButton?.addEventListener(
    "click",
    toggleMcpInfo
);


/* Close popup when tapping elsewhere */

document.addEventListener("click", (event) => {
    if (
        !mcpInfoTooltip ||
        !mcpInfoButton
    ) {
        return;
    }

    const clickedInsideTooltip =
        mcpInfoTooltip.contains(event.target);

    const clickedInfoButton =
        mcpInfoButton.contains(event.target);

    if (
        !clickedInsideTooltip &&
        !clickedInfoButton
    ) {
        closeMcpInfo();
    }
});


/* =========================================
   Imperial / Metric switching
   ========================================= */

function getMeasurementSystem() {
    const selected =
        form?.querySelector(
            'input[name="measurementSystem"]:checked'
        );

    return selected?.value ?? "imperial";
}


function updateUnitLabels(system) {
    const weightLabel =
        document.querySelector(
            'label[for="weight"]'
        );

    const waistLabel =
        document.querySelector(
            'label[for="waist"]'
        );

    if (system === "metric") {
        if (weightLabel) {
            weightLabel.textContent = "Weight — kg";
        }

        if (waistLabel) {
            waistLabel.textContent = "Waist — cm";
        }

        if (weightInput) {
            weightInput.placeholder = "kg";
        }

        if (waistInput) {
            waistInput.placeholder = "cm";
        }
    } else {
        if (weightLabel) {
            weightLabel.textContent = "Weight — lb";
        }

        if (waistLabel) {
            waistLabel.textContent = "Waist — in";
        }

        if (weightInput) {
            weightInput.placeholder = "lb";
        }

        if (waistInput) {
            waistInput.placeholder = "in";
        }
    }
}


function updateMeasurementFields() {
    const system = getMeasurementSystem();
    const useMetric = system === "metric";

    if (imperialHeightFields) {
        imperialHeightFields.hidden = useMetric;
    }

    if (metricHeightFields) {
        metricHeightFields.hidden = !useMetric;
    }

    /*
       Required status follows the selected
       measurement system.
    */

    if (heightFeetInput) {
        heightFeetInput.required = !useMetric;
    }

    if (heightInchesInput) {
        heightInchesInput.required = !useMetric;
    }

    if (heightCmInput) {
        heightCmInput.required = useMetric;
    }

    updateUnitLabels(system);
}


measurementSystemInputs.forEach((input) => {
    input.addEventListener(
        "change",
        updateMeasurementFields
    );
});


/* Set correct initial labels and fields */

updateMeasurementFields();


/* =========================================
   Number helpers
   ========================================= */

function readNumber(input) {
    if (!input) {
        return NaN;
    }

    const value = Number(input.value);

    return Number.isFinite(value)
        ? value
        : NaN;
}


function roundToOne(value) {
    return Math.round(value * 10) / 10;
}


/* =========================================
   Required measurement validation
   ========================================= */

function getMeasurementData() {
    const system = getMeasurementSystem();

    const enteredWeight = readNumber(weightInput);
    const enteredWaist = readNumber(waistInput);
    const age = readNumber(ageInput);
    const sex = sexInput?.value ?? "";

    let heightInches;
    let heightMetres;
    let waistInches;
    let weightKg;

    if (system === "metric") {
        const heightCm = readNumber(heightCmInput);

        heightMetres = heightCm / 100;
        heightInches = heightCm / 2.54;
        waistInches = enteredWaist / 2.54;
        weightKg = enteredWeight;
    } else {
        const feet = readNumber(heightFeetInput);
        const inches = readNumber(
            heightInchesInput
        );

        heightInches = feet * 12 + inches;
        heightMetres = heightInches * 0.0254;
        waistInches = enteredWaist;
        weightKg = enteredWeight * 0.45359237;
    }

    const valuesAreValid =
        Number.isFinite(enteredWeight) &&
        enteredWeight > 0 &&
        Number.isFinite(enteredWaist) &&
        enteredWaist > 0 &&
        Number.isFinite(heightInches) &&
        heightInches > 0 &&
        Number.isFinite(heightMetres) &&
        heightMetres > 0 &&
        Number.isFinite(age) &&
        age > 0 &&
        sex !== "";

    if (!valuesAreValid) {
        throw new Error(
            "Please complete all measurement fields before calculating your MCP."
        );
    }

    return {
        system,
        enteredWeight,
        enteredWaist,
        age,
        sex,
        heightInches,
        heightMetres,
        waistInches,
        weightKg
    };
}


/* =========================================
   BMI
   ========================================= */

function calculateBmi(weightKg, heightMetres) {
    return (
        weightKg /
        (heightMetres * heightMetres)
    );
}


/* =========================================
   MCP
   ========================================= */

/*
   IMPORTANT:

   This remains the provisional MCP formula.
   When the final Motion Core Prime model is
   confirmed, only this function needs to be
   changed. Nothing else in the drawer,
   dashboard, or Lifestyle Checklist needs
   to be rewritten.
*/

function calculateMcp({
    heightInches,
    waistInches,
    age,
    sex
}) {
    let mcp =
        (heightInches / waistInches) * 20;

    /*
       One point per completed decade after 40.
    */

    if (age > 40) {
        mcp += Math.floor((age - 40) / 10);
    }

    /*
       Current MotionC female baseline
       adjustment.
    */

    if (sex === "female") {
        mcp += 1;
    }

    return Math.max(
        0,
        Math.min(50, mcp)
    );
}


/* =========================================
   Dashboard metric updating
   ========================================= */

/*
   These IDs can be placed over the four
   top cards when we wire the live values:

   display-weight
   display-weight-unit
   display-waist
   display-waist-unit
   display-bmi
   display-mcp
*/

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


function updateMcpDashboard({
    system,
    enteredWeight,
    enteredWaist,
    bmi,
    mcp
}) {
    const weightUnit =
        system === "metric" ? "kg" : "lb";

    const waistUnit =
        system === "metric" ? "cm" : "in";

    setText(
        "display-weight",
        enteredWeight.toFixed(1)
    );

    setText(
        "display-weight-unit",
        weightUnit
    );

    setText(
        "display-waist",
        enteredWaist.toFixed(1)
    );

    setText(
        "display-waist-unit",
        waistUnit
    );

    setText(
        "display-bmi",
        bmi.toFixed(1)
    );

    setText(
        "display-mcp",
        mcp.toFixed(1)
    );
}


/* =========================================
   Calculate MCP button
   ========================================= */

calculateMcpButton?.addEventListener(
    "click",
    () => {
        try {
            const measurementData =
                getMeasurementData();

            const bmi = calculateBmi(
                measurementData.weightKg,
                measurementData.heightMetres
            );

            const mcp = calculateMcp(
                measurementData
            );

            updateMcpDashboard({
                system:
                    measurementData.system,

                enteredWeight:
                    measurementData.enteredWeight,

                enteredWaist:
                    measurementData.enteredWaist,

                bmi,
                mcp
            });

            /*
               Temporary confirmation until the
               live metric overlays are added.
            */

            alert(
                `Your MCP is ${roundToOne(mcp)}.\n` +
                `Your BMI is ${roundToOne(bmi)}.`
            );
        } catch (error) {
            alert(error.message);
        }
    }
);


/* =========================================
   Lifestyle Checklist
   ========================================= */

const lifestyleGroups = [
    "sleep",
    "hydration",
    "nutrition",
    "walking",
    "stress",
    "alcohol",
    "smoking",
    "activity"
];


function getSelectedLifestyleValue(groupName) {
    const selected =
        form?.querySelector(
            `input[name="${groupName}"]:checked`
        );

    if (!selected) {
        return null;
    }

    const value = Number(selected.value);

    return Number.isFinite(value)
        ? value
        : null;
}


function calculateLifestyleScore() {
    let total = 0;
    const unanswered = [];

    lifestyleGroups.forEach((groupName) => {
        const value =
            getSelectedLifestyleValue(groupName);

        if (value === null) {
            unanswered.push(groupName);
        } else {
            total += value;
        }
    });

    if (unanswered.length > 0) {
        throw new Error(
            "Please answer all eight Lifestyle Checklist questions before updating the gauge."
        );
    }

    return total;
}


/* =========================================
   Lifestyle gauge updating
   ========================================= */

/*
   Once the gauge is built, it can use:

   lifestyleScore: 0–24
   lifestylePercent: 0–100
*/

function updateLifestyleGauge(score) {
    const maximumScore = 24;

    const percentage =
        (score / maximumScore) * 100;

    setText(
        "display-lifestyle-score",
        String(score)
    );

    setText(
        "display-lifestyle-percent",
        `${Math.round(percentage)}%`
    );

    /*
       This custom event gives the future
       gauge code a clean place to listen
       without mixing it into the form logic.
    */

    document.dispatchEvent(
        new CustomEvent(
            "motionc:lifestyle-updated",
            {
                detail: {
                    score,
                    maximumScore,
                    percentage
                }
            }
        )
    );

    return percentage;
}


/* =========================================
   Update Lifestyle Gauge button
   ========================================= */

calculateLifestyleButton?.addEventListener(
    "click",
    () => {
        try {
            const score =
                calculateLifestyleScore();

            const percentage =
                updateLifestyleGauge(score);

            /*
               Temporary confirmation until the
               live gauge needle is installed.
            */

            alert(
                `Lifestyle Checklist: ${score} of 24 ` +
                `(${Math.round(percentage)}%).`
            );
        } catch (error) {
            alert(error.message);
        }
    }
);
