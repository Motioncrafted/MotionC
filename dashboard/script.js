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

/* -----------------------------------------
   Engine Room button
   ----------------------------------------- */

const engineRoomButton =
    document.getElementById("simulation-button");
/* =========================================
   Active page indicator
   ========================================= */

hotspot?.classList.add("active-page");
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
   
    drawer.setAttribute("aria-hidden", "false");
    hotspot.setAttribute("aria-expanded", "true");
}


function closeDrawer() {
    if (!drawer || !overlay || !hotspot) {
        return;
    }

    drawer.classList.remove("open");
    overlay.classList.remove("open");
    
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
   Engine Room
   ========================================= */

engineRoomButton?.addEventListener("click", () => {

    document.body.classList.add("page-fade-out");

    setTimeout(() => {
        window.location.href = "/engine-room/";
    }, 250);

});

/* =========================================
   Engine Room
   ========================================= */

engineRoomButton?.addEventListener("click", () => {

    document.body.classList.add("page-fade-out");

    setTimeout(() => {
        window.location.href = "/engine-room/";
    }, 250);

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

const lifestyleSummaryStorageKey =
    "motionc-lifestyle-summary-v1";

const dailyLifestyleKeys = {
    sleep: "sleep",
    hydration: "hydration",
    nutrition: "nutrition",
    walking: "movement",
    stress: "stress",
    alcohol: "alcohol",
    smoking: "smoking",
    activity: "activity"
};

function currentLifestyleWeekKey() {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - date.getDay());

    const localDate =
        new Date(
            date.getTime() -
            date.getTimezoneOffset() * 60000
        );

    return localDate.toISOString().slice(0, 10);
}

function saveLifestyleSummary(score) {
    const values = {};

    lifestyleGroups.forEach((groupName) => {
        values[dailyLifestyleKeys[groupName]] =
            getSelectedLifestyleValue(groupName) / 3;
    });

    localStorage.setItem(
        lifestyleSummaryStorageKey,
        JSON.stringify({
            week: currentLifestyleWeekKey(),
            score,
            maximumScore: 24,
            baseScore: score / 3,
            values,
            updatedAt: new Date().toISOString()
        })
    );
}

function restoreLifestyleSummary() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(
                lifestyleSummaryStorageKey
            )
        );

        const score = Number(saved?.score);

        if (
            !Number.isFinite(score) ||
            score < 0 ||
            score > 24
        ) {
            return;
        }

        lifestyleGroups.forEach((groupName) => {
            const dailyKey =
                dailyLifestyleKeys[groupName];

            const savedValue =
                Number(saved.values?.[dailyKey]);

            if (!Number.isFinite(savedValue)) {
                return;
            }

            const option = form?.querySelector(
                `input[name="${groupName}"][value="${Math.round(savedValue * 3)}"]`
            );

            if (option) {
                option.checked = true;
            }
        });

        updateLifestyleGauge(score);
    } catch {
        // Ignore missing or invalid saved data.
    }
}


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

            saveLifestyleSummary(score);

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
/* =========================================
   Gauge arrow controls
   ========================================= */

/*
   The two gauges intentionally use different
   zone systems.

   YOUR TREND:
   Four active 25% zones. Yellow is skipped.

   LIFESTYLE CHECKLIST:
   Five active 20% zones. Yellow is included.
*/

function clamp(value, minimum, maximum) {
    return Math.min(
        Math.max(value, minimum),
        maximum
    );
}

function interpolate(
    value,
    inputMinimum,
    inputMaximum,
    outputMinimum,
    outputMaximum
) {
    const progress =
        (value - inputMinimum) /
        (inputMaximum - inputMinimum);

    return outputMinimum +
        (
            progress *
            (outputMaximum - outputMinimum)
        );
}


/* -----------------------------------------
   YOUR TREND
   ----------------------------------------- */

function trendPercentageToGaugeAngle(percentage) {

    const percent =
        clamp(percentage, 0, 100);

    if (percent <= 25) {
        return interpolate(
            percent,
            0,
            25,
            -86,
            -55
        );
    }

    if (percent <= 50) {
        return interpolate(
            percent,
            25,
            50,
            -52,
            -20
        );
    }

    if (percent <= 75) {
        return interpolate(
            percent,
            50,
            75,
            20,
            52
        );
    }

    return interpolate(
        percent,
        75,
        100,
        55,
        86
    );
}


