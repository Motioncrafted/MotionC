// Demo-only extraction from the locked Summary. No member controller imports.
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
const DAILY_TREND_CONFIG = {
    hydration: { label: "Hydration", unit: "oz", maximum: 160, color: "#0872b9" },
    stress: { label: "Stress", unit: "of 5", maximum: 5, color: "#d94d48" },
    sleep: { label: "Sleep", unit: "hours", maximum: 12, color: "#3d68ae" }
};
function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function svgNode(name, attributes = {}) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
}

function appendSignalSegments(svg, points, key, color) {
    let segment = [];
    const flush = () => {
        if (!segment.length) return;
        if (segment.length > 1) {
            svg.append(svgNode("polyline", {
                points: segment.map(point => `${point.x},${point.y}`).join(" "),
                fill: "none", stroke: color, "stroke-width": "2.5",
                "stroke-linecap": "round", "stroke-linejoin": "round"
            }));
        }
        segment.forEach(point => svg.append(svgNode("circle", {
            cx: point.x, cy: point.y, r: "2.3", fill: "white",
            stroke: color, "stroke-width": "1.7"
        })));
        segment = [];
    };
    points.forEach(point => {
        if (point[key] === null) return flush();
        segment.push({ x: point.x, y: 34 - point[key] * 6 });
    });
    flush();
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
        const level = Number.isFinite(numeric) ? Math.max(0, Math.min(2, Math.round(numeric * 3) - 1)) : -1;
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
    if (Number.isFinite(summaryMotivationalWeight)) values.push(summaryMotivationalWeight);
    if (Number.isFinite(summaryVibratoryWeight)) values.push(summaryVibratoryWeight);
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

    const lineY = value => padding.top + chartHeight * (1 - (value - minimum) / (maximum - minimum));
    const drawMarkerLine = ({ value, color, dash, text, fill, textColor, side = "right" }) => {
        if (!Number.isFinite(value)) return null;
        const y = lineY(value);
        context.save();
        context.setLineDash(dash);
        context.beginPath();
        context.moveTo(padding.left, y);
        context.lineTo(width - padding.right, y);
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.stroke();
        context.restore();
        context.font = "bold 10px Arial";
        const labelWidth = context.measureText(text).width + 14;
        const labelX = side === "left" ? padding.left : width - padding.right - labelWidth;
        context.fillStyle = fill;
        roundedRect(context, labelX, y - 20, labelWidth, 17, 7);
        context.fill();
        context.fillStyle = textColor;
        context.textAlign = "center";
        context.fillText(text, labelX + labelWidth / 2, y - 8);
        return y;
    };

    const latestWeight = points.at(-1)?.value;
    const remaining = Number.isFinite(latestWeight) && Number.isFinite(summaryGoalWeight)
        ? latestWeight - summaryGoalWeight
        : null;
    const realGoalProgress = remaining === null
        ? ""
        : remaining > 0
            ? ` · ${remaining.toFixed(1)} ${summaryWeightUnit()} to go`
            : remaining < 0
                ? ` · ${Math.abs(remaining).toFixed(1)} ${summaryWeightUnit()} under`
                : " · Goal reached";
    const vibratoryY = drawMarkerLine({
        value: summaryVibratoryWeight,
        color: "#d19a2d",
        dash: [7, 5],
        text: `VZ ${summaryVibratoryWeight?.toFixed(1)} ${summaryWeightUnit()}`,
        fill: "#fff4d2",
        textColor: "#8c6415",
        side: "left"
    });
    const motivationalY = drawMarkerLine({
        value: summaryMotivationalWeight,
        color: "#3578b8",
        dash: [],
        text: `Motivational ${summaryMotivationalWeight?.toFixed(1)} ${summaryWeightUnit()}`,
        fill: "#eaf3fc",
        textColor: "#245c91",
        side: "right"
    });
    const realY = drawMarkerLine({
        value: summaryGoalWeight,
        color: "#169b62",
        dash: [3, 5],
        text: `Goal ${summaryGoalWeight?.toFixed(1)} ${summaryWeightUnit()}${realGoalProgress}`,
        fill: "#e4f7ed",
        textColor: "#087348",
        side: "left"
    });
    canvas._goalScale = { minimum, maximum, top: padding.top, height: chartHeight, realY, motivationalY, vibratoryY };
    setText("real-goal-weight-label", Number.isFinite(summaryGoalWeight) ? `Real Goal: ${summaryGoalWeight.toFixed(1)} ${summaryWeightUnit()}${realGoalProgress}` : "Real Goal: —");
    setText("motivational-goal-weight-label", Number.isFinite(summaryMotivationalWeight) ? `Motivational Goal: ${summaryMotivationalWeight.toFixed(1)} ${summaryWeightUnit()}` : "Motivational Goal: —");
    setText("vibratory-weight-label", Number.isFinite(summaryVibratoryWeight) ? `VZ: ${summaryVibratoryWeight.toFixed(1)} ${summaryWeightUnit()}` : "VZ: —");

    context.fillStyle = "#7a8782";
    context.font = "10px Arial";
    context.textAlign = "center";
    coordinates.forEach((point, index) => {
        if (index === 0 || index === coordinates.length - 1 || (index % 3 === 0 && index < coordinates.length - 2)) {
            context.textAlign = index === 0 ? "left" : index === coordinates.length - 1 ? "right" : "center";
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
    const walkColors = ["#5b8a54", "#78a371", "#96b78f", "#b4ccae"];
    drawGrid(context, width, height, padding);

    points.forEach((point, index) => {
        const center = padding.left + slot * (index + .5);
        const milesHeight = chartHeight * point.miles / maxMiles;
        const barLeft = center - barWidth / 2;
        const barTop = height - padding.bottom - milesHeight;
        const segments = Array.isArray(point.walks) && point.walks.length
            ? point.walks.filter(distance => distance > 0)
            : point.miles > 0 ? [point.miles] : [];
        const segmentTotal = segments.reduce((total, distance) => total + distance, 0);

        if (milesHeight > 0 && segmentTotal > 0) {
            context.save();
            roundedRect(context, barLeft, barTop, barWidth, milesHeight, 5);
            context.clip();
            let segmentBottom = height - padding.bottom;
            segments.forEach((distance, walkIndex) => {
                const segmentHeight = milesHeight * distance / segmentTotal;
                const segmentTop = segmentBottom - segmentHeight;
                context.fillStyle = walkColors[Math.min(walkIndex, walkColors.length - 1)];
                context.fillRect(barLeft, segmentTop, barWidth, segmentHeight + .5);
                if (walkIndex > 0) {
                    context.fillStyle = "rgba(255, 255, 255, .72)";
                    context.fillRect(barLeft, segmentBottom - .5, barWidth, 1);
                }
                segmentBottom = segmentTop;
            });
            context.restore();
        }

        if (index === 0 || index === points.length - 1 || (index % 3 === 0 && index < points.length - 2)) {
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

function formatDailyTrendValue(value, key = "") {
    if (key === "sleep") return Number(value).toFixed(2);
    if (key === "hydration") return String(Math.round(Number(value)));
    return Number(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function dailyTrendUnit(key, config = DAILY_TREND_CONFIG[key]) {
    return key === "hydration" && summaryUnitSystem === "metric" ? "mL" : config.unit;
}

function dailyTrendValue(key, saved) {
    if (!saved || !Number.isFinite(Number(saved.value))) return null;
    if (key !== "hydration") return Number(saved.value);
    const ounces = saved.unit === "oz" ? Number(saved.value) : Number(saved.value) * 10;
    return summaryUnitSystem === "metric" ? ounces * summaryMlPerFlOz : ounces;
}

function drawDailyGaugeTrend(key, dates, gauges) {
    const baseConfig = DAILY_TREND_CONFIG[key];
    const config = key === "hydration" && summaryUnitSystem === "metric"
        ? { ...baseConfig, unit: "mL", maximum: Math.round(baseConfig.maximum * summaryMlPerFlOz) }
        : baseConfig;
    const canvas = document.getElementById(`${key}-trend-chart`);
    const empty = document.getElementById(`${key}-trend-empty`);
    if (!canvas || !empty) return;
    const points = dates.map(date => {
        const saved = gauges?.[date]?.[key];
        return { date, value: dailyTrendValue(key, saved) };
    });
    const recorded = points.filter(point => point.value !== null);
    if (!recorded.length) {
        empty.hidden = false;
        canvas.hidden = true;
        setText(`${key}-trend-summary`, key === "sleep" ? "No recorded entries" : "No completed entries");
        return;
    }

    empty.hidden = true;
    canvas.hidden = false;
    const { context, width, height } = prepareCanvas(canvas);
    const padding = { top: 18, right: 14, bottom: 34, left: 24 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const slot = chartWidth / points.length;
    drawGrid(context, width, height, padding);

    const coordinates = points.map((point, index) => ({
        ...point,
        x: padding.left + slot * (index + .5),
        y: point.value === null ? null : padding.top + chartHeight * (1 - Math.min(config.maximum, point.value) / config.maximum)
    }));
    canvas._hitPoints = coordinates.filter(point => point.value !== null);

    context.beginPath();
    let segmentStarted = false;
    coordinates.forEach(point => {
        if (point.value === null) {
            segmentStarted = false;
            return;
        }
        if (segmentStarted) context.lineTo(point.x, point.y);
        else context.moveTo(point.x, point.y);
        segmentStarted = true;
    });
    context.strokeStyle = config.color;
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();

    coordinates.forEach((point, index) => {
        if (point.value === null) {
            context.beginPath();
            context.arc(point.x, height - padding.bottom, 2, 0, Math.PI * 2);
            context.fillStyle = "#cbd4d1";
            context.fill();
        } else {
            context.beginPath();
            context.arc(point.x, point.y, 4, 0, Math.PI * 2);
            context.fillStyle = "#fff";
            context.fill();
            context.strokeStyle = config.color;
            context.lineWidth = 2;
            context.stroke();
        }
        if (index === 0 || index === coordinates.length - 1 || index % 4 === 0) {
            context.fillStyle = "#7a8782";
            context.font = "9px Arial";
            context.textAlign = "center";
            context.fillText(shortChartDate(point.date), point.x, height - 11);
        }
    });

    context.fillStyle = "#7a8782";
    context.font = "9px Arial";
    context.textAlign = "left";
    context.fillText(String(config.maximum), 2, padding.top + 3);
    context.fillText("0", 8, height - padding.bottom + 3);

    const average = recorded.reduce((sum, point) => sum + point.value, 0) / recorded.length;
    setText(`${key}-trend-summary`, `${formatDailyTrendValue(average, key)} ${config.unit} avg · ${recorded.length} recorded`);
}

function updateModernMcpDisplay(detail) {
    const eventDetail = detail || {};
    const mcp = Number(eventDetail.results?.mcp);
    const bmi = Number(eventDetail.results?.bmi);
    if (Number.isFinite(mcp)) {
        const gauge = document.getElementById("mcp-ring");
        const zone = mcp < 25
            ? { key: "core", label: "Core Zone" }
            : mcp < 35
                ? { key: "healthy", label: "Healthy Zone" }
                : mcp < 43
                    ? { key: "elevated", label: "Elevated Zone" }
                    : { key: "watch", label: "Watch Zone" };

        setText("display-mcp-ring", mcp.toFixed(1));
        setText("mcp-zone-status", zone.label);
        if (gauge) {
            gauge.classList.remove("zone-core", "zone-healthy", "zone-elevated", "zone-watch");
            gauge.classList.add("is-assessed", `zone-${zone.key}`);
            const markerAngle = 195 + ((60 - Math.max(0, Math.min(60, mcp))) / 60 * 330);
            gauge.style.setProperty("--mcp-marker-angle", `${markerAngle}deg`);
            gauge.setAttribute("aria-label", `MCP ${mcp.toFixed(1)}, ${zone.label}`);
        }
        setText("momentum-message", mcp >= 30 ? "You’re building healthy momentum. Consistency is doing its quiet work." : "Every small improvement moves the score. Choose one habit to strengthen today.");
    }
    if (Number.isFinite(bmi)) {
        setText("bmi-status", bmi < 18.5 ? "Underweight range" : bmi < 25 ? "Healthy weight range" : bmi < 30 ? "Overweight range" : "Obesity range");
    }
}
