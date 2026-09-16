(() => {
  'use strict';
  const dailyKey='motionc-daily-prototype-v1',lifeKey='motionc-lifestyle-summary-v1';
  const set=(selector,text)=>{const e=document.querySelector(selector);if(e)e.textContent=text;};
  // Formatting is for supporting readouts only; never fed back into the engine.
  const fmt=v=>new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(v);
  function refresh(){
    const r=window.MotionCResponseLive.snapshot();
    const available=r.components.filter(c=>c.score!==null),missing=r.components.filter(c=>c.score===null);
    set('.dial-value strong',r.displayResponse??'—');
    document.querySelector('.dial-value strong').dataset.ready=String(r.response!==null);
    const movement=window.MotionCResponseDay?.display(r.response,r)||{text:'',title:''};
    set('#response-today-movement',movement.text);
    document.getElementById('response-today-movement').title=movement.title;
    set('.dial-value span',r.response===null?'Building your Response':r.D===50?'At the true pivot':r.D>50?'Above the 50 pivot':'Below the 50 pivot');
    const dial=document.querySelector('.dial');dial.setAttribute('aria-label',r.response===null?'Response unavailable: more evidence needed.':`Response ${r.displayResponse} out of 100. True pivot 50.`);
    const marker=document.getElementById('response-marker');
    if(marker){marker.setAttribute('visibility',r.response===null?'hidden':'visible');if(r.response!==null){
      // Same circle as the existing SVG path (radius 120, lower endpoints).
      const cy=207-Math.sqrt(120*120-105*105),start=Math.atan2(207-cy,-105),sweep=Math.PI+2*Math.atan2(207-cy,105);
      const a=start+sweep*r.response/100;marker.setAttribute('cx',String(170+120*Math.cos(a)));marker.setAttribute('cy',String(cy+120*Math.sin(a)));
    }}
    set('.direction .signal-value',r.direction||'—');
    set('.direction .signal-state',r.D===null?'Building Compass direction':`Direction value ${fmt(r.D)} / 100`);
    const signals=document.querySelectorAll('.signal');
    signals[1].querySelector('.signal-value').textContent=r.carryover===null?'—':fmt(r.carryover);
    signals[1].querySelector('.signal-value').dataset.ready=String(r.carryover!==null);
    signals[1].querySelector('.signal-state').textContent=r.carryover===null?'Need recorded inputs':`${available.length} of 5 components`;
    signals[2].querySelector('.signal-state').textContent='Not defined in V1';
    set('.visibility .signal-state','Not defined in V1');
    set('.evidence .days strong',r.completeDays);
    set('.evidence .description',`${r.dates.at(-1)} to ${r.dates[0]}. Sleep, Hydration and Stress each need all seven days.`);
    const details=document.getElementById('carryover-details');details.replaceChildren();
    r.components.forEach(c=>{const p=document.createElement('p'),name=c.key[0].toUpperCase()+c.key.slice(1);p.style.margin='6px 0';
      const unit={walking:' min today',sleep:' hr average',hydration:' oz average',stress:' / 5 average',lifestyle:' / 24'}[c.key];
      p.textContent=c.score===null?`${name}: excluded${['sleep','hydration','stress'].includes(c.key)?` (${c.days}/7 days)`: ' (no usable record)'}.`:`${name}: ${fmt(c.raw)}${unit} → ${fmt(c.score)} / 100; ${fmt(c.weight/r.availableWeight*100)}% of available weight${c.week?`; checklist ${c.week}`:''}.`;details.append(p);
    });
    set('#response-status',r.response===null?'More evidence needed':missing.length?'Calculated with reduced data':'All five Carryover components available');
    set('.remarks-lead',r.response===null?'Your Response is still taking shape.':r.D===50?'Your Compass direction sits at the pivot.':'Compass direction, with your Carryover context.');
    const main=r.D===null?'Compass does not yet have enough evidence for a direction.':r.carryover===null?'Carryover needs at least one usable component.':`Compass places Response ${r.D===50?'at':r.D>50?'above':'below'} 50. Carryover ${fmt(r.carryover)} modifies its distance from that pivot.`;
    set('.remarks .description',`${main} ${missing.length?`Excluded from Carryover: ${missing.map(c=>c.key).join(', ')}. Missing information is not scored as zero.`:'All five Carryover components contribute.'}`);
  }
  window.addEventListener('motionc:response-day-ready',refresh);
  refresh();
  window.addEventListener('focus',refresh);
  window.addEventListener('pageshow',refresh);
  window.addEventListener('storage',e=>{if(e.key===null||[dailyKey,lifeKey,'motionc-auth-active-user'].includes(e.key))refresh();});
  window.addEventListener('motionc:cloud-restored',refresh);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
  // Recompute across local midnight, even when this tab remains open.
  let day=new Date().toDateString();setInterval(()=>{const next=new Date().toDateString();if(day!==next){day=next;refresh();}},30000);
})();