/* -----------------------------------------
   LIFESTYLE CHECKLIST
   ----------------------------------------- */

function lifestylePercentageToGaugeAngle(percentage) {

    const percent =
        clamp(percentage, 0, 100);

    return interpolate(
        percent,
        0,
        100,
        -86,
        86
    );
}


function setGaugeArrowAngle(
    element,
    angle
) {

    if (!element) {
        return;
    }

    element.style.setProperty(
        "--gauge-angle",
        `${angle}deg`
    );
}


/* -----------------------------------------
   MCP percentage
   ----------------------------------------- */

function mcpToGaugePercentage(mcp) {

    return clamp(
        (mcp / 50) * 100,
        0,
        100
    );
}


const trendGaugeArrow =
    document.getElementById(
        "trend-gauge-arrow"
    );

const lifestyleGaugeArrow =
    document.getElementById(
        "lifestyle-gauge-arrow"
    );


document.addEventListener(
    "motionc:mcp-updated",
    (event) => {

        const mcp =
            Number(
                event.detail?.results?.mcp
            );

        if (!Number.isFinite(mcp)) {
            return;
        }

        const percentage =
            mcpToGaugePercentage(
                mcp
            );

        const angle =
            trendPercentageToGaugeAngle(
                percentage
            );

        setGaugeArrowAngle(
            trendGaugeArrow,
            angle
        );

    }
);


document.addEventListener(
    "motionc:lifestyle-updated",
    (event) => {

        const percentage =
            Number(
                event.detail?.percentage
            );

        if (!Number.isFinite(percentage)) {
            return;
        }

        const angle =
            lifestylePercentageToGaugeAngle(
                percentage
            );

        setGaugeArrowAngle(
            lifestyleGaugeArrow,
            angle
        );

    }
);

window.addEventListener(
    "load",
    restoreLifestyleSummary
);

window.addEventListener(
    "pageshow",
    () => {
        document.body.classList.remove(
            "page-fade-out"
        );
        closeDrawer();
        restoreLifestyleSummary();
    }
);

/* ==========================================================
   TEMP LOCATION MARKER
   MCP "YOU ARE HERE" PLACEHOLDER
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const dashboardWrapper =
        document.querySelector(
            ".dashboard-wrapper"
        );

    if (!dashboardWrapper) {
        console.warn(
            "MCP location marker: dashboard wrapper not found."
        );

        return;
    }

    const existingMarker =
        document.getElementById(
            "mcp-location-marker"
        );

    if (existingMarker) {
        return;
    }

    const mcpLocationMarker =
        document.createElement(
            "div"
        );

    mcpLocationMarker.id =
        "mcp-location-marker";

    mcpLocationMarker.setAttribute(
        "aria-hidden",
        "true"
    );

    Object.assign(
        mcpLocationMarker.style,
        {
            position: "absolute",
            top: "35.6%",
            left: "1.3%",
            width: "6.9%",
            height: "10.3%",
            border: "3px solid #ffd400",
            borderRadius: "6px",
            background: "transparent",
            boxSizing: "border-box",
            pointerEvents: "none",
            zIndex: "20"
        }
    );

    dashboardWrapper.appendChild(
        mcpLocationMarker
    );

});

/* =========================================
   Modern Summary data and chart layer
   ========================================= */

const summaryDailyStorageKey = "motionc-daily-prototype-v1";
const summaryWalkingStorageKey = "walking_page_walks_v1";
const summaryMcpStorageKey = "motionc-mcp-summary-v1";
const summaryGoalStorageKey = "motionc-weight-goal-v1";
let summaryGoalWeight = null;
let summaryWeightPoints = [];

const summaryLifestyleMeta = {
    sleep: ["☾", "Sleep", ["Needs attention", "About 6 hours", "7–8 hours"]],
    hydration: ["◒", "Hydration", ["Drink more water", "Improving", "Well hydrated"]],
    nutrition: ["●", "Nutrition", ["Needs attention", "Mixed choices", "Healthy choices"]],
    movement: ["↗", "Walking", ["Under 3,000 steps", "3,000–8,000 steps", "8,000+ steps"]],
    stress: ["◇", "Stress", ["High stress", "Moderate stress", "Well managed"]],
    alcohol: ["▽", "Alcohol", ["High intake", "Moderate intake", "Low intake"]],
    smoking: ["⊘", "Smoking", ["Current smoker", "Former smoker", "Non-smoker"]],
    activity: ["✦", "Activity", ["Rare exercise", "Occasional exercise", "Regular workouts"]]
};

