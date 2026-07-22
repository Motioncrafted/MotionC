"use strict";

/*
    MotionC Engine Room
    First working calculation and display layer.

    Temporary starting profile:
    - Age: 65
    - Sex: Male
    - Height: 5 ft 11 in
    - Weight: 200 lb
    - Waist: 40 in

    Next step:
    Replace these temporary values with the user's
    saved Summary-page information.
*/

document.addEventListener("DOMContentLoaded", () => {
    const profile = {
        age: 65,
        sex: "M",
        heightFeet: 5,
        heightInches: 11,
        weightPounds: 200,
        waistInches: 40
    };

    const displays = {
        mcp: document.querySelector("#mcp-display"),
        journey: document.querySelector("#journey-display"),
        bmi: document.querySelector("#bmi-display")
    };

    if (!displays.mcp || !displays.journey || !displays.bmi) {
        console.error("Engine Room display elements were not found.");
        return;
    }

    function poundsToKilograms(pounds) {
        return pounds * 0.453592;
    }

    function inchesToCentimetres(inches) {
        return inches * 2.54;
    }

    function getAgeAdjustment(age) {
        if (age >= 70) return 4;
        if (age >= 60) return 3;
        if (age >= 50) return 2;
        if (age >= 40) return 1;

        return 0;
    }

    function getSexAdjustment(sex) {
        return String(sex).trim().toUpperCase() === "F" ? 1 : 0;
    }

    function calculateMetrics({
        age,
        sex,
        heightFeet,
        heightInches,
        weightPounds,
        waistInches
    }) {
        const totalHeightInches =
            (Number(heightFeet) * 12) + Number(heightInches);

        const heightCentimetres =
            inchesToCentimetres(totalHeightInches);

        const heightMetres =
            heightCentimetres / 100;

        const weightKilograms =
            poundsToKilograms(Number(weightPounds));

        const waistCentimetres =
            inchesToCentimetres(Number(waistInches));

        const bmi =
            weightKilograms / (heightMetres * heightMetres);

        const waistToHeightRatio =
            waistCentimetres / heightCentimetres;

        const bodyMcp50 =
            bmi * waistToHeightRatio * 2;

        const rawMcp =
            bodyMcp50 +
            getSexAdjustment(sex) +
            getAgeAdjustment(Number(age));

        const mcp =
            (2.551 * rawMcp) - 51.53;

        return {
            bmi,
            waistToHeightRatio,
            mcp
        };
    }

    function getMcpRange(mcp) {
        if (mcp < 25) {
            return {
                category: "Core Zone",
                minimum: 0,
                maximum: 25
            };
        }

        if (mcp < 35) {
            return {
                category: "Healthy",
                minimum: 25,
                maximum: 35
            };
        }

        if (mcp < 43) {
            return {
                category: "Elevated",
                minimum: 35,
                maximum: 43
            };
        }

        return {
            category: "Watch Zone",
            minimum: 43,
            maximum: 60
        };
    }

    function calculateJourneyPercentage(mcp) {
        const range = getMcpRange(mcp);

        if (range.category === "Core Zone") {
            return 100;
        }

        const progress =
            ((range.maximum - mcp) /
                (range.maximum - range.minimum)) * 100;

        return Math.max(
            0,
            Math.min(99, Math.round(progress))
        );
    }

    function updateDisplays(metrics) {
        const journeyPercentage =
            calculateJourneyPercentage(metrics.mcp);

        displays.mcp.textContent =
            metrics.mcp.toFixed(1);

        displays.journey.textContent =
            `${journeyPercentage}%`;

        displays.bmi.textContent =
            metrics.bmi.toFixed(1);
    }

    const metrics = calculateMetrics(profile);

    updateDisplays(metrics);

    console.log("MotionC Engine Room metrics:", {
        MCP: metrics.mcp.toFixed(1),
        BMI: metrics.bmi.toFixed(1),
        journey: `${calculateJourneyPercentage(metrics.mcp)}%`,
        WHtR: metrics.waistToHeightRatio.toFixed(2)
    });
});
