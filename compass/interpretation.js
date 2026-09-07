(() => {
  'use strict';
  const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
  const median=a=>{const v=[...a].sort((x,y)=>x-y),i=Math.floor(v.length/2);return v.length?(v.length%2?v[i]:(v[i-1]+v[i])/2):null;};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const distance=a=>Math.abs(((a+540)%360)-180);
  const signedChange=(a,b)=>((b-a+540)%360)-180;
  const day=(date,offset)=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const number=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const section=(state,title,...paragraphs)=>({state,title,paragraphs});
  const names={walking:'Walking',sleep:'Sleep',stress:'Stress',hydration:'Hydration'};
  const targets={sleep:7.5,stress:1,hydration:80};
  const limits={sleep:[0,24],stress:[1,5],hydration:[0,500]};
  const thresholds={sleep:.4,stress:.4,hydration:8};

  function summarize(samples,split,end){
    const early=samples.filter(s=>s.date<split),late=samples.filter(s=>s.date>=split);
    return {samples,count:samples.length,early,late,average:mean(samples.map(s=>s.value)),earlyMean:mean(early.map(s=>s.value)),lateMean:mean(late.map(s=>s.value)),enough:samples.length>=3&&late.length>=2,trendReady:early.length>=3&&late.length>=3};
  }
  function analyze({state={},result=null,records={},start,end,today}){
    const completedEnd=end===today?day(end,-1):end,split=day(start,7);
    const within=d=>d>=start&&d<=completedEnd;
    const signals={};
    for(const key of ['sleep','stress','hydration']){
      const samples=Object.entries(state.dailyGauges||{}).filter(([d,g])=>within(d)&&number(g?.[key]?.value)&&Number(g[key].value)>=limits[key][0]&&Number(g[key].value)<=limits[key][1]).map(([date,g])=>({date,value:Number(g[key].value)})).sort((a,b)=>a.date.localeCompare(b.date));
      const s=signals[key]=summarize(samples,split,completedEnd);
      const change=s.trendReady?s.lateMean-s.earlyMean:null;
      s.change=change;
      s.trend=change===null?'learning':Math.abs(change)<thresholds[key]?'steady':(key==='stress'?change<0:change>0)?'improving':'declining';
      const v=s.average;
      s.pressure=!s.enough?null:key==='stress'?clamp((v-1)/4,0,1):clamp((targets[key]-v)/targets[key],0,1);
    }
    const walks=Object.entries(state.entries||{}).filter(([d,e])=>within(d)&&(number(e.minutes)||number(e.distance))).map(([date,e])=>({date,value:number(e.minutes)?Number(e.minutes):0,walked:Number(e.minutes)>0||Number(e.distance)>0})).sort((a,b)=>a.date.localeCompare(b.date));
    const w=signals.walking=summarize(walks,split,completedEnd);
    w.days=walks.filter(s=>s.walked).length;w.earlyDays=w.early.filter(s=>s.walked).length;w.lateDays=w.late.filter(s=>s.walked).length;
    const movementDriver=end===today?result?.drivers?.find(d=>d.key==='movement'):null;
    w.supports=movementDriver?.available?movementDriver.vector.y>0:((w.days/5+walks.reduce((n,r)=>n+r.value,0)/210)/3*2-1)>0;
    w.consistent=w.enough&&w.days>=5&&w.lateDays>=2;
    const earlyRate=w.early.length?w.earlyDays/w.early.length:0,lateRate=w.late.length?w.lateDays/w.late.length:0;
    w.trend=!w.trendReady?'learning':lateRate-earlyRate>.2?'improving':earlyRate-lateRate>.2?'declining':'steady';
    const coverage=Object.entries(names).map(([key,label])=>({key,label,count:signals[key].count,state:signals[key].enough?'Receiving data':signals[key].count?'Getting started':key==='walking'?'Add a Daily walk':'Add Daily Gauge readings',enough:signals[key].enough}));
    const missing=coverage.filter(s=>!s.enough).map(s=>s.label);
    const weights=Object.entries(state.entries||{}).filter(([d,e])=>within(d)&&number(e.weight)&&Number(e.weight)>0).sort(([a],[b])=>a.localeCompare(b));
    const weeks=Object.entries(state.weeks||{}).filter(([d,v])=>d<=end&&v?.assessed!==false&&v?.values&&(!v.updatedAt||String(v.updatedAt).slice(0,10)<=end)).sort(([a,av],[b,bv])=>String(av.updatedAt||a).localeCompare(String(bv.updatedAt||b)));
    const latest=weeks.at(-1),weekValues=latest?.[1]?.values||{},scale=latest?.[1]?.lifestyleScale===3?3:1;
    const lifestyle=['nutrition','alcohol','smoking'].filter(k=>number(weekValues[k])).map(k=>clamp(Number(weekValues[k])/scale,0,1));
    const lifestyleConcern=lifestyle.length?mean(lifestyle)<.8:false;
    const points=Object.entries(records).filter(([d,r])=>d>=start&&d<=end&&number(r?.angle)&&Number(r.angle)>=0&&Number(r.angle)<360).sort(([a],[b])=>a.localeCompare(b));
    const earlyPoints=points.filter(([d])=>d<split),latePoints=points.filter(([d])=>d>=split);
    const trendReady=earlyPoints.length>=2&&latePoints.length>=2&&points.length>=4;
    const rawChange=points.length>1?signedChange(Number(points[0][1].angle),Number(points.at(-1)[1].angle)):null;
    const supportShift=trendReady?median(earlyPoints.map(([,r])=>distance(Number(r.angle))))-median(latePoints.map(([,r])=>distance(Number(r.angle)))):null;
    const directionTrend=!trendReady?'learning':Math.abs(supportShift)<.5?'steady':supportShift>0?'improving':'drifting';
    const currentAngle=end===today?(result?.defensible?result.angle:null):points.length?Number(points.at(-1)[1].angle):null;
    const supportive=currentAngle!==null&&distance(currentAngle)<45;
    const concerns=[];
    for(const key of ['sleep','stress','hydration']){
      const s=signals[key];if(s.enough&&(s.pressure>.08||s.trend==='declining'))concerns.push({key,severity:(s.pressure||0)+(s.trend==='declining'?.15:0)});
    }
    if(w.enough&&(w.trend==='declining'||!w.consistent))concerns.push({key:'walking',severity:.25});
    if(lifestyleConcern)concerns.push({key:'lifestyle',severity:.2});
    const bodyDriver=end===today?result?.drivers?.find(d=>d.key==='bodyTrend'):null;
    if(bodyDriver?.available&&bodyDriver.score<-.05)concerns.push({key:'body',severity:.18});
    concerns.sort((a,b)=>b.severity-a.severity);
    const complete=missing.length===0;
    const allClear=complete&&!concerns.length&&w.consistent&&supportive&&lifestyle.length===3&&(weights.length>=2||bodyDriver?.available)&&(!bodyDriver||bodyDriver.score>=-.05);
    const sections={};
    if(!trendReady){
      sections.direction=section('Learning','Your direction is taking shape',`${points.length} saved Compass reading${points.length===1?'':'s'} fall in this window. A 14-day trend needs readings in both halves of the period; there is no need to fill in every day.`,supportive?'Your latest reading reflects a generally supportive pattern. More saved readings will show whether that pattern is strengthening or simply holding.':'Open Compass as you record your days. It will retain each day’s direction so a lasting pattern can emerge.');
    }else{
      const title={improving:'Improving',steady:'Holding steady',drifting:'Drifting'}[directionTrend];
      const detail={improving:'The later readings lean more toward supportive habits than the earlier readings. This describes the Compass pattern, not a change in your MCP position.',steady:'The earlier and later readings show much the same overall direction. A line can wiggle without marking a meaningful change in the pattern.',drifting:'The later readings lean less toward supportive habits than the earlier readings. The signals below help put that shift in context.'}[directionTrend];
      sections.direction=section('Interpreting',title,detail,supportive?'The latest direction in this window remains generally supportive.':'Use the influences below to distinguish recovery needs, a balanced pattern, and less supportive habits.');
    }
    const influences=[];
    if(w.enough)influences.push(w.consistent?`Walking is recorded consistently: you logged walks on ${w.days} completed days in this window. ${w.trend==='declining'?'Walking appears on fewer of the later recorded days, so this support deserves a closer look.':'Those repeated walks give Compass a consistent movement pattern to work with.'}`:`Walking is recorded on ${w.days} completed days. ${w.days?'It contributes movement information, but the repeated pattern is not yet strong enough to call it consistent support.':'The recorded days do not show walking activity; movement is an area to revisit.'}`);
    for(const key of ['sleep','stress','hydration']){
      const s=signals[key];if(!s.enough)continue;
      const influence=key==='hydration'?(s.average<40?'is pulling against an otherwise supportive pattern':s.average===40?'is currently neutral in the hydration part of your direction':s.average<80?'is helping, although it is below the level Compass counts as fully supportive':'is reinforcing the supportive side of your direction'):(s.pressure>.08?'is leaving some recovery needs in view':'is adding little or no recovery pressure to your pattern');
      const change=s.trend==='improving'?(key==='stress'?'Later stress readings are lower.':'Later readings are higher.') : s.trend==='declining'?(key==='stress'?'Later stress readings are higher.':'Later readings are lower.') :s.trend==='steady'?'The earlier and later readings are similar.':'More readings in both halves of the window will show whether this is changing.';
      influences.push(`${names[key]} ${influence}. ${change}`);
    }
    if(lifestyle.length)influences.push(`The latest available weekly Lifestyle assessment (${latest[0]}) ${lifestyleConcern?'contains less supportive nutrition, alcohol or smoking responses':'adds supportive nutrition, alcohol and smoking context'}. Together with hydration, these habits shape the Support part of your direction.`);
    if(weights.length>=2||bodyDriver?.available){
      if(bodyDriver?.available){
        const below=String(bodyDriver.inputs.weightInterpretation).includes('Below');
        const wording=bodyDriver.score<-.05?(below?'Weight has been falling while already below your recorded goal range. Compass treats that as a cautionary influence, rather than additional support.':'Weight is moving away from the recorded goal range, adding a less supportive influence.'):bodyDriver.score>.05?'Weight is moving toward the recorded goal range, adding a supportive influence.':'Recent weight is relatively steady. That adds stability and context, rather than a verdict on your day.';
        influences.push(wording);
      }
      else influences.push('Repeated weight measurements provide Body Trend context. Past goal settings were not saved with every reading, so this view does not invent an earlier goal-based interpretation.');
    }
    if(!influences.length)influences.push('Help Compass see your pattern. Start with a Daily walk or a few Sleep, Stress and Hydration readings. Those records will show which signals are supporting your direction and which need attention.');
    if(missing.length)influences.push(`Add more ${missing.join(', ')} records to bring those signals into the explanation. Missing readings are left unknown; they are never treated as a poor result.`);
    sections.influences=section(influences.length&&!missing.length?'Interpreting':coverage.some(c=>c.enough)?'Interpreting':'Learning','What’s influencing your direction',...influences);
    const paired=signals.sleep.samples.map(s=>({date:s.date,sleep:s.value,stress:signals.stress.samples.find(t=>t.date===s.date)?.value})).filter(p=>p.stress!==undefined);
    const adversePairs=paired.filter(p=>p.sleep<targets.sleep&&p.stress>targets.stress);
    const connections=[];
    if(paired.length>=4&&adversePairs.length>=3){connections.push(`Shorter sleep and higher stress appeared together on ${adversePairs.length} of ${paired.length} days with both readings. Both feed the Recovery part of Compass. This is an observed overlap, not evidence that one caused the other.`);if(w.consistent&&w.supports)connections.push('Your walking supplies a supportive influence at the same time. Recovery needs can coexist with that benefit; one does not erase the other.');}
    else if(paired.length>=4){connections.push('There are enough paired Sleep and Stress readings to look at them together. They do not show a repeated overlap of shorter sleep and higher stress in this window.');}
    if(w.consistent&&w.supports&&signals.hydration.enough)connections.push(signals.hydration.pressure>.08?'Consistent walking and lower hydration readings are present in the same period. They act on different parts of the model: walking adds Movement support, while hydration still has room to strengthen that support.':'Walking and hydration are both supplying support in this window. This is how different recorded habits can reinforce the same overall direction.');
    if(signals.sleep.trendReady&&signals.stress.trendReady&&signals.sleep.trend==='declining'&&signals.stress.trend==='declining'&&paired.length>=4)connections.push('The later part of this window contains both shorter sleep and higher stress. Together, those recorded changes point to more recovery pressure in the model.');
    if(!connections.length)connections.push('Help Compass connect the dots. Record Sleep and Stress on a few of the same days, and add Hydration alongside your walks. Shared dates make it possible to see which patterns occur together.');
    if(missing.length&&connections.length)connections.push(`More ${missing.join(', ')} readings would let Compass connect those signals with the pattern already visible.`);
    sections.connections=section(allClear?'All Clear':paired.length>=4||(w.consistent&&signals.hydration.enough)?'Interpreting':'Learning','Connecting the dots',...connections);
    const advice={sleep:'Sleep is a useful place to focus. Its recorded pattern is contributing recovery pressure; keep noting it so you can see whether that pressure eases.',stress:'Stress deserves attention in this window. Its readings are contributing recovery pressure; use the Daily Gauge to notice when that pattern settles.',hydration:'Hydration is worth a closer look. Completed-day readings are below Compass’s support target or have been falling. Consistent recording will help distinguish a habit pattern from missed entries.',walking:'Walking is the movement opportunity here. A repeatable walking routine and regular Daily entries will make its contribution easier to follow.',lifestyle:'Revisit the nutrition, alcohol and smoking responses in your weekly Lifestyle check-in. The latest assessment includes an opportunity in this part of Support.',body:'Body Trend deserves some context. Review the current weight trend and recorded goal range together; a single measurement is not the whole pattern.'};
    const attention=concerns.slice(0,2);
    if(attention.length)sections.attention=section('Interpreting','What deserves attention',...attention.map(c=>advice[c.key]),w.consistent&&w.supports&&!attention.some(c=>c.key==='walking')?'Walking is already supplying consistent support. Keep that strength in view while you look at these other signals.':'Choose one area to notice first; the purpose is a useful next focus, not a list of jobs.');
    else if(allClear)sections.attention=section('All Clear','Nothing needs special attention','Your available signals are stable or supportive, with no notable pressure flagged by these checks. Keep the pattern going.','This describes the recorded MotionC signals in this window; it is not a general health assessment.');
    else sections.attention=section(missing.length||!trendReady||lifestyle.length<3?'Learning':'Interpreting','Keep building the picture',missing.length?`Nothing in the usable signals is flagged for special attention. Add ${missing.join(', ')} readings to check the rest of the pattern.`:'The daily signals do not flag a special focus. More Compass history, weekly Lifestyle context or repeated weight records will make the overall explanation more complete.');
    if(!trendReady&&coverage.filter(c=>c.enough).length>=2&&result?.defensible&&end===today)sections.path=section('Interpreting','What continuing this pattern could mean',attention.length?'If the patterns highlighted above persist, they will keep adding recovery needs or limiting support alongside your strengths. A change in those signals would give Compass a different pattern to respond to.':'If these supportive signals continue, they should keep supporting your direction. Keeping a steady pattern can be useful even when the needle changes very little.',`The ${points.length} saved direction readings do not yet establish a lasting trend. Your daily signals give useful context now; more Compass history will show what persists.`);
    else if(!trendReady)sections.path=section('Learning','Where this path is taking you','The saved directions do not yet establish a lasting trend. Your available daily signals can still show useful strengths and opportunities now.','Keep opening Compass as your days accumulate. It will distinguish a persistent pattern from a short-lived change.');
    else if(directionTrend==='drifting'||attention.length)sections.path=section('Interpreting','A pattern worth watching',supportive?'The overall direction remains supportive, but the pressures identified above could keep it from strengthening if they persist.':'If the recorded pressures continue, the model will continue to reflect them. The areas above are the clearest places to watch for a change.','This is a conditional reading of the current model, not a forecast of weight or health outcomes.');
    else if(!supportive)sections.path=section('Interpreting','Keep the wider pattern in view','The saved direction is not showing a strongly supportive pattern, even though the daily checks do not flag a new focus. A stable or balanced direction is different from a strengthening one.','Continue recording rather than assuming the line alone predicts what happens next.');
    else sections.path=section(allClear?'All Clear':'Interpreting','Keep the supportive pattern going',directionTrend==='improving'?'The recorded direction has strengthened across this window. If its supportive inputs persist, they should continue to support the direction.':'The direction is holding much the same pattern. Continued supportive inputs should help maintain it.','A new pattern in the daily signals may change that picture; future readings will show what actually happens.');
    const topics=attention.filter(c=>['sleep','stress','hydration','walking'].includes(c.key)).map(c=>names[c.key]);
    sections.learn=section(topics.length?'Interpreting':allClear?'All Clear':'Learning','Learn more',topics.length?`Explore ${topics.join(' and ')} in the MotionC Library for context on the areas highlighted here.`:'The MotionC Library explains how walking, recovery and daily habits fit together. Explore a topic as it becomes relevant to your own pattern.');
    return {sections,coverage,topics,range:{start,end,completedEnd},directionTrend,rawChange,supportShift,allClear};
  }
  function render(input){
    const view=analyze(input);
    document.getElementById('interpretationRange').textContent=`${input.start} to ${input.end} · Daily patterns use completed days${input.end===input.today?', through yesterday':''}.`;
    for(const [key,s] of Object.entries(view.sections)){
      const box=document.getElementById('explain-'+key);box.dataset.state=s.state;
      box.querySelector('.explain-state').textContent=s.state;
      box.querySelector('h3').textContent=s.title;
      const body=box.querySelector('.explain-body');body.replaceChildren();
      for(const text of s.paragraphs){const p=document.createElement('p');p.textContent=text;body.append(p);}
      if(key==='learn'){const a=document.createElement('a');a.href='/library/';a.textContent=view.topics.length?`Explore ${view.topics.join(' and ')} in the Library`:'Explore the MotionC Library';body.append(a);}
    }
    const coverage=document.getElementById('signalCoverage');coverage.replaceChildren();
    view.coverage.forEach(s=>{const item=document.createElement('li');const label=document.createElement('strong');label.textContent=s.label;const status=document.createElement('span');status.textContent=`${s.enough?'✓ ':''}${s.state} · ${s.count} completed day${s.count===1?'':'s'}`;item.append(label,status);coverage.append(item);});
  }
  function describeCurrent(result){
    const title=document.getElementById('directionResult'),copy=document.getElementById('directionExplanation');
    if(!result.defensible){title.textContent='Building your pattern';copy.textContent='A few consistent Daily entries will help Compass bring the signals together.';return;}
    const descriptions={North:['Supportive overall','Recent inputs combine into a generally supportive pattern.'], 'North-East':['Support with recovery needs','Supportive habits are present alongside recovery pressure.'],East:['Recovery deserves attention','Recovery signals have the strongest pull in the current pattern.'],'South-East':['Habits and recovery need attention','Less supportive inputs are present alongside recovery pressure.'],South:['Support needs strengthening','Recent recorded habits are contributing less support.'],'South-West':['Steady, with support to build','A relatively stable pattern includes some less supportive inputs.'],West:['A balanced pattern','Recent recorded trends appear relatively stable and balanced.'],'North-West':['Steady and supportive','A stable pattern includes supportive influences.']};
    const d=descriptions[result.direction]||['Your current pattern','Read the signals below for context.'];title.textContent=d[0];copy.textContent=d[1];
  }
  window.MotionCCompassInterpretation=Object.freeze({analyze,render,describeCurrent});
})();