function readSummaryStorage(key, fallback) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key));
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

function summaryDate(value) {
    return new Date(`${value}T12:00:00`);
}

function summaryIso(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function recentDateKeys(days) {
    const dates = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    for (let offset = days - 1; offset >= 0; offset -= 1) {
        const date = new Date(today);
        date.setDate(date.getDate() - offset);
        dates.push(summaryIso(date));
    }
    return dates;
}

function shortChartDate(value) {
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
        .format(summaryDate(value));
}

function setRingValue(id, percentage) {
    const ring = document.getElementById(id);
    if (ring) {
        ring.style.setProperty("--ring-value", `${Math.max(0, Math.min(100, percentage)) * 3.6}deg`);
    }
}

function renderLifestyleSummary(saved) {
    const container = document.getElementById("lifestyle-items");
    if (!container) return;

    const values = saved?.values || {};
    container.innerHTML = Object.entries(summaryLifestyleMeta).map(([key, meta]) => {
        const numeric = Number(values[key]);
        const level = Number.isFinite(numeric) ? Math.max(0, Math.min(2, Math.round(numeric * 2))) : -1;
        const stateClass = level === 2 ? "good" : level === 1 ? "mid" : level === 0 ? "low" : "";
        const detail = level >= 0 ? meta[2][level] : "Not answered";
        return `
            <div class="lifestyle-item">
                <span class="lifestyle-item-icon" aria-hidden="true">${meta[0]}</span>
                <span><strong>${meta[1]}</strong><small>${detail}</small></span>
                <span class="lifestyle-level ${stateClass}" aria-label="${detail}"></span>
            </div>
        `;
    }).join("");

    const score = Number(saved?.score);
    if (Number.isFinite(score)) {
        setText("display-lifestyle-score", String(score));
        setText("display-lifestyle-percent", `${Math.round(score / 24 * 100)}%`);
        setText("weekly-lifestyle", `${score} / 24`);
        setRingValue("lifestyle-ring", score / 24 * 100);
    }
}

function roundedRect(context, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    context.beginPath();
    context.roundRect(x, y, width, height, safeRadius);
}

function prepareCanvas(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { context, width: rect.width, height: rect.height };
}

function drawGrid(context, width, height, padding) {
    context.strokeStyle = "#e4e9e5";
    context.lineWidth = 1;
    for (let row = 0; row < 4; row += 1) {
        const y = padding.top + (height - padding.top - padding.bottom) * row / 3;
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.stroke();
    }
}

function drawWeightChart(points) {
    const canvas = document.getElementById("weight-chart");
    const empty = document.getElementById("weight-chart-empty");
    if (!canvas || !empty) return;

    if (points.length < 1) {
        empty.hidden = false;
        canvas.hidden = true;
        return;
    }

    empty.hidden = true;
    canvas.hidden = false;
    const { context, width, height } = prepareCanvas(canvas);
    const padding = { top: 18, right: 15, bottom: 34, left: 14 };
    summaryWeightPoints = points;
    const values = points.map(point => point.value);
    if (Number.isFinite(summaryGoalWeight)) values.push(summaryGoalWeight);
    const minimum = Math.min(...values) - .7;
    const maximum = Math.max(...values) + .7;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    drawGrid(context, width, height, padding);

    const coordinates = points.map((point, index) => ({
        x: padding.left + chartWidth * (points.length === 1 ? .5 : index / (points.length - 1)),
        y: padding.top + chartHeight * (1 - (point.value - minimum) / (maximum - minimum)),
        ...point
    }));
    canvas._hitPoints = coordinates;

    const gradient = context.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, "rgba(52, 123, 80, .28)");
    gradient.addColorStop(1, "rgba(52, 123, 80, 0)");
    context.beginPath();
    context.moveTo(coordinates[0].x, height - padding.bottom);
    coordinates.forEach(point => context.lineTo(point.x, point.y));
    context.lineTo(coordinates.at(-1).x, height - padding.bottom);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();

    context.beginPath();
    coordinates.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.strokeStyle = "#347b50";
    context.lineWidth = 3;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();

    coordinates.forEach(point => {
        context.beginPath();
        context.arc(point.x, point.y, 4, 0, Math.PI * 2);
        context.fillStyle = "#fff";
        context.fill();
        context.strokeStyle = "#347b50";
        context.lineWidth = 2;
        context.stroke();
    });

    if (Number.isFinite(summaryGoalWeight)) {
        const goalY = padding.top + chartHeight * (1 - (summaryGoalWeight - minimum) / (maximum - minimum));
        context.save();
        context.setLineDash([7, 5]);
        context.beginPath();
        context.moveTo(padding.left, goalY);
        context.lineTo(width - padding.right, goalY);
        context.strokeStyle = "#d19a2d";
        context.lineWidth = 2;
        context.stroke();
        context.restore();

        const goalText = `Goal ${summaryGoalWeight.toFixed(1)} lb`;
        context.font = "bold 10px Arial";
        const labelWidth = context.measureText(goalText).width + 14;
        context.fillStyle = "#fff4d2";
        roundedRect(context, width - padding.right - labelWidth, goalY - 20, labelWidth, 17, 7);
        context.fill();
        context.fillStyle = "#8c6415";
        context.textAlign = "center";
        context.fillText(goalText, width - padding.right - labelWidth / 2, goalY - 8);
        canvas._goalScale = { minimum, maximum, top: padding.top, height: chartHeight, goalY };
        setText("goal-weight-label", `Goal: ${summaryGoalWeight.toFixed(1)} lb`);
    }

    context.fillStyle = "#7a8782";
    context.font = "10px Arial";
    context.textAlign = "center";
    coordinates.forEach((point, index) => {
        if (index === 0 || index === coordinates.length - 1 || index % 3 === 0) {
            context.fillText(shortChartDate(point.date), point.x, height - 11);
        }
    });
}

