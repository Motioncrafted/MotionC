"use strict";

/*
    MotionC Engine Room

    Current milestone:
    - MCP display works
    - Journey display works
    - BMI display works
    - Weight Only slider changes all three values

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
        weightPounds: 196.5,
        waistInches: 40
    };

    const baseline = Object.freeze({ ...profile });

    const displays = {
        mcp: document.querySelector("#mcp-display"),
        journey: document.querySelector("#journey-display"),
        bmi: document.querySelector("#bmi-display"),
        weightTest: document.querySelector("#weight-test-display"),
        waistTest: document.querySelector("#waist-test-display"),
        combinedChange: document.querySelector("#combined-change-display"),
        combinedImpact: document.querySelector("#combined-impact-display"),
        weightImpact: document.querySelector("#weight-impact-display"),
        waistImpact: document.querySelector("#waist-impact-display")
    };

    const activeTierIndicator =
        document.querySelector("#active-tier-indicator");

    const activeTierLabel =
        document.querySelector("#active-tier-label");

    const activeTierTooltip =
        document.querySelector("#active-tier-tooltip");

    const combinedSlider =
        document.querySelector("#combined-slider");

    const combinedSliderArea =
        document.querySelector(".combined-slider-area");

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
        !displays.combinedChange ||
        !displays.combinedImpact ||
        !displays.weightImpact ||
        !displays.waistImpact ||
        !activeTierIndicator ||
        !activeTierLabel ||
        !activeTierTooltip ||
        !combinedSlider ||
        !combinedSliderArea ||
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

    const tierPresentation = {
        "Core Zone": {
            top: "79.15%",
            slogan: "Optimal range; maintain strong habits."
        },
        "Healthy": {
            top: "83.25%",
            slogan: "Good balance. Small improvements move you toward Core."
        },
        "Elevated": {
            top: "87.35%",
            slogan: "Early signal; consistent changes have high impact."
        },
        "Watch Zone": {
            top: "91.45%",
            slogan: "Point of concern; increased physiological strain."
        }
    };

    function updateActiveTier(mcp) {
        const category = getMcpRange(mcp).category;
        const presentation = tierPresentation[category];

        activeTierIndicator.style.setProperty(
            "--active-tier-top",
            presentation.top
        );
        activeTierIndicator.setAttribute(
            "data-active-tier",
            category
        );
        activeTierLabel.textContent = category;
        activeTierTooltip.textContent = presentation.slogan;
        activeTierIndicator.setAttribute(
            "aria-label",
            `${category}: ${presentation.slogan}`
        );
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
            `${profile.waistInches.toFixed(1)}"`;
    }

    function updateSliderHandle() {
        const minimum =
            Number(weightSlider.min);

        const maximum =
            Number(weightSlider.max);

        const currentValue =
            Number(weightSlider.value);

        const percentage =
            (
                (currentValue - minimum) /
                (maximum - minimum)
            ) * 100;

        weightSliderArea.style.setProperty(
            "--weight-slider-position",
            `${percentage}%`
        );
    }

    function updateCombinedSliderHandle() {
        const minimum = Number(combinedSlider.min);
        const maximum = Number(combinedSlider.max);
        const currentValue = Number(combinedSlider.value);
        const percentage =
            ((currentValue - minimum) / (maximum - minimum)) * 100;

        combinedSliderArea.style.setProperty(
            "--combined-slider-position",
            `${percentage}%`
        );
    }
    function updateWaistSliderHandle() {
        const minimum =
            Number(waistSlider.min);

        const maximum =
            Number(waistSlider.max);

        const currentValue =
            Number(waistSlider.value);

        const percentage =
            (
                (currentValue - minimum) /
                (maximum - minimum)
            ) * 100;

        waistSliderArea.style.setProperty(
            "--waist-slider-position",
            `${percentage}%`
        );
    }
    function signed(value) {
        return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
    }

    /*
        Impact model imported from the Obsidian Scenario Explorer.

        Negative impact is beneficial because it lowers MCP.
        Weight contributes 0.4 impact points per pound.
        Waist contributes 2.0 impact points per inch.
    */
    function computeImpactArrows(weightDelta, waistDelta) {
        const weightImpact = weightDelta * 0.4;
        const waistImpact = waistDelta * 2.0;
        const totalImpact = weightImpact + waistImpact;

        function classify(value) {
            if (value <= -2) {
                return {
                    arrow: "↓↓",
                    color: "#51cf66",
                    label: "strong improvement"
                };
            }

            if (value < 0) {
                return {
                    arrow: "↓",
                    color: "#51cf66",
                    label: "improvement"
                };
            }

            if (value === 0) {
                return {
                    arrow: "→",
                    color: "#f2c94c",
                    label: "no change"
                };
            }

            if (value <= 2) {
                return {
                    arrow: "↑",
                    color: "#ff6b6b",
                    label: "increase"
                };
            }

            return {
                arrow: "↑↑",
                color: "#ff6b6b",
                label: "strong increase"
            };
        }

        return {
            weight: classify(weightImpact),
            waist: classify(waistImpact),
            combined: classify(totalImpact)
        };
    }

    function impactMarkup(impact) {
        return [
            `<span style="color:${impact.color};`,
            `text-shadow:0 0 7px ${impact.color};">●</span>`,
            `<span style="color:${impact.color};">${impact.arrow}</span>`
        ].join(" ");
    }

    function updateScenarioDisplays() {
        const weightChange =
            profile.weightPounds - baseline.weightPounds;
        const waistChange =
            profile.waistInches - baseline.waistInches;
        const arrows =
            computeImpactArrows(weightChange, waistChange);

        displays.combinedChange.innerHTML =
            `${signed(weightChange)} lb<br>${signed(waistChange)}"`;
        displays.combinedImpact.innerHTML =
            impactMarkup(arrows.combined);
        displays.weightImpact.innerHTML =
            impactMarkup(arrows.weight);
        displays.waistImpact.innerHTML =
            impactMarkup(arrows.waist);

        displays.combinedImpact.setAttribute(
            "aria-label",
            `Combined impact: ${arrows.combined.label}`
        );
        displays.weightImpact.setAttribute(
            "aria-label",
            `Weight impact: ${arrows.weight.label}`
        );
        displays.waistImpact.setAttribute(
            "aria-label",
            `Waist impact: ${arrows.waist.label}`
        );
    }

    function runSimulation() {
        try {
            const metrics =
                calculateMetrics(profile);

            updateDisplays(metrics);
            updateSliderHandle();
            updateWaistSliderHandle();
            updateCombinedSliderHandle();
            updateScenarioDisplays();
            updateActiveTier(metrics.mcp);
            console.log(
                "MotionC Weight Simulation:",
                {
                    weight:
                        profile.weightPounds.toFixed(1),

                    MCP:
                        metrics.mcp.toFixed(1),

                    BMI:
                        metrics.bmi.toFixed(1),

                    journey:
                        `${calculateJourneyPercentage(
                            metrics.mcp
                        )}%`,

                    WHtR:
                        metrics.waistToHeightRatio.toFixed(2)
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
        Recalculate continuously while the slider moves.

        The input event supports:
        - mouse
        - touch
        - keyboard arrows
    */
    weightSlider.addEventListener(
        "input",
        () => {
            profile.weightPounds =
                Number(weightSlider.value);

            combinedSlider.value = "0";

            runSimulation();
        }
    );

    waistSlider.addEventListener("input", () => {
        profile.waistInches =
            Number(waistSlider.value);

        combinedSlider.value = "0";

        runSimulation();
    });

    combinedSlider.addEventListener("input", () => {
        const change = Number(combinedSlider.value);

        profile.weightPounds =
            baseline.weightPounds + change;
        profile.waistInches =
            baseline.waistInches + (change / 5);

        weightSlider.value =
            String(profile.weightPounds);
        waistSlider.value =
            String(profile.waistInches);

        runSimulation();
    });
    
    /*
        Starting state.
    */
    weightSlider.value =
        String(profile.weightPounds);

    waistSlider.value =
        String(profile.waistInches);

    runSimulation();
});
