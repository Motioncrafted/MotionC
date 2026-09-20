/* Compass V2 candidate. Movement/Recovery/Support/weight rules derived from verified V1 baseline. */
(function(root){"use strict";
function weightDrivers(state,asOf){
 const NativeDate=globalThis.Date;
 class Date extends NativeDate { constructor(...args){super(...(args.length?args:[asOf+'T12:00:00']));} }
  const KG_PER_LB = 0.45359237;
  const CM_PER_IN = 2.54;
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
    const available=score!==null; const x=0; /* V2: stable weight carries context and coverage, never westward force. */ const y=available?score*CONFIG.weights.bodyTrend:0;
    return {key:"bodyTrend",available,score,vector:{x,y},completeness:clamp(weights.length/4,0,1),inputs:{weightMeasurements:weights.length,firstWeight:weights[0]?.value??null,lastWeight:weights.at(-1)?.value??null,realGoal:realGoal||null,motivationalGoal:motivationalGoal||null,vibratoryZone:rangeLow===null?null:{low:rangeLow,high:rangeHigh},weightInterpretation:description,waistCurrent:finite(state.profile.waist)?Number(state.profile.waist):null,waistTrend:null},ignored:[]};
  }


 return [movementDriver(state),recoveryDriver(state),supportDriver(state),bodyTrendDriver(state)];
}
const MODEL='nes-v2',EPS=1e-12;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function dayNumber(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return NaN;const d=new Date(s+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s?Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())/86400000:NaN;}
function median(a){a=[...a].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;}
function rate(p){const slopes=[];for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)slopes.push((p[j].value-p[i].value)*28/(p[j].day-p[i].day));return median(slopes);}
function waistEvidence(profile,asOf){
 const today=dayNumber(asOf),byDate=new Map(),raw=Array.isArray(profile.waistHistory)?profile.waistHistory:[];
 const out={qualified:false,status:'omitted',reason:'No qualifying dated evidence',candidate:0,cap:.05,observations:[]};
 for(const p of raw){const day=dayNumber(p?.date),value=Number(p?.waistInches);if(!Number.isFinite(day)||today-day<0||today-day>=112||!Number.isFinite(value)||value<=0)continue;
  const prior=byDate.get(day);if(!prior||String(p.recordedAt||'')>=String(prior.recordedAt||''))byDate.set(day,{date:p.date,day,value,recordedAt:p.recordedAt||null});}
 const byWeek=new Map();for(const p of [...byDate.values()].sort((a,b)=>a.day-b.day)){const week=p.day-((p.day+4)%7+7)%7;byWeek.set(week,p);}
 const p=[...byWeek.values()].sort((a,b)=>a.day-b.day);out.observations=p;out.count=p.length;
 if(p.length<3){out.reason='Fewer than three dated weeks';return out;}
 const span=p.at(-1).day-p[0].day,priorSpan=p.at(-2).day-p[0].day,age=today-p.at(-1).day;Object.assign(out,{span,priorSpan,age});
 if(span<28||priorSpan<14){out.reason='Observation span too short';return out;}
 if(age>=42){out.reason='Evidence is stale';return out;}
 const overallRate=rate(p),earlierRate=rate(p.slice(0,-1)),latestRate=(p.at(-1).value-p.at(-2).value)*28/(p.at(-1).day-p.at(-2).day);
 Object.assign(out,{overallRate,earlierRate,latestRate});
 if(!overallRate||!earlierRate||!latestRate||Math.sign(overallRate)!==Math.sign(earlierRate)||Math.sign(overallRate)!==Math.sign(latestRate)){out.reason='Rates do not agree';return out;}
 const supportedRate=Math.min(Math.abs(overallRate),Math.abs(earlierRate),Math.abs(latestRate));
 const supportedChange=supportedRate*span/28,rateFraction=clamp((supportedRate-.125)/.875,0,1),changeFraction=clamp((supportedChange-.25)/.75,0,1),freshness=age<=28?1:(42-age)/14;
 Object.assign(out,{supportedRate,supportedChange,rateFraction,changeFraction,freshness});
 out.candidate=-Math.sign(overallRate)*.05*Math.min(rateFraction,changeFraction)*freshness;
 if(!out.candidate){out.reason='Within gradual noise allowance';return out;}
 return Object.assign(out,{qualified:true,status:'qualified',reason:null});
}
function combineBody(body,waist){
 const weight=body.vector.y,goal=body.inputs.vibratoryZone?.low,last=body.inputs.lastWeight;
 waist.allowed=waist.candidate;waist.applied=0;
 if(waist.qualified&&waist.candidate>0){
  if(Number.isFinite(goal)&&Number.isFinite(last)&&last<goal){waist.allowed=0;waist.status='blocked-below-goal';}
  else if(!Number.isFinite(goal)||!Number.isFinite(last)){waist.allowed=0;waist.status='blocked-unknown-goal-context';}
 }
 const combined=clamp(weight+waist.allowed,-.09,.09);waist.applied=combined-weight;
 if(waist.qualified&&waist.allowed!==0)waist.status=Math.abs(waist.applied)<EPS?'reinforces-at-cap':weight*waist.allowed<0?'opposes-weight':weight*waist.allowed>0?'reinforces-weight':'moves-body-trend';
 body.weightContribution=weight;body.waist=waist;body.vector={x:0,y:combined};body.available=body.available||waist.applied!==0;
 body.inputs.waistTrend=waist.qualified?{candidate:waist.candidate,allowed:waist.allowed,applied:waist.applied,status:waist.status}:null;
 return body;
}
function direction(angle){if(angle===0)return 'North';if(angle===90)return 'East';if(angle===180)return 'South';return angle<90?'North-East':'South-East';}
function resolve(drivers){
 let x=drivers.reduce((s,d)=>s+d.vector.x,0),y=drivers.reduce((s,d)=>s+d.vector.y,0);
 const coverage=drivers.reduce((s,d)=>s+d.completeness*.25,0),failures=[];
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(coverage)||drivers.some(d=>!Number.isFinite(d.vector.x)||!Number.isFinite(d.vector.y)||!Number.isFinite(d.completeness)||d.completeness<0||d.completeness>1))failures.push('Invalid calculation inputs');
 if(x < -EPS || drivers.some(d=>d.vector.x < -EPS))failures.push('Boundary invariant failed: negative eastward contribution');
 if(x<0&&x>=-EPS)x=0; if(Object.is(x,-0))x=0;
 if(Math.abs(y)<EPS)y=0;
 const magnitude=Math.hypot(x,y);
 if(coverage<.35)failures.push('Coverage below 35%');
 if(magnitude===0)failures.push('No directional vector');else if(magnitude<.12)failures.push('Vector strength below 0.12');
 const accepted=failures.length===0;
 // Nonnegative X is established before mapping. No modulo, reflection or circular state.
 const angle=accepted?Math.atan2(x,y)*180/Math.PI:null;
 if(accepted&&(!Number.isFinite(angle)||angle<0||angle>180))throw Error('V2 bounded-angle invariant');
 return {model:MODEL,drivers,x,y,coverage,confidence:coverage,magnitude,accepted,defensible:accepted,angle,direction:accepted?direction(angle):null,reasons:failures};
}
function calculate(input={},options={}){
 const asOf=options.asOf||dayKey(new Date());if(!Number.isFinite(dayNumber(asOf)))throw Error('Invalid calculation date');
 const state={entries:input.entries||{},dailyGauges:input.dailyGauges||{},weeks:input.weeks||{},profile:input.profile||{}};
 const drivers=weightDrivers(state,asOf);drivers[3]=combineBody(drivers[3],waistEvidence(state.profile,asOf));
 const result=resolve(drivers);return {...result,asOf};
}
// Convex interpolation; no angular wrap or accumulated rotations. Shared by renderer and tests.
function interpolate(start,end,t){if(![start,end,t].every(Number.isFinite)||start<0||start>180||end<0||end>180)throw Error('Invalid bounded animation');const p=clamp(t,0,1),ease=p*p*(3-2*p);return clamp(start+(end-start)*ease,Math.min(start,end),Math.max(start,end));}
function waistExplanation(b){const w=b.waist;if(!w.qualified)return '';
 const d=w.candidate>0?'northward':'southward';
 if(w.status==='blocked-below-goal')return 'Your waist trend shows a decrease. Because weight remains below your recorded goal range, it adds no northward credit. '+(b.weightContribution<0?'Continued weight loss retains its southward Body Trend caution.':'The weight-based contribution is preserved.');
 if(w.status==='blocked-unknown-goal-context')return 'Your waist trend shows a decrease. Northward credit is held because Compass cannot establish current weight against a recorded goal range. ';
 if(w.status==='reinforces-at-cap')return `Your waist trend also supports the ${d} pattern. Body Trend is at its contribution limit, so waist adds no further movement.`;
 if(w.status==='opposes-weight')return `Your waist trend adds a ${d} influence, partly offsetting the weight trend. Body Trend ${b.vector.y===0?'has no net directional contribution':b.vector.y>0?'still leans north':'still leans south'}.`;
 return `Your waist trend adds a ${d} influence to Body Trend${Math.abs(w.applied)<Math.abs(w.allowed)-EPS?', limited by the combined contribution cap':''}.`;
}
const api=Object.freeze({model:MODEL,calculate,resolve,waistEvidence,interpolate,direction,waistExplanation,dayKey,dayNumber});
root.CompassV2=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