function drawWalkingChart(points) {
    const canvas = document.getElementById("walking-chart");
    const empty = document.getElementById("walking-chart-empty");
    if (!canvas || !empty) return;

    if (!points.some(point => point.miles > 0 || point.minutes > 0)) {
        empty.hidden = false;
        canvas.hidden = true;
        return;
    }

    empty.hidden = true;
    canvas.hidden = false;
    const { context, width, height } = prepareCanvas(canvas);
    const padding = { top: 18, right: 15, bottom: 34, left: 14 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxMiles = Math.max(1, ...points.map(point => point.miles));
    const maxMinutes = Math.max(10, ...points.map(point => point.minutes));
    const slot = chartWidth / points.length;
    const barWidth = Math.min(26, slot * .58);
    drawGrid(context, width, height, padding);

    points.forEach((point, index) => {
        const center = padding.left + slot * (index + .5);
        const milesHeight = chartHeight * point.miles / maxMiles;
        context.fillStyle = "#5b8a54";
        roundedRect(context, center - barWidth / 2, height - padding.bottom - milesHeight, barWidth, milesHeight, 5);
        context.fill();

        if (index === 0 || index === points.length - 1 || index % 2 === 0) {
            context.fillStyle = "#7a8782";
            context.font = "10px Arial";
            context.textAlign = "center";
            context.fillText(shortChartDate(point.date), center, height - 11);
        }
    });

    const timeCoordinates = points.map((point, index) => ({
        x: padding.left + slot * (index + .5),
        y: padding.top + chartHeight * (1 - point.minutes / maxMinutes),
        active: point.minutes > 0,
        ...point
    }));
    canvas._hitPoints = timeCoordinates.filter(point => point.active);
    context.beginPath();
    let lineStarted = false;
    timeCoordinates.forEach(point => {
        if (!point.active) {
            lineStarted = false;
            return;
        }
        if (lineStarted) context.lineTo(point.x, point.y);
        else context.moveTo(point.x, point.y);
        lineStarted = true;
    });
    context.strokeStyle = "#d79a30";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
    timeCoordinates.filter(point => point.active).forEach(point => {
        context.beginPath();
        context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
        context.fillStyle = "#fff";
        context.fill();
        context.strokeStyle = "#d79a30";
        context.lineWidth = 2;
        context.stroke();
    });
}

function renderSummaryData() {
    const daily = readSummaryStorage(summaryDailyStorageKey, { entries: {}, profile: {} });
    const walks = readSummaryStorage(summaryWalkingStorageKey, []);
    const lifestyle = readSummaryStorage(lifestyleSummaryStorageKey, null);
    const savedMcp = readSummaryStorage(summaryMcpStorageKey, null);
    const dates14 = recentDateKeys(14);
    const dates7 = dates14.slice(-7);
    const entries = daily?.entries || {};
    const savedGoal = Number(readSummaryStorage(summaryGoalStorageKey, null));
    const profileGoal = Number(daily?.profile?.motivationalGoal);
    summaryGoalWeight = savedGoal > 0 ? savedGoal : profileGoal > 0 ? profileGoal : 195;

    if (savedMcp?.measurementData && savedMcp?.results) {
        updateMcpDashboard({
            system: savedMcp.measurementData.system,
            enteredWeight: Number(savedMcp.measurementData.enteredWeight),
            enteredWaist: Number(savedMcp.measurementData.enteredWaist),
            results: savedMcp.results
        });
        document.dispatchEvent(new CustomEvent("motionc:mcp-summary-restored", {
            detail: savedMcp
        }));
    }

    const weightPoints = dates14
        .filter(date => Number(entries[date]?.weight) > 0)
        .map(date => ({ date, value: Number(entries[date].weight) }));
    drawWeightChart(weightPoints);

    if (weightPoints.length) {
        const first = weightPoints[0].value;
        const last = weightPoints.at(-1).value;
        const change = last - first;
        setText("display-weight", last.toFixed(1));
        setText("display-weight-unit", "lb");
        setText("weight-change", `${change <= 0 ? "▼" : "▲"} ${Math.abs(change).toFixed(1)} lb over 14 days`);
        setText("weight-chart-summary", `${last.toFixed(1)} lb · ${change > 0 ? "+" : ""}${change.toFixed(1)} lb`);
        setText("weekly-weight-change", `${change > 0 ? "+" : ""}${change.toFixed(1)} lb`);
    }

    const walkArray = Array.isArray(walks) ? walks : [];
    const walkPoints = dates14.map(date => {
        const savedWalks = walkArray.filter(walk => walk.date === date);
        const dailyEntry = entries[date] || {};
        const savedMiles = savedWalks.reduce((total, walk) => total + Number(walk.miles || 0), 0);
        const savedMinutes = savedWalks.reduce((total, walk) => total + Number(walk.minutes || 0), 0);
        return {
            date,
            miles: savedMiles || Number(dailyEntry.distance || 0),
            minutes: savedMinutes || Number(dailyEntry.minutes || 0)
        };
    });
    drawWalkingChart(walkPoints);

    const recentWalks = walkPoints.filter(point => dates7.includes(point.date));
    const weeklyMiles = recentWalks.reduce((total, point) => total + point.miles, 0);
    const weeklyMinutes = recentWalks.reduce((total, point) => total + point.minutes, 0);
    setText("weekly-miles", `${weeklyMiles.toFixed(2)} mi`);
    setText("weekly-minutes", `${Math.round(weeklyMinutes)} min`);
    setText("walking-chart-summary", `${weeklyMiles.toFixed(1)} mi · ${Math.round(weeklyMinutes)} min this week`);

    const waist = Number(daily?.profile?.waist);
    if (waist > 0) setText("display-waist", waist.toFixed(1));
    renderLifestyleSummary(lifestyle);
}

function updateModernMcpDisplay(detail) {
    const eventDetail = detail || {};
    const mcp = Number(eventDetail.results?.mcp);
    const bmi = Number(eventDetail.results?.bmi);
    if (Number.isFinite(mcp)) {
        setText("display-mcp-ring", mcp.toFixed(1));
        setRingValue("mcp-ring", mcp / 50 * 100);
        setText("mcp-status", mcp >= 45 ? "Core zone" : mcp >= 30 ? "Healthy zone" : mcp >= 20 ? "Caution zone" : "At-risk zone");
        setText("momentum-message", mcp >= 30 ? "You’re building healthy momentum. Consistency is doing its quiet work." : "Every small improvement moves the score. Choose one habit to strengthen today.");
    }
    if (Number.isFinite(bmi)) {
        setText("bmi-status", bmi < 18.5 ? "Below healthy range" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Above healthy range" : "High range");
    }
}

document.addEventListener("motionc:mcp-updated", event => {
    if (event.detail?.measurementData && event.detail?.results) {
        localStorage.setItem(summaryMcpStorageKey, JSON.stringify({
            ...event.detail,
            updatedAt: new Date().toISOString()
        }));
    }
    updateModernMcpDisplay(event.detail);
});

document.addEventListener("motionc:mcp-summary-restored", event => {
    updateModernMcpDisplay(event.detail);
});

document.addEventListener("motionc:lifestyle-updated", event => {
    setRingValue("lifestyle-ring", Number(event.detail?.percentage) || 0);
    renderLifestyleSummary(readSummaryStorage(lifestyleSummaryStorageKey, null));
});

window.addEventListener("resize", () => {
    window.clearTimeout(window.motioncSummaryResize);
    window.motioncSummaryResize = window.setTimeout(renderSummaryData, 120);
});

const summaryWeightCanvas = document.getElementById("weight-chart");
let draggingWeightGoal = false;

function updateGoalFromPointer(event) {
    const scale = summaryWeightCanvas?._goalScale;
    if (!scale) return;
    const rect = summaryWeightCanvas.getBoundingClientRect();
    const y = Math.max(scale.top, Math.min(scale.top + scale.height, event.clientY - rect.top));
    const percentage = 1 - (y - scale.top) / scale.height;
    summaryGoalWeight = Math.round((scale.minimum + percentage * (scale.maximum - scale.minimum)) * 10) / 10;
    localStorage.setItem(summaryGoalStorageKey, String(summaryGoalWeight));
    drawWeightChart(summaryWeightPoints);
}

summaryWeightCanvas?.addEventListener("pointerdown", event => {
    const scale = summaryWeightCanvas._goalScale;
    if (!scale) return;
    const rect = summaryWeightCanvas.getBoundingClientRect();
    if (Math.abs(event.clientY - rect.top - scale.goalY) > 18) return;
    draggingWeightGoal = true;
    summaryWeightCanvas.setPointerCapture(event.pointerId);
    updateGoalFromPointer(event);
});

summaryWeightCanvas?.addEventListener("pointermove", event => {
    if (draggingWeightGoal) updateGoalFromPointer(event);
});

summaryWeightCanvas?.addEventListener("pointerup", event => {
    draggingWeightGoal = false;
    if (summaryWeightCanvas.hasPointerCapture(event.pointerId)) {
        summaryWeightCanvas.releasePointerCapture(event.pointerId);
    }
});

function fullChartDate(value) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
    }).format(summaryDate(value));
}

