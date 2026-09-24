// Demo-only extraction from the locked Summary. No member controller imports.
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

function median(values) {
    if (!values.length) return null;
    const ordered = [...values].sort((a, b) => a - b);
    const middle = Math.floor(ordered.length / 2);
    return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function personalStepsPerMile(entries) {
    const samples = Object.values(entries)
        .flatMap(entry => Array.isArray(entry.walks) && entry.walks.length ? entry.walks : [entry])
        .filter(walk => Number(walk.steps) > 0 && Number(walk.distance) > 0)
        .map(walk => Number(walk.steps) / Number(walk.distance))
        .filter(rate => rate >= 1400 && rate <= 3000);
    return samples.length >= 3 ? median(samples) : 2050;
}

function stepResult(entry, entries) {
    const walks = Array.isArray(entry?.walks) ? entry.walks : [];
    if (walks.length) {
        const rate = personalStepsPerMile(entries);
        const measured = walks.every(walk => Number(walk.steps) > 0);
        const value = walks.reduce((total, walk) => total + (Number(walk.steps) > 0
            ? Math.round(Number(walk.steps))
            : Math.round(Number(walk.distance || 0) * rate / 10) * 10), 0);
        return value > 0 ? { value, measured } : null;
    }
    if (Number(entry?.steps) > 0) return { value: Math.round(Number(entry.steps)), measured: true };
    const miles = Number(entry?.distance || 0);
    if (!(miles > 0)) return null;
    return { value: Math.round(miles * personalStepsPerMile(entries) / 10) * 10, measured: false };
}

function measuredWalkingDay(entry) {
    const distance = Number(entry?.distance);
    const minutes = Number(entry?.minutes);
    const walkingHr = Number(entry?.walkingHr);
    if (!(distance > 0 && minutes >= 15 && walkingHr > 0)) return null;
    const pace = minutes / distance;
    if (!(pace >= 12 && pace <= 30)) return null;
    return { date: entry.date, walkingHr, pace, minutes };
}

function bodyLevel(delta) {
    if (delta <= 0) return 0;
    if (delta <= 2) return 1;
    if (delta <= 5) return 2;
    if (delta <= 8) return 3;
    if (delta <= 12) return 4;
    return 5;
}

function bodySignalForDay(day, earlierDays) {
    const recent = earlierDays.slice(-28);
    const comparable = recent.filter(candidate =>
        Math.abs(candidate.pace - day.pace) <= Math.max(1.5, day.pace * .1)
    );
    if (comparable.length < 3) return null;
    const baseline = median(comparable.map(candidate => candidate.walkingHr));
    return {
        value: bodyLevel(day.walkingHr - baseline),
        baseline,
        samples: comparable.length
    };
}

function stressSignalsMessage(points, baselineSamples) {
    const paired = points.filter(point => point.felt !== null && point.body !== null);
    if (baselineSamples < 3) return "Building your Body baseline.";
    if (!paired.length) return "More measured walks will connect the signals.";
    const bodyHigher = paired.filter(point => point.body > point.felt).length;
    const feltHigher = paired.filter(point => point.felt > point.body).length;
    if (bodyHigher > feltHigher && bodyHigher >= 2) return `Body ran higher on ${bodyHigher} of ${paired.length} days.`;
    if (feltHigher > bodyHigher && feltHigher >= 2) return `Felt ran higher on ${feltHigher} of ${paired.length} days.`;
    return "Felt and Body moved together this week.";
}
