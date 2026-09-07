(() => {
  'use strict';
  const KEY = 'motionc-compass-daily-history-v1';
  const fixture = new URLSearchParams(location.search).has('fixture');
  const el = id => document.getElementById(id);
  const localDate = value => { const d = value ? new Date(value) : new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const shift = (date, days) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+days); return localDate(d); };
  const validDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date) && localDate(`${date}T12:00:00`) === date;
  const validAngle = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 360;
  const delta = (angle, centre) => ((angle-centre+540)%360)-180;
  const bearing = angle => `${angle.toFixed(3)}°`;
  const dateLabel = date => new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
  const read = key => { try { return JSON.parse(localStorage.getItem(key)||'{}') || {}; } catch { return {}; } };
  let interpretationState = {}, interpretationResult = null;
  let history = {records:{}}, windowEnd = localDate(), owner = null, selectedDate = null;
  let writeFailed = false, pendingCloud = false, priorDisplayed = null;

  // This is a separate presentation scale. No calculated angle is overwritten.
  // Fixed calibration prevents a stationary raw needle moving when the window changes.
  function displayAngle(angle) {
    const c = history.calibration;
    if (!c || !validAngle(c.centre)) return angle;
    const sector = Math.round(c.centre/45)*45;
    const centreOffset = delta(c.centre, sector);
    const offset = delta(angle, sector);
    if (Math.abs(offset) >= 22.5) return angle;
    const distance = offset-centreOffset;
    const room = distance < 0 ? 22.5+centreOffset : 22.5-centreOffset;
    if (room < 0.01) return angle;
    const expanded = room * Math.tanh(c.gain*distance/room) / Math.tanh(c.gain);
    return (c.centre+expanded+360)%360;
  }

  function load() {
    const saved=fixture?{}:read(KEY);
    const records=Object.fromEntries(Object.entries(saved.records||{}).filter(([date,r])=>validDate(date)&&validAngle(r?.angle)));
    history={...saved,version:1,records};
    if(history.calibration && (!validAngle(history.calibration.centre)||history.calibration.gain!==24))delete history.calibration;
  }

  function persist() {
    if(fixture)return;
    try {
      const value=JSON.stringify(history);
      if(localStorage.getItem(KEY)!==value){localStorage.setItem(KEY,value);pendingCloud=true;}
      writeFailed=false;
    } catch { writeFailed=true; }
  }

  // The existing shared bridge captures motionc-* keys. Explicitly queue the
  // first capture as well: its boot-time baseline can otherwise miss a new record.
  let syncing=false;
  async function syncHistory() {
    const bridge=window.MotionCSupabase;
    if(!pendingCloud||syncing||!bridge)return;
    syncing=true;
    try {
      const session=await bridge.getSession();
      const active=localStorage.getItem('motionc-auth-active-user');
      if(session?.user?.id && active===session.user.id && owner===active){
        const snapshot=localStorage.getItem(KEY);
        await bridge.saveCloudState(active);
        if(localStorage.getItem(KEY)===snapshot)pendingCloud=false;
      }
    } catch { /* Existing bridge retries changes; retain the local record. */ }
    finally { syncing=false; }
  }

  function prepare(result, state) {
    interpretationState=state;interpretationResult=result;
    const active=localStorage.getItem('motionc-auth-active-user');
    if(owner!==active){owner=active;windowEnd=localDate();selectedDate=null;pendingCloud=false;priorDisplayed=null;}
    load();
    const today=localDate();
    if(result.defensible && validAngle(result.angle)) {
      if(!history.calibration){
        const samples=Object.entries(history.records).sort(([a],[b])=>a.localeCompare(b)).map(([,r])=>r.angle);
        const first=samples[0]??result.angle;
        const offsets=samples.map(a=>delta(a,first)).sort((a,b)=>a-b);
        const middle=offsets.length?offsets[Math.floor(offsets.length/2)]:0;
        history.calibration={centre:(first+middle+360)%360,gain:24,status:'provisional',method:'bounded-sector-v1'};
      }
      const old=history.records[today];
      if(!old || old.angle!==result.angle || old.x!==result.x || old.y!==result.y){
        history.records[today]={angle:result.angle,x:result.x,y:result.y,direction:result.direction,updatedAt:new Date().toISOString(),source:'daily-reading'};
      }
      persist();
    }
    const previous=history.records[shift(today,-1)]||null;
    el('actualDirection').textContent=result.defensible?`Actual direction: ${result.direction} · ${bearing(result.angle)}`:'Actual direction: awaiting enough data';
    el('displayScaleNote').textContent=history.calibration?'Sensitive display · up to 24× near your reference direction; bounded within the original directional zone. Provisional scale.':'Sensitive display will begin with your first direction.';
    el('previousNote').textContent=previous?`Previous · yesterday, ${bearing(previous.angle)}`:'Previous · no saved reading for yesterday';
    renderHistory();
    const mapped=result.defensible?displayAngle(result.angle):0;
    const angle=priorDisplayed===null?mapped:priorDisplayed+delta(mapped,priorDisplayed);
    priorDisplayed=angle;
    return {angle,previous};
  }

  function svgNode(name,attrs={},text) {
    const node=document.createElementNS('http://www.w3.org/2000/svg',name);
    Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,String(v)));
    if(text!==undefined)node.textContent=text;
    return node;
  }

  function renderHistory() {
    const today=localDate();
    const dates=Object.keys(history.records).filter(d=>d<=today).sort();
    if(windowEnd>today)windowEnd=today;
    const earliest=dates[0]||today;
    const earliestEnd=shift(earliest,13)<today?shift(earliest,13):today;
    if(windowEnd<earliestEnd)windowEnd=earliestEnd;
    const start=shift(windowEnd,-13);
    el('historyBack').disabled=!dates.length||start<=earliest;
    el('historyForward').disabled=windowEnd>=today;
    el('historyRange').textContent=`${dateLabel(start)} – ${windowEnd===today?'Today':dateLabel(windowEnd)}`;
    const points=[];let last=null;
    for(let i=0;i<14;i++){
      const date=shift(start,i),r=history.records[date];
      if(!r)continue;
      // Unwrap only the chart coordinate so 359° -> 1° is a 2° step.
      // Tooltips always show the untouched stored bearing.
      const value=last===null?r.angle:last+delta(r.angle,last);
      last=value;points.push({date,raw:r.angle,value,index:i});
    }
    const svg=el('historyPlot');svg.replaceChildren();
    const width=Math.max(300,svg.parentElement.clientWidth),height=145,left=70,right=24,top=25,bottom=44;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const x=i=>left+i/13*(width-left-right);
    const values=points.map(p=>p.value);
    const low=values.length?Math.min(...values):0,high=values.length?Math.max(...values):1;
    const span=Math.max(high-low,.1),padding=span*.2;
    const min=low-padding,max=high+padding;
    const y=v=>top+(max-v)/(max-min)*(height-top-bottom);
    for(let i=0;i<3;i++){
      const value=min+(max-min)*i/2,yy=y(value);
      svg.append(svgNode('line',{x1:left,x2:width-right,y1:yy,y2:yy,class:'history-gridline'}));
      svg.append(svgNode('text',{x:left-12,y:yy+4,'text-anchor':'end',class:'history-axis'},`${value.toFixed(3)}°`));
    }
    for(const i of (width<500?[0,6,13]:[0,3,6,9,13])){
      const date=shift(start,i);
      const label=date===today?'Today':new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'});
      svg.append(svgNode('text',{x:x(i),y:height-12,'text-anchor':i===13?'end':i===0?'start':'middle',class:date===today?'history-today-label':'history-axis'},label));
    }
    if(start<=today&&today<=windowEnd){const xx=x(13);svg.append(svgNode('line',{x1:xx,x2:xx,y1:top,y2:height-bottom,class:'history-today-line'}));}
    let prior=null;
    for(const p of points){
      if(prior&&p.index===prior.index+1)svg.append(svgNode('line',{x1:x(prior.index),y1:y(prior.value),x2:x(p.index),y2:y(p.value),class:'history-line'}));
      prior=p;
    }
    for(const p of points){
      const group=svgNode('g',{tabindex:0,role:'button','aria-label':`${dateLabel(p.date)}${p.date===today?', Today':''}: ${bearing(p.raw)}`,class:'history-point','data-date':p.date,'data-angle':p.raw});
      group.append(svgNode('circle',{cx:x(p.index),cy:y(p.value),r:Math.min(16,(width-left-right)/26),fill:'transparent'}));
      group.append(svgNode('circle',{cx:x(p.index),cy:y(p.value),r:p.date===today?6:4.5,class:p.date===today?'history-dot today':'history-dot'}));
      group.append(svgNode('title',{},`${dateLabel(p.date)} · ${bearing(p.raw)}`));
      const select=()=>{selectedDate=p.date;el('historyReadout').textContent=`${dateLabel(p.date)}${p.date===today?' · Today':''} — ${bearing(p.raw)} actual direction`;svg.querySelectorAll('.history-point').forEach(n=>n.classList.toggle('selected',n===group));};
      group.addEventListener('pointerenter',select);group.addEventListener('focus',select);group.addEventListener('click',select);group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});
      svg.append(group);
    }
    const current=points.find(p=>p.date===selectedDate)||points.at(-1);
    el('historyReadout').textContent=current?`${dateLabel(current.date)}${current.date===today?' · Today':''} — ${bearing(current.raw)} actual direction`:'No saved Compass readings in this window.';
    el('historyStatus').textContent=fixture?'Preview fixture — simulated readings are not saved.':writeFailed?'This browser could not save the latest reading.':`${points.length} of 14 days recorded. Gaps mean no saved reading. Daily readings are saved when you open Compass; today updates as your data changes.`;
    window.MotionCCompassInterpretation.render({state:interpretationState,result:interpretationResult,records:history.records,start,end:windowEnd,today});
    el('historyScale').textContent='Actual direction in degrees clockwise from North · vertical scale fits this window'+(values.some(v=>v<0||v>=360)?' · axis continues through North (360° = 0°).':'.');
  }
  el('historyBack').addEventListener('click',()=>{windowEnd=shift(windowEnd,-7);selectedDate=null;renderHistory();});
  el('historyForward').addEventListener('click',()=>{windowEnd=shift(windowEnd,7);selectedDate=null;renderHistory();});
  el('historyToday').addEventListener('click',()=>{windowEnd=localDate();selectedDate=null;renderHistory();});
  window.addEventListener('storage',event=>{if(event.key===KEY||event.key==='motionc-auth-active-user'){owner=null;load();windowEnd=localDate();renderHistory();}});
  window.addEventListener('resize',renderHistory);
  setInterval(syncHistory,2000);
  window.MotionCCompassDisplay=Object.freeze({prepare,displayAngle});
})();
