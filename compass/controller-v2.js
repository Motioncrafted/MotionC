(()=>{'use strict';
 const C=window.CompassV2,H=window.CompassV2History,$=id=>document.getElementById(id);
 if(!C||!H||!window.CompassV2Cards||!window.CompassV2Meaning){$('direction').textContent='Compass unavailable';$('angle').textContent='The Compass calculation could not be loaded. Please reload.';return;}
 let owner=null,frame=null,shown=null,target=null,lastPresentation=null,historyEnd=null,lastState=null;
 const text=(id,value)=>$(id).textContent=value,day=()=>C.dayKey(new Date()),read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
 const shift=(d,n)=>{const date=new Date(d+'T12:00:00');date.setDate(date.getDate()+n);return C.dayKey(date);};
 const dateLabel=d=>new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
 const short=n=>Number(n.toPrecision(6)).toString();
 const svgNS='http://www.w3.org/2000/svg';
 for(const a of [...Array.from({length:37},(_,i)=>i*5),225,270,315]){const r=a*Math.PI/180,l=document.createElementNS(svgNS,'line'),left=a>180;Object.entries({x1:250+Math.sin(r)*(left?80:a%30===0?211:220),y1:250-Math.cos(r)*(left?80:a%30===0?211:220),x2:250+Math.sin(r)*(left?168:230),y2:250-Math.cos(r)*(left?168:230),stroke:left?'#b0b5b0':'#789383','stroke-width':a%30===0?2:1}).forEach(([k,v])=>l.setAttribute(k,v));$('spokes').append(l);}
 function animate(angle){
  if(angle===null){cancelAnimationFrame(frame);target=null;$('needle').hidden=true;shown=null;return;}
  if(angle===target)return;cancelAnimationFrame(frame);target=angle;
  $('needle').hidden=false;const start=shown??angle,t0=performance.now(),duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:500;
  const step=now=>{const t=duration?Math.min(1,(now-t0)/duration):1;shown=C.interpolate(start,angle,t);$('needle').style.transform=`translate(-50%,-100%) rotate(${shown}deg)`;if(t<1)frame=requestAnimationFrame(step);};step(t0);
 }
 function renderHistory(p){
  const end=historyEnd||day(),start=shift(end,-13),records=p.history?.records||{};
  text('historyRange',dateLabel(start)+' – '+dateLabel(end));const box=$('v2History');box.replaceChildren();
  const valid=Object.values(records).filter(r=>H.valid(r,owner,day(),Date.now()));
  const earliest=valid.map(r=>r.asOf).sort()[0];$('historyBack').disabled=!earliest||earliest>=start;$('historyForward').disabled=end>=day();
  const rows=valid.filter(r=>r.asOf>=start&&r.asOf<=end).sort((a,b)=>a.asOf.localeCompare(b.asOf));
  const svg=$('historyPlot');svg.replaceChildren();const width=Math.max(300,svg.parentElement.clientWidth),height=180,left=65,right=20,top=20,bottom=35;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const node=(tag,attrs,content)=>{const n=document.createElementNS(svgNS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(content)n.textContent=content;svg.append(n);return n;};
  const x=date=>left+(C.dayNumber(date)-C.dayNumber(start))/13*(width-left-right),y=angle=>top+angle/180*(height-top-bottom);
  for(const a of [0,90,180]){node('line',{x1:left,x2:width-right,y1:y(a),y2:y(a),class:'history-gridline'});node('text',{x:left-10,y:y(a)+4,'text-anchor':'end',class:'history-axis'},a+'°');}
  for(const i of [0,6,13])node('text',{x:x(shift(start,i)),y:height-8,'text-anchor':i===0?'start':i===13?'end':'middle',class:'history-axis'},new Date(shift(start,i)+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'}));
  let previous=null;for(const r of rows){if(previous&&C.dayNumber(r.asOf)-C.dayNumber(previous.asOf)===1)node('line',{x1:x(previous.asOf),x2:x(r.asOf),y1:y(previous.angle),y2:y(r.angle),class:'history-line'});const n=node('circle',{cx:x(r.asOf),cy:y(r.angle),r:5,class:'history-point',tabindex:0,role:'button','aria-label':dateLabel(r.asOf)+': '+r.angle.toFixed(3)+' degrees. Show saved evidence.'});const select=()=>{const detail=box.querySelector(`[data-date="${r.asOf}"]`);if(detail){detail.open=true;detail.querySelector('summary').focus();}};n.addEventListener('click',select);n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});previous=r;}
  if(!rows.length){const e=document.createElement('p');e.textContent='No saved V2 direction in this window.';box.append(e);}
  for(const r of rows){const e=document.createElement('details');e.className='history-reading';e.dataset.date=r.asOf;const s=document.createElement('summary');s.textContent=dateLabel(r.asOf);const b=document.createElement('strong');b.textContent=r.angle.toFixed(1)+'° · '+r.direction;s.append(b);e.append(s);const p=document.createElement('p');p.textContent='Saved '+new Date(r.savedAt).toLocaleString()+'. '+Math.round(r.coverage*100)+'% recorded coverage.';e.append(p);for(const d of r.drivers){const p=document.createElement('p');p.textContent=(d.key==='bodyTrend'?'Body Trend':d.key[0].toUpperCase()+d.key.slice(1))+': '+contribution(d);e.append(p);}box.append(e);}
 }
 function contribution(d){return d.key==='recovery'?short(d.vector.x)+' eastward':d.vector.y===0?'no net north/south contribution':short(Math.abs(d.vector.y))+(d.vector.y>0?' northward':' southward');}
 function driverChanges(p,r){if(!p.previous||!r.accepted)return;
  for(const [i,id] of ['movementCard','recoveryCard','supportCard','bodyCard'].entries()){
   const before=p.previous.drivers[i],after=r.drivers[i];if(!before||before.key!==after.key)continue;
   const changed=before.vector.x!==after.vector.x||before.vector.y!==after.vector.y;
   const comparable=inputs=>{const v={...inputs};delete v.waistCurrent;delete v.waistTrend;return v;};
   const evidenceChanged=H.canonical(comparable(before.inputs))!==H.canonical(comparable(after.inputs));
   if(!changed&&!evidenceChanged)continue;
   const paragraph=document.createElement('p');paragraph.className='driver-change';
   paragraph.textContent='Since the previous saved reading: '+(changed?contribution(before)+' → '+contribution(after)+'.':'Recorded evidence changed; the calculated contribution is unchanged.');
   const fields={movement:[['walkingDays','Walking days'],['walkingMinutes','Walking minutes'],['streakDays','Streak days']],recovery:[['sleepAverageHours','Sleep average (hours)'],['sleepDays','Sleep readings'],['stressAverage','Stress average'],['stressDays','Stress readings']],support:[['hydrationDays','Hydration readings'],['lifestyleWeek','Saved Lifestyle date']],bodyTrend:[['weightMeasurements','Weight readings']]};
   for(const [key,label] of fields[after.key]||[]){const a=before.inputs[key],b=after.inputs[key];if(a!==b)paragraph.textContent+=` ${label}: ${a??'not recorded'} → ${b??'not recorded'}.`;}
   if(before.inputs.vibratoryZone&&after.inputs.vibratoryZone&&H.canonical(before.inputs.vibratoryZone)!==H.canonical(after.inputs.vibratoryZone))paragraph.textContent+=' The recorded goal range changed.';
   $(id).querySelector('details').append(paragraph);
  }
 }
 function renderPrevious(p,r){const marker=$('previousPosition'),previous=r.accepted?p.previous:null;marker.hidden=!previous;$('previousDetails').hidden=!previous;
  text('previousComparison',r.accepted?p.text:'');$('previousComparison').hidden=!r.accepted||!p.text;
  if(previous){const rad=previous.angle*Math.PI/180;marker.style.left=(50+46.5*Math.sin(rad))+'%';marker.style.top=(50-46.5*Math.cos(rad))+'%';text('previousDescription',`Previous saved V2 reading: ${new Date(previous.savedAt).toLocaleString()} · ${previous.angle.toFixed(3)}° · ${previous.direction}. The hollow grey dot marks this position.`);}
  const errors={'save-failed':'This reading could not be saved on this device.','history-unreadable':'Saved V2 history could not be read. This reading has not been saved.','history-owner-or-version-mismatch':'Saved V2 history is not available for this account or calculation version. This reading has not been saved.','clock-before-saved-reading':'This device’s date or time is before its latest saved reading. This reading has not been saved.','account-not-ready':'Waiting for your account data before saving a V2 reading.'};
  text('saveStatus',errors[p.error]||'');
 }
 function refresh(){
  const active=localStorage.getItem('motionc-auth-active-user'),ready=window.MotionCAccountReady?.owner;
  const nextOwner=active&&active===ready?active:null;
  if(nextOwner!==owner){owner=nextOwner;historyEnd=null;lastPresentation=null;shown=null;target=null;cancelAnimationFrame(frame);}
  const s=owner?read('motionc-daily-prototype-v1')||{}:{};lastState=s;
  const r=C.calculate(s,{asOf:day()});window.CompassV2Cards.render(s,r);if(owner)window.renderMcpGauge(s);else{text('mcpScore','—');text('mcpZone','Not assessed');$('centreGauge').setAttribute('aria-label','MCP not assessed');}
  const meaning=CompassV2Meaning.describe(r);text('direction',meaning.direction||'No supported direction');text('directionMeaning',meaning.meaning||'');$('directionMeaning').hidden=!meaning.meaning;
  text('angle',meaning.degrees||(r.coverage<.35?'There is not enough recorded evidence to establish a direction.':'The recorded contributions do not yet form a strong enough net direction.'));$('angle').title=r.accepted?`${r.angle}° · true 1× angle`:'';
  text('coverage',Math.round(r.coverage*100)+'% recorded coverage. Coverage describes available evidence, not certainty.');animate(r.accepted?r.angle:null);
  const p=H.observe({storage:localStorage,owner,ready:Boolean(owner),result:r,state:s});lastPresentation=p;renderPrevious(p,r);driverChanges(p,r);renderHistory(p);
 }
 for(const [id,fn] of [['historyBack',()=>{historyEnd=shift(historyEnd||day(),-7);}],['historyForward',()=>{historyEnd=shift(historyEnd||day(),7);if(historyEnd>day())historyEnd=day();}],['historyToday',()=>{historyEnd=null;}]])$(id).addEventListener('click',()=>{fn();if(lastPresentation)renderHistory(lastPresentation);});
 if(new URLSearchParams(location.search).get('from')==='summary'){$('compassReturnLink').href='../dashboard/';text('compassReturnLink','← Back to Summary');}
 window.addEventListener('motionc:account-changing',()=>{window.MotionCAccountReady=null;refresh();});
 for(const event of ['motionc:account-ready','motionc:cloud-restored','motionc:preferences-updated','focus'])window.addEventListener(event,refresh);
 window.addEventListener('storage',e=>{if([null,H.KEY,'motionc-daily-prototype-v1','motionc-auth-active-user','motionc-preferences-v1'].includes(e.key))refresh();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 // Input/day fingerprint prevents this check, focus, or reload from creating duplicate readings.
 setInterval(()=>{if(!document.hidden)refresh();},15000);refresh();
})();
