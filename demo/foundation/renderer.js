/* Read-only adapter: only immutable provider outputs reach the presentation. */
const summaryUnitSystem='imperial';
const summaryWeightUnit=()=> 'lb';
const summaryDistanceUnit=()=> 'mi';
const summaryMlPerFlOz=29.5735;
let summaryGoalWeight=null,summaryMotivationalWeight=null,summaryVibratoryWeight=null,summaryWeightPoints=[];
const summaryDate=value=>new Date(value+'T12:00:00Z');
const shortChartDate=value=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(summaryDate(value));
const demoSnapshot=DemoProvider.summary();
const screens=Object.freeze({home:'Meet Dave',daily:'Daily — placeholder',summary:'Summary',compass:'Compass — placeholder',walking:'Walking / Jasper — placeholder'});
const embedded=window.parent!==window,channel=location.hash.slice(1),channelOK=/^[0-9a-f-]{36}$/.test(channel);
let activeScreen='home';
function renderSummary() {
  const s=demoSnapshot,p=s.state.profile;
  summaryGoalWeight=p.realGoal;summaryMotivationalWeight=p.motivationalGoal;summaryVibratoryWeight=p.vibratoryLine;
  setText('demo-profile',`Dave · ${p.age} · Male · 5 ft 11 in. Fictional history: July 27–September 20, 2026. Demo today: September 20, 2026. Read-only.`);
  setText('display-weight',p.currentWeight.toFixed(1));
  setText('display-waist',p.waist.toFixed(1));
  setText('waist-change',`↓ ${(p.startingWaist-p.waist).toFixed(1)} in since the start`);
  setText('display-bmi',s.mcp.bmi.toFixed(1));
  setText('display-lifetime-distance',s.lifetimeDistance.toFixed(2));
  setText('weight-change',`${s.weightChange14<=0?'▼':'▲'} ${Math.abs(s.weightChange14).toFixed(1)} lb over 14 days`);
  setText('weight-chart-summary',`${p.currentWeight.toFixed(1)} lb · ${s.weightChange14>0?'+':''}${s.weightChange14.toFixed(1)} lb`);
  setText('weekly-weight-change',`${s.weightChange14>0?'+':''}${s.weightChange14.toFixed(1)} lb`);
  setText('weekly-miles',`${s.walking7.distance.toFixed(2)} mi`);
  setText('weekly-minutes',`${Math.round(s.walking7.minutes)} min`);
  setText('walking-chart-summary',`${s.walking7.distance.toFixed(1)} mi · ${Math.round(s.walking7.minutes)} min in the last 7 days`);
  setText('display-steps',s.steps.value.toLocaleString('en-US'));
  setText('steps-label',s.steps.measured?'Steps':'Estimated steps');
  const stepDelta=s.steps.value-s.recentStepsAverage;
  setText('steps-status',`${s.steps.measured?'Measured':'Personal estimate'} · ${stepDelta>=0?'▲':'▼'} ${Math.abs(stepDelta).toLocaleString('en-US')} vs your recent average`);
  setText('display-walking-hr',String(s.latestWalk.walkingHr));
  setText('walking-hr-label','Average walking HR');
  setText('walking-hr-status',`Measured · latest walking day, ${shortChartDate(s.latestWalk.date)}`);
  updateModernMcpDisplay({results:s.mcp});
  renderLifestyleSummary(s.lifestyle);
  document.getElementById('lifestyle-ring').setAttribute('role','img');
  document.getElementById('lifestyle-ring').setAttribute('aria-label',`Lifestyle ${s.lifestyle.score} of 24`);
  setText('momentum-message',`${s.position}. Dave is approaching maintenance; his recent weights are beginning to settle.`);
  setText('demo-compass',s.compass.accepted?`${s.compass.direction} · ${s.compass.angle.toFixed(1)}° · ${Math.round(s.compass.coverage*100)}% evidence coverage`:'More evidence needed');
  setText('demo-compass-context',s.compass.drivers[3].inputs.weightInterpretation+'. '+CompassV2.waistExplanation(s.compass.drivers[3]));
  const svg=document.getElementById('stress-signals-chart');svg.replaceChildren();
  [4,16,28].forEach(y=>svg.append(svgNode('line',{x1:'4',x2:'216',y1:y,y2:y,stroke:'#e2e8e5','stroke-width':'1'})));
  appendSignalSegments(svg,s.body.points,'felt','#d94d48');appendSignalSegments(svg,s.body.points,'body','#16758e');
  setText('stress-signals-confidence',s.body.confidence);setText('stress-signals-message',s.body.message);
  svg.setAttribute('aria-label',`Previous seven completed Demo days: ${s.body.points.filter(p=>p.felt!==null).length} Felt readings and ${s.body.points.filter(p=>p.body!==null).length} Body readings. ${s.body.message}`);
  drawWeightChart(s.weightPoints);drawWalkingChart(s.walkPoints);
  for(const key of ['sleep','hydration','stress'])drawDailyGaugeTrend(key,key==='sleep'?s.days14:s.completed14,s.state.dailyGauges);
  // Accessible inspection also works with touch and keyboard; no editable controls.
  const host=document.getElementById('demo-samples');
  if(!host.firstChild){
    const table=document.createElement('table');
    const head=table.createTHead().insertRow();
    ['Date','Weight (lb)','Walks','Miles','Minutes','Sleep (h)','Water (oz)','Stress'].forEach(label=>{const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th);});
    const body=table.createTBody();
    Object.values(s.state.entries).slice().reverse().forEach(e=>{
      const row=body.insertRow(),g=s.state.dailyGauges[e.date];
      [e.date,e.weight?.toFixed(1)??'—',e.walks.length,e.distance.toFixed(2),e.minutes,g.sleep?.value??'—',g.hydration?.value??'—',g.stress?.value??'—'].forEach(value=>{row.insertCell().textContent=String(value);});
    });host.append(table);
  }
  document.querySelectorAll('canvas').forEach(canvas=>{
    if(canvas.dataset.inspection)return;canvas.dataset.inspection='true';
    canvas.addEventListener('pointermove',event=>{
      const tooltip=document.getElementById(canvas.id.replace(/-chart$/,'-tooltip'));
      if(!tooltip)return;
      const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left;
      const point=canvas._hitPoints?.reduce((a,b)=>!a||Math.abs(b.x-x)<Math.abs(a.x-x)?b:a,null);
      if(!point)return;tooltip.hidden=false;
      const unit=canvas.id==='weight-chart'?'lb':canvas.id.startsWith('sleep')?'hours':canvas.id.startsWith('hydration')?'oz':'of 5';
      tooltip.textContent=point.value!==undefined?`${point.date}: ${point.value} ${unit}`:`${point.date}: ${point.miles.toFixed(2)} mi · ${point.minutes} min`;
      tooltip.style.left=Math.max(0,Math.min(rect.width-180,x))+'px';tooltip.style.top='10px';
    });
    canvas.addEventListener('pointerleave',()=>{const tooltip=document.getElementById(canvas.id.replace(/-chart$/,'-tooltip'));if(tooltip)tooltip.hidden=true;});
  });
}
function requestScreen(screen){if(embedded&&channelOK)parent.postMessage({type:'motionc-demo-request',channel,screen},'*');}
function render(screen) {
  activeScreen=Object.hasOwn(screens,screen)?screen:'home';
  const root=document.getElementById('demo-root');
  if(activeScreen==='summary') {root.innerHTML=DEMO_SUMMARY_TEMPLATE;renderSummary();return;}
  root.replaceChildren();const section=document.createElement('section');section.className='demo-placeholder';
  const title=document.createElement('h1');title.textContent=screens[activeScreen];section.append(title);
  const copy=document.createElement('p');copy.textContent=activeScreen==='home'
    ? 'Meet Dave, a fictional MotionC user finding a steady routine. Explore his Summary after eight weeks of walking, check-ins and everyday choices.'
    : 'This Demo screen remains a placeholder. Dave’s populated Summary is ready to explore.';section.append(copy);
  const button=document.createElement('button');button.type='button';button.textContent='Explore Dave’s Summary';button.disabled=!embedded||!channelOK;button.addEventListener('click',()=>requestScreen('summary'));section.append(button);root.append(section);
}
window.addEventListener('message',event=>{const m=event.data;if(!embedded||!channelOK||event.source!==parent||!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).sort().join(',')!=='channel,screen,type'||m.channel!==channel||m.type!=='motionc-demo-screen')return;render(Object.hasOwn(screens,m.screen)?m.screen:'home');});
window.addEventListener('resize',()=>{if(activeScreen==='summary')renderSummary();});
if(!embedded)document.getElementById('demo-connection').textContent='Direct-open isolation is active. Open /demo/ in the address bar for shell navigation.';
render('home');
