/* Presentation only. Consumes V2 evidence; never mutates inputs, scores or history. */
(function(root){
  'use strict';
  const numeric=v=>typeof v==='number'&&Number.isFinite(v);
  const positive=v=>numeric(v)&&v>0;
  const lifeKeys=['nutrition','alcohol','smoking'];
  const title={nutrition:'Nutrition',alcohol:'Alcohol',smoking:'Smoking'};
  const sentence=(text,strong=text)=>({text,strong});
  const unavailable="There's not enough previous information to compare this yet.";
  function formatting(metric=false){
    const n=(v,d=1)=>numeric(v)?new Intl.NumberFormat(undefined,{maximumFractionDigits:d}).format(v):'not recorded';
    const hours=v=>{if(!numeric(v)||v<0)return 'not recorded';const minutes=Math.round(v*60);return Math.floor(minutes/60)+':'+String(minutes%60).padStart(2,'0');};
    const weight=v=>positive(v)?n(v*(metric?.45359237:1))+(metric?' kg':' lb'):'not recorded';
    const water=v=>numeric(v)&&v>=0?n(v*(metric?29.5735295625:1),metric?0:1)+(metric?' mL':' oz'):'not recorded';
    const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return 'date unavailable';const d=new Date(v+'T12:00:00');return Number.isFinite(+d)?d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'date unavailable';};
    return {n,hours,weight,water,date,metric};
  }
  // Canonical VZ: finite positive Real Goal through Real Goal + 4 lb, inclusive.
  function goalContext(inputs={}){
    if(positive(inputs.realGoal))return {kind:'vz',low:inputs.realGoal,high:inputs.realGoal+4,name:'your Vibratory Zone'};
    return null;
  }
  const position=(v,g)=>!g?'unknown':v<g.low?'below':v>g.high?'above':'within';
  function weightObservation(first,last,count,g){
    const where=positive(last)?position(last,g):'unknown';
    const place=g?(where==='within'?'within '+g.name:where+' '+g.name):'';
    if(!positive(last))return {observation:sentence('There are no recent weight readings to interpret.','no recent weight readings'),attention:false};
    if(count<2||!positive(first))return {observation:sentence(`Your latest weight is ${g?place:'recorded'}, but one reading cannot show a trend.`,g?place:'one reading cannot show a trend'),attention:where==='below'};
    const delta=last-first,small=Math.abs(delta/first)<=.006,was=position(first,g);
    let text,strong,attention=false;
    if(g&&was!==where){
      text=`Across these readings, your weight moved ${where==='within'?'into '+g.name:'from '+was+' to '+where+' '+g.name}.`;
      strong=where==='within'?'into '+g.name:'from '+was+' to '+where+' '+g.name;attention=where!=='within';
    }else if(g&&where==='within'){
      text=small?`Your latest weight is ${place}, with little overall change.`:`Your weight has ${delta>0?'increased':'decreased'}, and your latest reading is still ${place}.`;strong=place;
    }else if(g&&small){text=`Your weight has changed little and remains ${place}.`;strong='remains '+place;attention=where==='below';}
    else if(g){
      const closer=(where==='above'&&delta<0)||(where==='below'&&delta>0);
      text=closer?`Your weight is moving closer to ${g.name}, while still ${where} it.`:`Your weight is ${where} ${g.name} and has ${delta>0?'increased':'decreased'} across these readings.`;
      strong=closer?'moving closer to '+g.name:`${where} ${g.name}`;attention=!closer||where==='below';
    }else{text=small?'Your weight has changed little across these readings; no valid Real Goal is recorded for context.':`Your weight has ${delta>0?'increased':'decreased'} across these readings; no valid Real Goal is recorded for context.`;strong=small?'changed little':delta>0?'increased':'decreased';}
    return {observation:sentence(text,strong),attention,where,small};
  }
  function waistText(d){const w=d.waist;if(!w?.qualified)return '';let text=`Your qualifying waist readings show ${w.candidate>0?'a decrease':'an increase'}.`;if(w.status==='blocked-below-goal')text+=' Weight remains below the recorded goal, so the waist decrease does not outweigh that context.';return text;}
  function walking(d,f){const i=d.inputs;let observation;
    if(!d.available)observation=sentence('There is no recent walking recorded here yet.','no recent walking recorded');
    else if(i.walkingDays===14)observation=sentence("You've walked every day for the past two weeks.",'walked every day');
    else if(i.streakDays>=5)observation=sentence(`You've built a ${f.n(i.streakDays,0)}-day walking streak.`,`${f.n(i.streakDays,0)}-day walking streak`);
    else observation=sentence(`You've recorded walking on ${f.n(i.walkingDays,0)} of the last 14 days.`,`${f.n(i.walkingDays,0)} of the last 14 days`);
    return {id:'movementCard',key:'movement',title:'Walking',icon:'🚶',observation,evidence:[`${f.n(i.walkingDays,0)} walking ${i.walkingDays===1?'day':'days'} · ${f.n(i.walkingMinutes,0)} minutes`,`${f.n(i.streakDays,0)}-day streak · Last 14 days`],
      why:'Walking records show how movement fits into your recent routine. The pattern over time adds context to any single day.',
      how:'Compass looks at your recent walking frequency, time and streak together to understand how walking relates to your direction. Missing records do not establish how active you were.',
      technical:'Movement uses 14 calendar days including today. Score = clamp(2 × (walking days / 5 + minutes / 210 + streak / 5) / 3 − 1, −1, 1). Its north/south contribution is score × 0.32. A positive distance can qualify a walking day even without recorded minutes.'};
  }
  function recovery(d,f){const i=d.inputs,hasSleep=i.sleepDays>0&&numeric(i.sleepAverageHours)&&i.sleepAverageHours>=0,hasStress=i.stressDays>0&&numeric(i.stressAverage)&&i.stressAverage>=0&&i.stressAverage<=5,parts=[];
    if(hasSleep)parts.push(i.sleepDays===1?`Your one sleep reading is ${f.hours(i.sleepAverageHours)}`:i.sleepAverageHours<7.5?'Your sleep has averaged less than 7½ hours':`Your sleep has averaged ${f.hours(i.sleepAverageHours)}`);
    if(hasStress)parts.push(i.stressDays===1?`your one stress reading is ${f.n(i.stressAverage,2)} / 5`:i.stressAverage<=2.5?'your average stress is in the lower half of the scale':'your average stress is in the upper half of the scale');
    let text=parts.length?parts.join(', while ')+'.':'There are no usable sleep or stress readings to describe yet.';
    if(parts.length===1)text+=' '+(hasSleep?'Stress':'Sleep')+' is not available here yet.';text=text[0].toUpperCase()+text.slice(1);
    return {id:'recoveryCard',key:'recovery',title:'Sleep & Stress',icon:'🌙',observation:sentence(text,parts.length?parts[0].replace(/^Your /,'').replace(/^your /,''):'no usable sleep or stress readings'),
      evidence:[`Sleep: ${hasSleep?f.hours(i.sleepAverageHours)+(i.sleepDays===1?' · 1 reading':' average · '+i.sleepDays+' readings'):'not available'} (hours:minutes)`,`Stress: ${hasStress?f.n(i.stressAverage,2)+' / 5 · '+i.stressDays+' '+(i.stressDays===1?'reading':'readings'):'not available'}`,'Last 14 days'],
      why:"Sleep and stress can affect how your recent pattern develops. MotionC watches both so changes in either don't get overlooked.",
      how:'Compass looks at your available sleep and stress readings together to understand how they relate to your direction. If only one is recorded, it uses that information without assuming the other is fine.',
      technical:'Recovery averages available readings over 14 days. Sleep pressure = clamp((7.5 − average hours) / 7.5, 0, 1). Stress pressure = clamp((average stress − 1) / 4, 0, 1). Their available mean × 0.26 supplies the eastward contribution. More sleep above 7.5 hours adds no further reduction. The card’s lower/upper-half wording simply splits the 0–5 stress scale at 2.5; it is not a health threshold.'};
  }
  function support(d,f){const i=d.inputs,c=i.components||{},hasWater=i.hydrationDays>0&&numeric(i.hydrationAverageOunces)&&i.hydrationAverageOunces>=0,recorded=lifeKeys.filter(k=>numeric(c[k]?.value)&&c[k].value>=0&&c[k].value<=1),positiveLife=recorded.length===3&&lifeKeys.every(k=>c[k].normalized>0),mixedLife=recorded.some(k=>c[k].normalized>0)&&recorded.some(k=>c[k].normalized<0),parts=[];
    if(hasWater)parts.push(i.hydrationDays===1?`Your one hydration reading is ${f.water(i.hydrationAverageOunces)}`:`Your hydration has averaged ${f.water(i.hydrationAverageOunces)}`);
    if(positiveLife)parts.push('the three Lifestyle answers used here look supportive');else if(mixedLife)parts.push('the Lifestyle answers used here show a mixed picture');else if(recorded.length)parts.push(`${recorded.length} of the three Lifestyle answers used here are available`);
    let text=parts.length?parts.join(', and ')+'.':'There are no usable hydration readings or Lifestyle answers here yet.';text=text[0].toUpperCase()+text.slice(1);
    if(hasWater&&!recorded.length)text+=' Lifestyle is not available here yet.';if(!hasWater&&recorded.length)text+=' Hydration is not available here yet.';
    return {id:'supportCard',key:'support',title:'Hydration & Lifestyle',icon:'💧',observation:sentence(text,positiveLife?'look supportive':mixedLife?'mixed picture':hasWater?f.water(i.hydrationAverageOunces):'no usable hydration readings or Lifestyle answers'),
      evidence:[`Hydration: ${hasWater?f.water(i.hydrationAverageOunces)+(i.hydrationDays===1?' · 1 reading':' average · '+i.hydrationDays+' readings'):'not available'}`,`Lifestyle: ${i.lifestyleWeek?f.date(i.lifestyleWeek)+' check-in':'not recorded'}`,'Hydration: last 14 days'],
      why:'Hydration and your Lifestyle check-in add context that walking records alone cannot show.',
      how:'Compass looks at recent hydration along with Nutrition, Alcohol and Smoking from your latest saved Lifestyle check-in. Walking, sleep and stress are already considered separately. The check-in date is shown because the saved answers may be older.',
      technical:'Support uses available hydration over 14 days: clamp(average ounces / 80 × 2 − 1, −1, 1). Lifestyle uses only Nutrition, Alcohol and Smoking; scale-3 answers are divided by 3, then their mean is mapped with clamp(2 × mean − 1, −1, 1). The available hydration/Lifestyle mean × 0.24 is the north/south contribution. No expiry is applied to the latest saved check-in. An average does not establish consistency.'};
  }
  function body(d,f){const i=d.inputs,g=goalContext(i),finding=weightObservation(i.firstWeight,i.lastWeight,i.weightMeasurements,g),evidence=[`Weight: ${i.weightMeasurements>=2?f.weight(i.firstWeight)+' → '+f.weight(i.lastWeight):f.weight(i.lastWeight)}`,g?`VZ: ${f.weight(g.low)}–${f.weight(g.high)}`:'Real Goal: not available',`${i.weightMeasurements} weight readings · Last 35 days`];
    if(d.waist?.qualified)evidence.push(`Waist: ${d.waist.count} dated weeks over ${d.waist.span} days · newest ${d.waist.age} days ago`);
    return {id:'bodyCard',key:'bodyTrend',title:'Weight',icon:'⚖️',observation:finding.observation,context:waistText(d),evidence,attention:finding.attention,
      why:'Weight change means more when it is read in context. A decrease or increase can mean different things depending on where you are relative to your Vibratory Zone.',
      how:'The observation reads your weight against your Vibratory Zone: your Real Goal through 4 lb above it, including both boundaries. Without a valid Real Goal, it describes the recorded weight change without assigning a target range. Motivational Goal is a separate milestone, not a range boundary. When enough waist history exists, Compass uses it as additional context.',
      technical:`Body Trend compares first and last positive weights in 35 days, with at least two readings. Relative change within ±0.6% is treated as stable. The meaningful-change divisor is 1.5%, usual score cap ±0.5 and multiplier 0.18. Below-goal continued loss has a −0.35 score floor. The VZ is Real Goal through Real Goal + 4 lb, inclusive, and requires a finite positive Real Goal. Motivational Goal is not used. Waist uses qualifying evidence within 112 days, at least three dated weeks, 28-day total/14-day earlier spans, agreeing rates and freshness under 42 days. Waist is capped at ±0.05; combined Body Trend at ±0.09. Northward waist credit is blocked below goal or without goal/weight context.`};
  }
  function comparison(d,before,f){
    if(!before||before.key!==d.key)return {text:unavailable,lines:[]};
    const a=before.inputs||{},b=d.inputs||{},lines=[],phrases=[];let comparable=0,changed=0;
    function field(label,old,value,format){const oldOK=numeric(old),newOK=numeric(value);if(!oldOK&&!newOK)return;
      if(!oldOK||!newOK){changed++;phrases.push(`${label} ${newOK?'is now available':'is no longer available for this period'}`);lines.push(`${label}: ${oldOK?format(old):'not available'} → ${newOK?format(value):'not available'}`);return;}
      comparable++;const same=format(old)===format(value);if(!same)changed++;phrases.push(`${label} ${same?'is about the same':value>old?'increased':'decreased'}`);lines.push(`${label}: ${format(old)} → ${format(value)}`);
    }
    if(d.key==='movement'){
      if(before.available||d.available){field('Walking days',before.available?a.walkingDays:null,d.available?b.walkingDays:null,x=>f.n(x,0));field('Walking time',before.available?a.walkingMinutes:null,d.available?b.walkingMinutes:null,x=>f.n(x,0)+' min');field('Your streak',before.available?a.streakDays:null,d.available?b.streakDays:null,x=>f.n(x,0)+' days');}
    }else if(d.key==='recovery'){
      field('Your sleep average',a.sleepDays>0?a.sleepAverageHours:null,b.sleepDays>0?b.sleepAverageHours:null,f.hours);field('Your stress average',a.stressDays>0?a.stressAverage:null,b.stressDays>0?b.stressAverage:null,x=>f.n(x,2)+' / 5');
    }else if(d.key==='support'){
      field('Your hydration average',a.hydrationDays>0?a.hydrationAverageOunces:null,b.hydrationDays>0?b.hydrationAverageOunces:null,f.water);for(const k of lifeKeys)field(title[k]+' answer',a.components?.[k]?.value,b.components?.[k]?.value,x=>f.n(x*3,2)+' / 3');
      if(a.lifestyleWeek!==b.lifestyleWeek){changed++;phrases.push('The saved Lifestyle check-in date changed');lines.push(`Lifestyle: ${f.date(a.lifestyleWeek)} → ${f.date(b.lifestyleWeek)}`);}
    }else{
      field('Your latest recorded weight',positive(a.lastWeight)?a.lastWeight:null,positive(b.lastWeight)?b.lastWeight:null,f.weight);
      const oldGoal=goalContext(a),goal=goalContext(b),goalChanged=JSON.stringify(oldGoal)!==JSON.stringify(goal);
      if(goalChanged){changed++;phrases.push('Your recorded goal context changed');lines.push(`Goal context: ${oldGoal?f.weight(oldGoal.low)+(oldGoal.kind==='vz'?'–'+f.weight(oldGoal.high):''):'not recorded'} → ${goal?f.weight(goal.low)+(goal.kind==='vz'?'–'+f.weight(goal.high):''):'not recorded'}`);}
      if(positive(a.lastWeight)&&positive(b.lastWeight))phrases.push((goalChanged?'Using your current goal context: ':'')+weightObservation(a.lastWeight,b.lastWeight,2,goal).observation.text);
      if(positive(a.firstWeight)&&positive(b.firstWeight)&&f.weight(a.firstWeight)!==f.weight(b.firstWeight)){
        changed++;phrases.push('The earliest weight in the last 35 days has changed');lines.push(`First weight in window: ${f.weight(a.firstWeight)} → ${f.weight(b.firstWeight)}`);
        phrases.push('Over the last 35 days: '+weightObservation(b.firstWeight,b.lastWeight,b.weightMeasurements,goal).observation.text);
      }
      const oldWaist=before.waist,newWaist=d.waist;
      if(Boolean(oldWaist?.qualified)!==Boolean(newWaist?.qualified)){changed++;phrases.push(newWaist?.qualified?'There is now enough waist history for additional context':'Waist history no longer qualifies for additional context');}
      else if(newWaist?.qualified&&JSON.stringify(oldWaist.observations)!==JSON.stringify(newWaist.observations)){changed++;phrases.push('The qualifying waist evidence has changed');}
    }
    const countFields=d.key==='recovery'?[['sleepDays','Sleep readings'],['stressDays','Stress readings']]:d.key==='support'?[['hydrationDays','Hydration readings']]:d.key==='bodyTrend'?[['weightMeasurements','Weight readings']]:[];
    const countsChanged=countFields.filter(([key])=>numeric(a[key])&&numeric(b[key])&&a[key]!==b[key]);
    for(const [key,label]of countsChanged)lines.push(`${label}: ${a[key]} → ${b[key]}`);
    if(countsChanged.length&&comparable){phrases.push('The number of readings available for comparison changed');changed++;}
    if(!comparable&&!changed)return {text:unavailable,lines};
    // "About the same" means equal at visible precision, not a new clinical threshold.
    let text=!changed?'Not much has changed here since your previous Compass reading.':phrases.join('. ')+'.';
    if(!changed&&d.key==='bodyTrend'&&phrases.length>1)text+=' '+phrases.at(-1);
    return {text:text.replace(/\.\./g,'.'),lines};
  }
  function story(cards,result){const [m,r,s,b]=result.drivers,mi=m.inputs,ri=r.inputs,si=s.inputs,positives=[],notices=[];
    if(m.available&&mi.walkingDays===14)positives.push(sentence("You've walked every day for the past two weeks.",'walked every day'));else if(m.available&&mi.streakDays>=5)positives.push(sentence(`Your ${mi.streakDays}-day walking streak stands out.`,`${mi.streakDays}-day walking streak`));
    if(b.inputs.weightMeasurements>0&&cards[3].attention)notices.push(cards[3].observation);
    if(ri.sleepDays>=2&&numeric(ri.sleepAverageHours)&&ri.sleepAverageHours>=0&&ri.sleepAverageHours<7.5)notices.push(sentence('Your sleep has averaged less than 7½ hours.','less than 7½ hours'));
    if(ri.stressDays>=2&&numeric(ri.stressAverage)&&ri.stressAverage>2.5&&ri.stressAverage<=5)notices.push(sentence('Your average stress is in the upper half of the scale.','upper half of the scale'));
    if(si.components&&lifeKeys.every(k=>si.components[k]?.normalized>0))positives.push(sentence('The Lifestyle answers used here look supportive; their saved date is shown below.','Lifestyle answers used here look supportive'));
    const facts=[...positives.slice(0,notices.length?1:2),...notices.slice(0,2)];
    if(!facts.length){const available=cards.filter((c,i)=>result.drivers[i].available);facts.push(...available.slice(0,2).map(c=>c.observation));}
    const hasData=result.drivers.some(d=>d.available);
    const headline=!hasData?'Your recorded picture is still taking shape.':!result.accepted?'There are some observations, but the overall picture is still incomplete.':notices.length?positives.length?'Things are looking pretty good overall, with a few things worth noticing.':'A few parts of your recent picture deserve awareness.':positives.length?'There are supportive signs in your recent records.':'Your recent records give context to your direction.';
    if(!hasData)facts.push(sentence('As information becomes available, this space will bring the most meaningful observations together.',''));
    return {headline,facts:facts.slice(0,3)};
  }
  function build(state,result,previous=null,options={}){const f=formatting(options.metric),builders=[walking,recovery,support,body];const cards=result.drivers.map((d,i)=>{const c=builders[i](d,f);c.change=comparison(d,previous?.drivers?.find(x=>x.key===d.key),f);c.raw={score:d.score,contribution:d.vector,inputs:d.inputs,waist:d.waist};return c;});return {cards,story:story(cards,result)};}
  const api=Object.freeze({build,goalContext,weightObservation,formatting,comparison});root.CompassV2Language=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
