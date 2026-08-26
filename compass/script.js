(() => {
  "use strict";

  const STORAGE_KEY = "motionc-daily-prototype-v1";
  const CONFIG = Object.freeze({
    lookbackDays: 14,
    bodyLookbackDays: 35,
    recencyDays: 14,
    weights: Object.freeze({ movement: 0.32, recovery: 0.26, support: 0.24, bodyTrend: 0.18 }),
    movement: Object.freeze({ targetDays: 5, targetMinutes: 210, targetStreak: 5 }),
    recovery: Object.freeze({ sleepTargetHours: 7.5, stressLow: 1, stressHigh: 5 }),
    support: Object.freeze({ hydrationTargetOunces: 80 }),
    body: Object.freeze({ stableWeightPercent: 0.006, meaningfulWeightPercent: 0.015, goalRangePounds: 4 }),
    confidence: Object.freeze({ directionMinimum: 0.35, medium: 0.5, high: 0.75, vectorMinimum: 0.12 })
  });

  const clamp = (value, min = -1, max = 1) => Math.min(max, Math.max(min, value));
  const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const round = value => Math.round(value * 1000) / 1000;
  const dateValue = date => new Date(`${date}T12:00:00`);
  const daysAgo = date => Math.floor((Date.now() - dateValue(date).getTime()) / 86400000);
  const recentDate = (date, days) => daysAgo(date) >= 0 && daysAgo(date) <= days;
  const finite = value => Number.isFinite(Number(value));

  function referenceFixture() {
    const iso = offset => { const date = new Date(); date.setDate(date.getDate() - offset); return date.toISOString().slice(0, 10); };
    const entries = {}, dailyGauges = {};
    for (let offset = 0; offset < 7; offset += 1) {
      const date = iso(offset);
      entries[date] = { date, minutes: offset === 0 ? 65 : 35, distance: 3, weight: 180 };
      dailyGauges[date] = { hydration: { value: 90 }, sleep: { value: 7.5 }, stress: { value: 1 } };
    }
    return { entries, dailyGauges, weeks: { [iso(0)]: { assessed: true, lifestyleScale: 3, updatedAt: new Date().toISOString(), values: { nutrition: 3, alcohol: 3, smoking: 3, sleep: 3, hydration: 3, activity: 3, stress: 3, movement: 3 } } }, profile: { realGoal: 180, waist: 35 } };
  }

  function loadState() {
    if (new URLSearchParams(location.search).get("fixture") === "reference") return referenceFixture();
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return { entries: state.entries || {}, weeks: state.weeks || {}, profile: state.profile || {}, dailyGauges: state.dailyGauges || {} };
    } catch {
      return { entries: {}, weeks: {}, profile: {}, dailyGauges: {} };
    }
  }

  function streakFor(entries) {
    const walkingDates = new Set(entries.filter(item => item.minutes > 0 || item.distance > 0).map(item => item.date));
    if (!walkingDates.size) return 0;
    let cursor = new Date(); cursor.setHours(12,0,0,0);
    const today = cursor.toISOString().slice(0,10);
    if (!walkingDates.has(today)) cursor.setDate(cursor.getDate()-1);
    let streak = 0;
    while (walkingDates.has(cursor.toISOString().slice(0,10))) { streak += 1; cursor.setDate(cursor.getDate()-1); }
    return streak;
  }

  function movementDriver(state) {
    const entries = Object.entries(state.entries).map(([date, entry]) => ({ date, minutes: Number(entry.minutes || 0), distance: Number(entry.distance || 0) })).filter(item => recentDate(item.date, CONFIG.lookbackDays));
    const walking = entries.filter(item => item.minutes > 0 || item.distance > 0);
    const days = walking.length;
    const minutes = walking.reduce((sum, item) => sum + item.minutes, 0);
    const streak = streakFor(entries);
    const available = walking.length > 0;
    const normalized = available ? clamp(((days / CONFIG.movement.targetDays) + (minutes / CONFIG.movement.targetMinutes) + (streak / CONFIG.movement.targetStreak)) / 3 * 2 - 1) : null;
    return { key:"movement", available, score:normalized, vector:{ x:0, y:available ? normalized * CONFIG.weights.movement : 0 }, completeness:available ? clamp(days / CONFIG.movement.targetDays,0,1) : 0, inputs:{ walkingDays:days, walkingMinutes:minutes, streakDays:streak, lookbackDays:CONFIG.lookbackDays }, ignored:[] };
  }

  function gaugeSamples(state, key) {
    return Object.entries(state.dailyGauges).filter(([date,gauges]) => recentDate(date,CONFIG.lookbackDays) && finite(gauges?.[key]?.value)).map(([date,gauges]) => ({date,value:Number(gauges[key].value)})).sort((a,b)=>a.date.localeCompare(b.date));
  }

  function recoveryDriver(state) {
    const sleep = gaugeSamples(state,"sleep"), stress = gaugeSamples(state,"stress");
    const sleepAvg = average(sleep.map(item=>item.value)), stressAvg = average(stress.map(item=>item.value));
    const pressures = [];
    if (sleepAvg !== null) pressures.push(clamp((CONFIG.recovery.sleepTargetHours - sleepAvg) / CONFIG.recovery.sleepTargetHours,0,1));
    if (stressAvg !== null) pressures.push(clamp((stressAvg-CONFIG.recovery.stressLow)/(CONFIG.recovery.stressHigh-CONFIG.recovery.stressLow),0,1));
    const pressure = average(pressures);
    const available = pressure !== null;
    return { key:"recovery", available, score:pressure, vector:{x:available ? pressure*CONFIG.weights.recovery:0,y:0}, completeness:clamp((Math.min(sleep.length,7)+Math.min(stress.length,7))/14,0,1), inputs:{sleepAverageHours:sleepAvg===null?null:round(sleepAvg),sleepDays:sleep.length,stressAverage:stressAvg===null?null:round(stressAvg),stressDays:stress.length}, ignored:[] };
  }

  function latestWeek(state) {
    return Object.entries(state.weeks).filter(([,week])=>week?.assessed!==false && week?.values).sort((a,b)=>String(b[1].updatedAt||b[0]).localeCompare(String(a[1].updatedAt||a[0])))[0] || null;
  }

  function supportDriver(state) {
    const hydration = gaugeSamples(state,"hydration");
    const hydrationAvg = average(hydration.map(item=>item.value));
    const week = latestWeek(state);
    const values = week?.[1]?.values || {};
    const scale = week?.[1]?.lifestyleScale===3 ? 3 : 1;
    const nonDuplicateKeys = ["nutrition","alcohol","smoking"];
    const lifestyleValues = nonDuplicateKeys.filter(key=>finite(values[key])).map(key=>scale===3 ? Number(values[key])/3 : Number(values[key]));
    const parts=[];
    if(hydrationAvg!==null) parts.push(clamp(hydrationAvg/CONFIG.support.hydrationTargetOunces*2-1));
    if(lifestyleValues.length) parts.push(clamp(average(lifestyleValues)*2-1));
    const score=average(parts), available=score!==null;
    const ignored=["Lifestyle sleep excluded (Recovery)","Lifestyle stress excluded (Recovery)","Lifestyle activity/movement excluded (Movement)"];
    return {key:"support",available,score,vector:{x:0,y:available?score*CONFIG.weights.support:0},completeness:clamp(((hydration.length?1:0)+(lifestyleValues.length/nonDuplicateKeys.length))/2,0,1),inputs:{hydrationAverageOunces:hydrationAvg===null?null:round(hydrationAvg),hydrationDays:hydration.length,lifestyleWeek:week?.[0]||null,nonDuplicateLifestyle:Object.fromEntries(nonDuplicateKeys.map(key=>[key,finite(values[key])?round(scale===3?Number(values[key])/3:Number(values[key])):null]))},ignored};
  }

  function bodyTrendDriver(state) {
    const weights=Object.entries(state.entries).filter(([date,entry])=>recentDate(date,CONFIG.bodyLookbackDays)&&finite(entry.weight)&&Number(entry.weight)>0).map(([date,entry])=>({date,value:Number(entry.weight)})).sort((a,b)=>a.date.localeCompare(b.date));
    const goal=Number(state.profile.realGoal||0); let score=null,description="Need at least two recent weight measurements";
    if(weights.length>=2){const first=weights[0].value,last=weights.at(-1).value,change=(last-first)/first; if(Math.abs(change)<=CONFIG.body.stableWeightPercent){score=goal>0&&Math.abs(last-goal)<=CONFIG.body.goalRangePounds?.1:0;description=goal>0&&Math.abs(last-goal)<=CONFIG.body.goalRangePounds?"Stable within the intended goal range":"Stable recent weight";}else if(goal>0){const toward=Math.abs(first-goal)-Math.abs(last-goal);score=clamp(toward/(first*CONFIG.body.meaningfulWeightPercent));description=toward>0?"Moving toward the recorded goal":"Moving away from the recorded goal";}else{score=clamp(-change/CONFIG.body.meaningfulWeightPercent);description=change<0?"Recent weight decreased":"Recent weight increased";}}
    const available=score!==null; const x=available&&Math.abs(score)<=.1?-CONFIG.weights.bodyTrend*.55:0; const y=available?score*CONFIG.weights.bodyTrend:0;
    return {key:"bodyTrend",available,score,vector:{x,y},completeness:clamp(weights.length/4,0,1),inputs:{weightMeasurements:weights.length,firstWeight:weights[0]?.value??null,lastWeight:weights.at(-1)?.value??null,goalWeight:goal||null,weightInterpretation:description,waistCurrent:finite(state.profile.waist)?Number(state.profile.waist):null,waistTrend:null},ignored:["Waist trend ignored: historical waist measurements are not available"]};
  }

  function labelForAngle(angle) {
    const sectors=["North","North-East","East","South-East","South","South-West","West","North-West"];
    return sectors[Math.round(angle/45)%8];
  }

  function explanationFor(direction){return {"North":"Recent inputs lean toward stronger fat-burn support.","North-East":"Supportive movement and habits are present alongside some recovery need.","East":"Recovery signals are the strongest current pull.","South-East":"Less supportive recent inputs combine with greater recovery need.","South":"Recent inputs lean glucose-heavy; this is behavioural interpretation, not measured fuel use.","South-West":"The pattern is mostly stable with some less supportive recent inputs.","West":"Recent recorded trends appear relatively stable and balanced.","North-West":"The pattern is stable with a supportive northward lean."}[direction]||"Keep recording to build a clearer direction."}

  function calculate(state){const drivers=[movementDriver(state),recoveryDriver(state),supportDriver(state),bodyTrendDriver(state)];const x=drivers.reduce((s,d)=>s+d.vector.x,0),y=drivers.reduce((s,d)=>s+d.vector.y,0);const confidence=drivers.reduce((s,d)=>s+d.completeness*.25,0);const magnitude=Math.hypot(x,y);const angle=(Math.atan2(x,y)*180/Math.PI+360)%360;const defensible=confidence>=CONFIG.confidence.directionMinimum&&magnitude>=CONFIG.confidence.vectorMinimum;return {drivers,x,y,confidence,magnitude,angle,direction:defensible?labelForAngle(angle):null,defensible};}

  const el=id=>document.getElementById(id); const fmt=value=>value===null||value===undefined?"Missing":String(value);
  function list(id,items){el(id).innerHTML=items.map(item=>`<li>${item}</li>`).join("");}
  function render(result){const byKey=Object.fromEntries(result.drivers.map(d=>[d.key,d]));const m=byKey.movement,r=byKey.recovery,s=byKey.support,b=byKey.bodyTrend;
    el("movementSummary").textContent=m.available?`${m.inputs.walkingDays} walking day${m.inputs.walkingDays===1?"":"s"} in the last ${CONFIG.lookbackDays} days.`:"No recent walking data yet.";list("movementValues",[`${m.inputs.walkingMinutes} walking minutes`,`Current streak: ${m.inputs.streakDays} day${m.inputs.streakDays===1?"":"s"}`]);
    el("recoverySummary").textContent=r.available?"Recent sleep and stress create recovery pressure.":"No recent sleep or stress data yet.";list("recoveryValues",[`Sleep: ${fmt(r.inputs.sleepAverageHours)} hr average (${r.inputs.sleepDays} days)`,`Stress: ${fmt(r.inputs.stressAverage)} / 5 average (${r.inputs.stressDays} days)`]);
    el("supportSummary").textContent=s.available?"Hydration and non-duplicated Lifestyle habits contribute support.":"No recent support inputs yet.";list("supportValues",[`Hydration: ${fmt(s.inputs.hydrationAverageOunces)} oz average`,`Lifestyle week: ${fmt(s.inputs.lifestyleWeek)}`]);
    el("bodySummary").textContent=b.inputs.weightInterpretation;list("bodyValues",[`Weight measurements: ${b.inputs.weightMeasurements}`,`Waist trend: insufficient history`]);
    const displayAngle=result.defensible?result.angle:0;el("needle").style.transform=`translate(-50%,-100%) rotate(${displayAngle}deg)`;el("resultArrow").style.transform=`rotate(${displayAngle}deg)`;el("directionResult").textContent=result.direction?`Leaning ${result.direction}`:"Building your direction…";el("directionExplanation").textContent=result.direction?explanationFor(result.direction):"There is not yet enough recent, complete data for a defensible direction.";
    const confidenceLabel=result.confidence>=CONFIG.confidence.high?"High":result.confidence>=CONFIG.confidence.medium?"Medium":"Low";el("confidenceLabel").textContent=confidenceLabel;const dots=Math.round(result.confidence*5);el("confidenceDots").innerHTML=Array.from({length:5},(_,i)=>`<i class="${i<dots?"on":""}"></i>`).join("");el("confidenceExplanation").textContent=`${Math.round(result.confidence*100)}% usable recent-data coverage. Confidence changes visibility of the result, not the needle colour.`;
    const cards=result.drivers.map(d=>({title:d.key==="bodyTrend"?"Body Trend":d.key[0].toUpperCase()+d.key.slice(1),text:`Input/value:\n${JSON.stringify(d.inputs,null,2)}\n\nVector contribution: (${round(d.vector.x)}, ${round(d.vector.y)})\nNormalized score: ${fmt(d.score)}\nCompleteness: ${Math.round(d.completeness*100)}%\nMissing/ignored:\n${d.ignored.length?d.ignored.join("\n"):"None"}`}));cards.push({title:"Resulting vector",text:`X: ${round(result.x)}\nY: ${round(result.y)}\nMagnitude: ${round(result.magnitude)}\nAngle: ${round(result.angle)}°\nDirection: ${result.direction||"Building your direction…"}\nConfidence: ${Math.round(result.confidence*100)}%`});el("diagnosticGrid").innerHTML=cards.map(card=>`<article class="diagnostic-item"><h3>${card.title}</h3><p>${card.text}</p></article>`).join("");el("configReadout").textContent=JSON.stringify(CONFIG,null,2);
  }

  function refresh(){render(calculate(loadState()));}
  window.MotionCCompassPrototype = Object.freeze({ calculate, config: CONFIG });
  refresh(); window.addEventListener("storage",event=>{if(event.key===STORAGE_KEY)refresh();}); window.addEventListener("motionc:cloud-restored",refresh);
})();
