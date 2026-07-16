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
   added to the matching HTML.
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


/* Click/tap support */

mcpInfoButton?.addEventListener(
    "click",
    toggleMcpInfo
);


/* Close popup when clicking or tapping elsewhere */

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


/* Set the correct initial labels and fields */

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


/* =========================================
   Required measurement validation
   ========================================= */

function getMeasurementData() {
    const system = getMeasurementSystem();

    const enteredWeight = readNumber(weightInput);
    const enteredWaist = readNumber(waistInput);
    const age = readNumber(ageInput);
    const sex = sexInput?.value ?? "";

    let heightCm;
    let heightMetres;
    let heightInches;

    let waistCm;
    let waistInches;

    let weightKg;
    let weightLbs;

    if (system === "metric") {
        heightCm = readNumber(heightCmInput);
        heightMetres = heightCm / 100;
        heightInches = heightCm / 2.54;

        waistCm = enteredWaist;
        waistInches = waistCm / 2.54;

        weightKg = enteredWeight;
        weightLbs = weightKg / 0.453592;
    } else {
        const feet = readNumber(heightFeetInput);
        const inches = readNumber(heightInchesInput);

        heightInches = (feet * 12) + inches;
        heightCm = heightInches * 2.54;
        heightMetres = heightCm / 100;

        waistInches = enteredWaist;
        waistCm = waistInches * 2.54;

        weightLbs = enteredWeight;
        weightKg = weightLbs * 0.453592;
    }

    const valuesAreValid =
        Number.isFinite(enteredWeight) &&
        enteredWeight > 0 &&

        Number.isFinite(enteredWaist) &&
        enteredWaist > 0 &&

        Number.isFinite(heightCm) &&
        heightCm > 0 &&

        Number.isFinite(heightMetres) &&
        heightMetres > 0 &&

        Number.isFinite(heightInches) &&
        heightInches > 0 &&

        Number.isFinite(waistCm) &&
        waistCm > 0 &&

        Number.isFinite(waistInches) &&
        waistInches > 0 &&

        Number.isFinite(weightKg) &&
        weightKg > 0 &&

        Number.isFinite(weightLbs) &&
        weightLbs > 0 &&

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

        heightCm,
        heightMetres,
        heightInches,

        waistCm,
        waistInches,

        weightKg,
        weightLbs
    };
}


/* =========================================
   MCP calculation engine
   ========================================= */

/*
   Motion Core Prime formula

   All calculations retain full precision.

   Rounding is applied only when values
   are presented on screen.
*/

function getAgeAdjustment(age) {
    if (age >= 70) {
        return 4;
    }

    if (age >= 60) {
        return 3;
    }

    if (age >= 50) {
        return 2;
    }

    if (age >= 40) {
        return 1;
    }

    return 0;
}


function getSexAdjustment(sex) {
    const normalizedSex =
        String(sex).trim().toLowerCase();

    return normalizedSex === "female" ? 1 : 0;
}


function calculateMcp({
    heightCm,
    heightMetres,
    waistCm,
    weightKg,
    age,
    sex
}) {
    /*
       Core metrics
    */

    const bmi =
        weightKg /
        (heightMetres * heightMetres);

    const whtr =
        waistCm / heightCm;

    const bodyK50 =
        (bmi * whtr) * 2;

    /*
       Adjustments
    */

    const sexAdjustment =
        getSexAdjustment(sex);

    const ageAdjustment =
        getAgeAdjustment(age);

    /*
       Raw score and final scaled MCP
    */

    const rawScore =
        bodyK50 +
        sexAdjustment +
        ageAdjustment;

    const mcp =
        (2.551 * rawScore) - 51.53;

    return {
        bmi,
        whtr,
        bodyK50,
        sexAdjustment,
        ageAdjustment,
        rawScore,
        mcp
    };
}


/* =========================================
   Dashboard metric updating
   ========================================= */

/*
   These IDs can be placed over the top
   dashboard cards:

   display-weight
   display-weight-unit

   display-waist
   display-waist-unit

   display-bmi
   display-whtr
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
    results
}) {
    const weightUnit =
        system === "metric" ? "kg" : "lb";

    const waistUnit =
        system === "metric" ? "cm" : "in";

    /*
       Weight and waist are displayed in the
       measurement system selected by the user.
    */

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

    /*
       MotionC display standards:

       BMI  = 1 decimal place
       WHtR = 2 decimal places
       MCP  = 1 decimal place
    */

    setText(
        "display-bmi",
        results.bmi.toFixed(1)
    );

    setText(
        "display-whtr",
        results.whtr.toFixed(2)
    );

    setText(
        "display-mcp",
        results.mcp.toFixed(1)
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

            const results =
                calculateMcp(measurementData);

            updateMcpDashboard({
                system:
                    measurementData.system,

                enteredWeight:
                    measurementData.enteredWeight,

                enteredWaist:
                    measurementData.enteredWaist,

                results
            });

            /*
               Temporary confirmation until all
               live metric overlays are installed.
            */

            alert(
                `Your MCP is ${results.mcp.toFixed(1)}.\n` +
                `Your BMI is ${results.bmi.toFixed(1)}.\n` +
                `Your WHtR is ${results.whtr.toFixed(2)}.`
            );

            /*
               Future features can listen for this
               event without duplicating the MCP
               calculation formula.
            */

            document.dispatchEvent(
                new CustomEvent(
                    "motionc:mcp-updated",
                    {
                        detail: {
                            measurementData,
                            results
                        }
                    }
                )
            );
        } catch (error) {
            alert(
                error instanceof Error
                    ? error.message
                    : "Unable to calculate your MCP."
            );
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
            alert(
                error instanceof Error
                    ? error.message
                    : "Unable to calculate the Lifestyle score."
            );
        }
    }
);
