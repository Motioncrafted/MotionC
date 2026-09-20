/* Frozen V1 compatibility: frozen V1 calculation only. No UI or storage writes. */
(function(root){'use strict';
  const CONFIG = Object.freeze({
    lookbackDays: 14,
    bodyLookbackDays: 35,
    recencyDays: 14,
    weights: Object.freeze({ movement: 0.32, recovery: 0.26, support: 0.24, bodyTrend: 0.18 }),
    movement: Object.freeze({ targetDays: 5, targetMinutes: 210, targetStreak: 5 }),
    recovery: Object.freeze({ sleepTargetHours: 7.5, stressLow: 1, stressHigh: 5 }),
    support: Object.freeze({ hydrationTargetOunces: 80 }),
    body: Object.freeze({ stableWeightPercent: 0.006, meaningfulWeightPercent: 0.015, goalRangePounds: 4, maximumContextScore: 0.5, belowRangeSouthCap: 0.35 }),
    confidence: Object.freeze({ directionMinimum: 0.35, medium: 0.5, high: 0.75, vectorMinimum: 0.12 })
  });

  const clamp = (value, min = -1, max = 1) => Math.min(max, Math.max(min, value));
  const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const round = value => Math.round(value * 1000) / 1000;
  const dateValue = date => new Date(`${date}T12:00:00`);
  // Compare local calendar dates, not elapsed hours from the entry's noon.
  // UTC day numbers avoid daylight-saving days being 23 or 25 hours long.
  const daysAgo = date => {
    const today = new Date(), recorded = dateValue(date);
    const dayNumber = value => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86400000;
    return dayNumber(today) - dayNumber(recorded);
  };
  const recentDate = (date, days) => daysAgo(date) >= 0 && daysAgo(date) < days;
  const finite = value => Number.isFinite(Number(value));

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
    const walkingByDate = new Map();
    entries.filter(item => item.minutes > 0 || item.distance > 0).forEach(item => {
      const existing = walkingByDate.get(item.date) || { date: item.date, minutes: 0, distance: 0 };
      existing.minutes += item.minutes;
      existing.distance += item.distance;
      walkingByDate.set(item.date, existing);
    });
    const walking = [...walkingByDate.values()];
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
    const hydrationComponent=hydrationAvg===null?null:clamp(hydrationAvg/CONFIG.support.hydrationTargetOunces*2-1);
    const lifestyleComponents=Object.fromEntries(nonDuplicateKeys.map(key=>{const value=finite(values[key])?(scale===3?Number(values[key])/3:Number(values[key])):null;return [key,{value,normalized:value===null?null:clamp(value*2-1)}];}));
    const lifestyleComponent=lifestyleValues.length?clamp(average(lifestyleValues)*2-1):null;
    const parts=[hydrationComponent,lifestyleComponent].filter(value=>value!==null);
    const score=average(parts), available=score!==null;
    const ignored=["Lifestyle sleep excluded (Recovery)","Lifestyle stress excluded (Recovery)","Lifestyle activity/movement excluded (Movement)"];
    return {key:"support",available,score,vector:{x:0,y:available?score*CONFIG.weights.support:0},completeness:clamp(((hydration.length?1:0)+(lifestyleValues.length/nonDuplicateKeys.length))/2,0,1),inputs:{hydrationAverageOunces:hydrationAvg===null?null:round(hydrationAvg),hydrationDays:hydration.length,lifestyleWeek:week?.[0]||null,components:{hydration:{value:hydrationAvg===null?null:round(hydrationAvg),normalized:hydrationComponent===null?null:round(hydrationComponent)},nutrition:lifestyleComponents.nutrition,alcohol:lifestyleComponents.alcohol,smoking:lifestyleComponents.smoking,lifestyleCombined:lifestyleComponent===null?null:round(lifestyleComponent),supportCombined:score===null?null:round(score)}},ignored};
  }

  function bodyTrendDriver(state) {
    const weights=Object.entries(state.entries).filter(([date,entry])=>recentDate(date,CONFIG.bodyLookbackDays)&&finite(entry.weight)&&Number(entry.weight)>0).map(([date,entry])=>({date,value:Number(entry.weight)})).sort((a,b)=>a.date.localeCompare(b.date));
    const realGoal=Number(state.profile.realGoal||0),motivationalGoal=Number(state.profile.motivationalGoal||0);
    const rangeLow=realGoal>0?realGoal:null,rangeHigh=motivationalGoal>0?Math.max(realGoal,motivationalGoal):realGoal>0?realGoal+CONFIG.body.goalRangePounds:null;
    let score=null,description="Need at least two recent weight measurements",stableInRange=false;
    if(weights.length>=2){const first=weights[0].value,last=weights.at(-1).value,change=(last-first)/first,stable=Math.abs(change)<=CONFIG.body.stableWeightPercent;
      if(rangeLow!==null){const inRange=last>=rangeLow&&last<=rangeHigh;stableInRange=inRange&&stable;
        if(inRange){score=stable?0:clamp(-change/CONFIG.body.meaningfulWeightPercent,-CONFIG.body.maximumContextScore,CONFIG.body.maximumContextScore);description=stable?"Stable within the intended Vibratory Zone":"Moving within the intended Vibratory Zone";}
        else if(last<rangeLow){if(stable){score=0;description="Stable below the recorded Vibratory Zone; treated as context, not failure";}else if(change>0){score=clamp(change/CONFIG.body.meaningfulWeightPercent,0,CONFIG.body.maximumContextScore);description="Moving upward toward the recorded Vibratory Zone";}else{score=-Math.min(CONFIG.body.belowRangeSouthCap,Math.abs(change)/CONFIG.body.meaningfulWeightPercent);description="Below the recorded Vibratory Zone and still decreasing; limited South context";}}
        else {if(stable){score=0;description="Stable above the recorded Vibratory Zone";}else if(change<0){score=clamp(-change/CONFIG.body.meaningfulWeightPercent,0,CONFIG.body.maximumContextScore);description="Moving downward toward the recorded Vibratory Zone";}else{score=-Math.min(CONFIG.body.maximumContextScore,change/CONFIG.body.meaningfulWeightPercent);description="Above the recorded Vibratory Zone and moving farther away";}}
      } else {score=stable?0:clamp(-change/CONFIG.body.meaningfulWeightPercent,-CONFIG.body.maximumContextScore,CONFIG.body.maximumContextScore);description=stable?"Stable recent weight; no goal range recorded":change<0?"Recent weight decreased; no goal range recorded":"Recent weight increased; no goal range recorded";}}
    const available=score!==null; const x=available&&(stableInRange||Math.abs(score)<=.05)?-CONFIG.weights.bodyTrend*.55:0; const y=available?score*CONFIG.weights.bodyTrend:0;
    return {key:"bodyTrend",available,score,vector:{x,y},completeness:clamp(weights.length/4,0,1),inputs:{weightMeasurements:weights.length,firstWeight:weights[0]?.value??null,lastWeight:weights.at(-1)?.value??null,realGoal:realGoal||null,motivationalGoal:motivationalGoal||null,vibratoryZone:rangeLow===null?null:{low:rangeLow,high:rangeHigh},weightInterpretation:description,waistCurrent:finite(state.profile.waist)?Number(state.profile.waist):null,waistTrend:null},ignored:["Waist trend ignored: historical waist measurements are not available"]};
  }

  function labelForAngle(angle) {
    const sectors=["North","North-East","East","South-East","South","South-West","West","North-West"];
    return sectors[Math.round(angle/45)%8];
  }

  function calculate(state){const drivers=[movementDriver(state),recoveryDriver(state),supportDriver(state),bodyTrendDriver(state)];const x=drivers.reduce((s,d)=>s+d.vector.x,0),y=drivers.reduce((s,d)=>s+d.vector.y,0);const confidence=drivers.reduce((s,d)=>s+d.completeness*.25,0);const magnitude=Math.hypot(x,y);const angle=(Math.atan2(x,y)*180/Math.PI+360)%360;const defensible=confidence>=CONFIG.confidence.directionMinimum&&magnitude>=CONFIG.confidence.vectorMinimum;return {drivers,x,y,confidence,magnitude,angle,direction:defensible?labelForAngle(angle):null,defensible};}


const model='compass-v1-legacy';root.ResponseCompassV1=Object.freeze({model,calculate:state=>({...calculate(state),model}),config:CONFIG});
})(typeof window==='undefined'?globalThis:window);
