"use strict";

/*
    MotionC Engine Room

    Current milestone:
    - MCP display works
    - Journey display works
    - BMI display works
    - Weight Only slider changes weight
    - Waist Only slider changes waist

    Temporary starting profile:
    - Age: 65
    - Sex: Male
    - Height: 5 ft 11 in
    - Weight: 200 lb
    - Waist: 40 in
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
        bmi: document.querySelector("#bmi-display"),
        weightTest: document.querySelector("#weight-test-display"),
        waistTest: document.querySelector("#waist-test-display")
    };

    const weightSlider =
        document.querySelector("#weight-slider");

    const weightSliderArea =
        document.querySelector(".weight-slider-area");

    const waistSlider =
        document.querySelector("#waist-slider");

    const waistSliderArea =
        document.querySelector(".waist-slider-area");

    if (
        !displays.mcp ||
        !displays.journey ||
        !displays.bmi ||
        !displays.weightTest ||
        !displays.waistTest ||
        !weightSlider ||
        !weightSliderArea ||
        !waistSlider ||
        !waistSliderArea
    ) {
        console.error(
            "One or more Engine Room controls were not found."
        );

        return;
    }

    function poundsToKilograms(pounds) {
        return Number(pounds) * 0.453592;
    }

    function inchesToCentimetres(inches) {
        return Number(inches) * 2.54;
    }

    function getAgeAdjustment(age) {
        const numericAge = Number(age);

        if (numericAge >= 70) return 4;
        if (numericAge >= 60) return 3;
        if (numericAge >= 50) return 2;
        if (numericAge >= 40) return 1;

        return 0;
    }

    function getSexAdjustment(sex) {
        return String(sex)
            .trim()
            .toUpperCase() === "F"
            ? 1
            : 0;
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
            (Number(heightFeet) * 12) +
            Number(heightInches);

        if (
            totalHeightInches <= 0 ||
            Number(weightPounds) <= 0 ||
            Number(waistInches) <= 0
        ) {
            throw new Error(
                "Height, weight and waist must be greater than zero."
            );
        }

        const heightCentimetres =
            inchesToCentimetres(totalHeightInches);

        const heightMetres =
            heightCentimetres / 100;

        const weightKilograms =
            poundsToKilograms(weightPounds);

        const waistCentimetres =
            inchesToCentimetres(waistInches);

        const bmi =
            weightKilograms /
            (heightMetres * heightMetres);

        const waistToHeightRatio =
            waistCentimetres /
            heightCentimetres;

        const bodyMcp50 =
            bmi *
            waistToHeightRatio *
            2;

        const rawMcp =
            bodyMcp50 +
            getSexAdjustment(sex) +
            getAgeAdjustment(age);

        const mcp =
            (2.551 * rawMcp) -
            51.53;

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
            (
                (range.maximum - mcp) /
                (range.maximum - range.minimum)
            ) * 100;

        return Math.max(
            0,
            Math.min(
                99,
                Math.round(progress)
            )
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

        displays.weightTest.textContent =
            profile.weightPounds.toFixed(1);

        displays.waistTest.textContent =
            `${profile.waistInches.toFixed(2)}"`;
    }

    function getSliderPercentage(slider) {
        const minimum =
            Number(slider.min);

        const maximum =
            Number(slider.max);

        const currentValue =
            Number(slider.value);

        return (
            (currentValue - minimum) /
            (maximum - minimum)
        ) * 100;
    }

    function updateWeightSliderHandle() {
        const percentage =
            getSliderPercentage(weightSlider);

        weightSliderArea.style.setProperty(
            "--weight-slider-position",
            `${percentage}%`
        );
    }

    function updateWaistSliderHandle() {
        const percentage =
            getSliderPercentage(waistSlider);

        waistSliderArea.style.setProperty(
            "--waist-slider-position",
            `${percentage}%`
        );
    }

    function runSimulation() {
        try {
            const metrics =
                calculateMetrics(profile);

            updateDisplays(metrics);
            updateWeightSliderHandle();
            updateWaistSliderHandle();

            console.log(
                "MotionC Engine Room Simulation:",
                {
                    weight:
                        profile.weightPounds.toFixed(1),

                    waist:
                        profile.waistInches.toFixed(2),

                    MCP:
                        metrics.mcp.toFixed(1),

                    BMI:
                        metrics.bmi.toFixed(1),

                    journey:
                        `${calculateJourneyPercentage(
                            metrics.mcp
                        )}%`,

                    WHtR:
                        metrics.waistToHeightRatio.toFixed(3)
                }
            );
        } catch (error) {
            console.error(
                "Engine Room calculation failed:",
                error
            );
        }
    }

    /*
        Weight Only slider
    */
    weightSlider.addEventListener(
        "input",
        () => {
            profile.weightPounds =
                Number(weightSlider.value);

            runSimulation();
        }
    );

    /*
        Waist Only slider

        Waist affects:
        - WHtR
        - MCP
        - Journey

        Waist does not affect BMI.
    */
    waistSlider.addEventListener(
        "input",
        () => {
            profile.waistInches =
                Number(waistSlider.value);

            runSimulation();
        }
    );

    /*
        Starting state
    */
    weightSlider.value =
        String(profile.weightPounds);

    waistSlider.value =
        String(profile.waistInches);

    runSimulation();
});
