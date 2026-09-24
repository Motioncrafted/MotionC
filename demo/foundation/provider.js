/* Pure Demo provider. Every snapshot is clipped before calculation, including
   weekly responses and dated waist evidence, so history cannot see the future. */
const DemoProvider = (() => {
  const keys = ['sleep','hydration','nutrition','movement','stress','alcohol','smoking','activity'];
  const addDays = (date,n) => new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
  const dates = (asOf,n,completed=false) => Array.from({length:n},(_,i)=>addDays(asOf,i-n+1-(completed?1:0)));
  const average = values => values.length ? values.reduce((s,v)=>s+v,0)/values.length : null;
  function aggregateWalks(walks) {
    const distance = Math.round(walks.reduce((s,w)=>s+w.distance,0)*100)/100;
    const minutes = walks.reduce((s,w)=>s+w.minutes,0);
    const steps = walks.length && walks.every(w=>Number(w.steps)>0) ? walks.reduce((s,w)=>s+Math.round(w.steps),0) : null;
    const walkingHr = walks.length && walks.every(w=>Number(w.walkingHr)>0 && w.minutes>0)
      ? Math.round(walks.reduce((s,w)=>s+w.walkingHr*w.minutes,0)/minutes) : null;
    return {distance,minutes,steps,walkingHr,pace:distance>0?minutes/distance:null};
  }
  function stateAt(asOf=DEMO_DAVE.manifest.today) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || asOf < DEMO_DAVE.manifest.historyStart || asOf > DEMO_DAVE.manifest.today) throw Error('Date outside the fixed Demo history');
    const entries={},dailyGauges={},weeks={};
    for(const [date,weight,rawWalks,sleep,hydration,stress,promises,restingHr,note] of DEMO_DAVE.observations) {
      if(date>asOf)continue;
      const walks=rawWalks.map(([distance,minutes,steps,walkingHr],i)=>({id:`dave-${date}-${i+1}`,distance,minutes,steps,walkingHr,pace:minutes/distance}));
      entries[date]={date,weight,walks,...aggregateWalks(walks),restingHr,noRestaurant:promises[0]==='1',noAlcohol:promises[1]==='1',noJunkFood:promises[2]==='1',smokeFreeDay:true,note};
      dailyGauges[date]={};
      for(const [key,value,unit] of [['sleep',sleep,'hours'],['hydration',hydration,'oz'],['stress',stress,'of 5']]) {
        if(value!==null)dailyGauges[date][key]={value,unit};
      }
    }
    for(const [date,answers] of DEMO_DAVE.weeklyResponses) {
      if(date>asOf)continue;
      const values=Object.fromEntries(keys.map((key,i)=>[key,answers[i]]));
      const summaryScore=answers.reduce((s,v)=>s+v,0);
      const week=addDays(date,-new Date(date+'T12:00:00Z').getUTCDay());
      weeks[week]={values,summaryScore,score:Math.min(10,Math.round(summaryScore/24*10*2)/2),assessed:true,lifestyleScale:3,updatedAt:date+'T12:00:00Z'};
    }
    const waistHistory=DEMO_DAVE.waistHistory.filter(([date])=>date<=asOf).map(([date,waistInches])=>({date,waistInches,recordedAt:date+'T12:00:00Z'}));
    const currentWeight=Object.values(entries).filter(e=>e.weight!==null).at(-1)?.weight??null;
    const profile={...DEMO_DAVE.profile,currentWeight,waist:waistHistory.at(-1)?.waistInches??null,waistHistory,vibratoryLine:DEMO_DAVE.profile.realGoal+4};
    return demoFreeze({asOf,entries,dailyGauges,weeks,profile});
  }
  function summary(asOf=DEMO_DAVE.manifest.today) {
    const state=stateAt(asOf),{entries,profile,dailyGauges,weeks}=state;
    const days14=dates(asOf,14),days7=dates(asOf,7),completed14=dates(asOf,14,true),completed7=dates(asOf,7,true);
    const measured={heightCm:profile.heightInches*2.54,heightMetres:profile.heightInches*.0254,waistCm:profile.waist*2.54,weightKg:profile.currentWeight*.45359237,age:profile.age,sex:profile.sex};
    const mcp=Object.values(measured).every(v=>v!==null)?calculateMcp(measured):null;
    const weekly=Object.entries(weeks).at(-1);
    const lifestyle=weekly?{week:weekly[0],score:weekly[1].summaryScore,values:Object.fromEntries(keys.map(k=>[k,weekly[1].values[k]/3]))}:null;
    const weightPoints=days14.filter(d=>entries[d]?.weight!=null).map(date=>({date,value:entries[date].weight}));
    const walkPoints=days14.map(date=>({date,miles:entries[date]?.distance??null,minutes:entries[date]?.minutes??null,walks:entries[date]?.walks.map(w=>w.distance)??null}));
    const walkingDays=Object.values(entries).filter(e=>e.distance>0),latestWalk=walkingDays.at(-1)??null;
    const recent=walkingDays.filter(e=>days14.includes(e.date)&&e.date!==latestWalk?.date).map(e=>stepResult(e,entries)?.value).filter(Number.isFinite);
    const measuredDays=Object.values(entries).filter(e=>e.date<asOf).map(measuredWalkingDay).filter(Boolean),scored=new Map();
    measuredDays.forEach((day,i)=>{const signal=bodySignalForDay(day,measuredDays.slice(0,i));if(signal)scored.set(day.date,signal);});
    const bodyPoints=completed7.map((date,i)=>({date,x:8+i*34,felt:dailyGauges[date]?.stress?.value??null,body:scored.get(date)?.value??null}));
    const baselineSamples=Math.max(0,...Array.from(scored.values(),s=>s.samples));
    const body={points:bodyPoints,baselineSamples,message:stressSignalsMessage(bodyPoints,baselineSamples),confidence:baselineSamples<3?'Need data':baselineSamples<5?'Learning':baselineSamples<14?'Early signal':baselineSamples<28?'Active':'Stable'};
    const gaugeTrends=Object.fromEntries(['sleep','hydration','stress'].map(key=>{
      const window=key==='sleep'?days14:completed14;
      const points=window.map(date=>({date,value:dailyGauges[date]?.[key]?.value??null}));
      return [key,{points,average:average(points.filter(p=>p.value!==null).map(p=>p.value)),count:points.filter(p=>p.value!==null).length}];
    }));
    const compass=CompassV2.calculate(state,{asOf});
    return demoFreeze({asOf,state,mcp,lifestyle,compass,body,gaugeTrends,days14,days7,completed14,completed7,weightPoints,walkPoints,
      weightChange14:weightPoints.length>=2?weightPoints.at(-1).value-weightPoints[0].value:null,
      lifetimeDistance:Object.values(entries).reduce((s,e)=>s+e.distance,0),
      walking7:{distance:days7.reduce((s,d)=>s+(entries[d]?.distance??0),0),minutes:days7.reduce((s,d)=>s+(entries[d]?.minutes??0),0)},
      latestWalk,steps:latestWalk?stepResult(latestWalk,entries):null,recentStepsAverage:recent.length?Math.round(average(recent)):null,
      position:profile.currentWeight<profile.realGoal?'Below the intended Vibratory Zone':profile.currentWeight>profile.vibratoryLine?'Above the intended Vibratory Zone':'Inside the intended Vibratory Zone',
      gauges:{mcpAngle:mcp?195+((60-Math.max(0,Math.min(60,mcp.mcp)))/60*330):null,lifestyleDegrees:lifestyle?lifestyle.score/24*360:null}
    });
  }
  function compassHistory() {return demoFreeze(DEMO_DAVE.observations.map(([date])=>summary(date).compass));}
  return Object.freeze({dataset:DEMO_DAVE,stateAt,summary,compassHistory,dates,aggregateWalks});
})();
