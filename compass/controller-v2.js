(()=>{'use strict';
 const C=window.CompassV2,H=window.CompassV2History,$=id=>document.getElementById(id);
 if(!C||!H||!window.CompassV2Language||!window.CompassV2Cards||!window.CompassV2DirectionView){$('directionUnavailable').textContent='Compass could not be loaded. Please reload.';return;}
 let owner=null,lastPresentation=null,historyEnd=null;
 const text=(id,value)=>$(id).textContent=value,day=()=>C.dayKey(new Date()),read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
 const shift=(d,n)=>{const date=new Date(d+'T12:00:00');date.setDate(date.getDate()+n);return C.dayKey(date);};
 const dateLabel=d=>new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
 const short=n=>Number(n.toPrecision(6)).toString();
 const svgNS='http://www.w3.org/2000/svg';
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
  if(!rows.length){const e=document.createElement('p');e.textContent='No saved direction readings in this period.';box.append(e);}
  for(const r of rows){const e=document.createElement('details');e.className='history-reading';e.dataset.date=r.asOf;const s=document.createElement('summary');s.textContent=dateLabel(r.asOf);const b=document.createElement('strong');b.textContent=r.angle.toFixed(1)+'°';s.append(b);e.append(s);const p=document.createElement('p');p.textContent='Saved '+new Date(r.savedAt).toLocaleString()+'. '+Math.round(r.coverage*100)+'% recorded coverage.';e.append(p);box.append(e);}
 }
 function contribution(d){return d.key==='recovery'?short(d.vector.x)+' eastward':d.vector.y===0?'no net north/south contribution':short(Math.abs(d.vector.y))+(d.vector.y>0?' northward':' southward');}
 function renderSaveStatus(p){
  const errors={'save-failed':'This reading could not be saved on this device.','history-unreadable':'Saved V2 history could not be read. This reading has not been saved.','history-owner-or-version-mismatch':'Saved V2 history is not available for this account or calculation version. This reading has not been saved.','clock-before-saved-reading':'This device’s date or time is before its latest saved reading. This reading has not been saved.','account-not-ready':'Waiting for your account data before saving a V2 reading.'};
  text('saveStatus',errors[p.error]||'');
 }
 function refresh(){
  const active=localStorage.getItem('motionc-auth-active-user'),ready=window.MotionCAccountReady?.owner;
  const nextOwner=active&&active===ready?active:null;
  if(nextOwner!==owner){owner=nextOwner;historyEnd=null;lastPresentation=null;}
  const s=owner?read('motionc-daily-prototype-v1')||{}:{};
  const r=C.calculate(s,{asOf:day()});if(owner)window.renderMcpPosition(s);else{text('mcpScore','—');text('mcpZone','Not assessed');$('mcpPosition').setAttribute('aria-label','Current position: MCP not assessed');}
  text('coverage',Math.round(r.coverage*100)+'% recorded coverage. Coverage describes available evidence, not certainty.');
  const p=H.observe({storage:localStorage,owner,ready:Boolean(owner),result:r,state:s});lastPresentation=p;window.CompassV2DirectionView.render(r,p);renderSaveStatus(p);window.CompassV2Cards.render(s,r,p.previous,owner);renderHistory(p);
 }
 for(const [id,fn] of [['historyBack',()=>{historyEnd=shift(historyEnd||day(),-7);}],['historyForward',()=>{historyEnd=shift(historyEnd||day(),7);if(historyEnd>day())historyEnd=day();}],['historyToday',()=>{historyEnd=null;}]])$(id).addEventListener('click',()=>{fn();if(lastPresentation)renderHistory(lastPresentation);});
 if(new URLSearchParams(location.search).get('from')==='summary'){$('compassReturnLink').href='../dashboard/';text('compassReturnLink','← Back to Summary');}
 window.addEventListener('motionc:account-changing',()=>{window.MotionCAccountReady=null;refresh();});
 for(const event of ['motionc:account-ready','motionc:cloud-restored','motionc:preferences-updated','focus'])window.addEventListener(event,refresh);
 window.addEventListener('storage',e=>{if([null,H.KEY,'motionc-daily-prototype-v1','motionc-auth-active-user','motionc-preferences-v1'].includes(e.key))refresh();});
 window.addEventListener('resize',()=>{if(lastPresentation)renderHistory(lastPresentation);});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 // Input/day fingerprint prevents this check, focus, or reload from creating duplicate readings.
 setInterval(()=>{if(!document.hidden)refresh();},15000);refresh();
})();