function nearestChartPoint(canvas, event, radius = 12) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let nearest = null;
    let nearestDistance = radius;

    (canvas._hitPoints || []).forEach(point => {
        const distance = Math.hypot(point.x - x, point.y - y);
        if (distance <= nearestDistance) {
            nearest = point;
            nearestDistance = distance;
        }
    });

    return nearest;
}

function positionChartTooltip(tooltip, canvas, point) {
    const wrap = canvas.closest(".chart-wrap");
    if (!wrap) return;
    const canvasRect = canvas.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const tooltipHalfWidth = Math.max(63, tooltip.offsetWidth / 2);
    const left = Math.max(
        tooltipHalfWidth + 4,
        Math.min(wrapRect.width - tooltipHalfWidth - 4, canvasRect.left - wrapRect.left + point.x)
    );
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${canvasRect.top - wrapRect.top + point.y}px`;
}

function attachChartTooltip(canvasId, tooltipId, renderContent) {
    const canvas = document.getElementById(canvasId);
    const tooltip = document.getElementById(tooltipId);
    if (!canvas || !tooltip) return;

    canvas.addEventListener("pointermove", event => {
        if (canvas === summaryWeightCanvas && draggingWeightGoal) {
            tooltip.hidden = true;
            return;
        }

        const point = nearestChartPoint(canvas, event);
        if (!point) {
            tooltip.hidden = true;
            canvas.style.cursor = canvas === summaryWeightCanvas ? "ns-resize" : "default";
            return;
        }

        tooltip.innerHTML = renderContent(point);
        tooltip.hidden = false;
        canvas.style.cursor = "pointer";
        positionChartTooltip(tooltip, canvas, point);
    });

    canvas.addEventListener("pointerleave", () => {
        tooltip.hidden = true;
        canvas.style.cursor = canvas === summaryWeightCanvas ? "ns-resize" : "default";
    });
}

attachChartTooltip(
    "weight-chart",
    "weight-chart-tooltip",
    point => `<strong>${fullChartDate(point.date)}</strong><span>Weight: ${point.value.toFixed(1)} lb</span>`
);

attachChartTooltip(
    "walking-chart",
    "walking-chart-tooltip",
    point => `<strong>${fullChartDate(point.date)}</strong><span>Miles: ${point.miles.toFixed(2)}</span><span>Time: ${Math.round(point.minutes)} min</span>`
);

window.addEventListener("DOMContentLoaded", renderSummaryData);
window.addEventListener("pageshow", renderSummaryData);
