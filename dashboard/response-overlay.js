(() => {
  'use strict';
  const dialog=document.getElementById('response-overlay'),trigger=document.getElementById('explain-response');
  if(!dialog||!trigger||!window.MotionCResponseLive)return;
  const fmt=v=>new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(v);
  const name=k=>k[0].toUpperCase()+k.slice(1);
  function phrase(c){
    if(c.score===null)return 'Not enough data';
    if(c.key==='walking'&&c.raw===0)return 'No walk recorded yet today';
    if(c.key==='stress')return c.score>=85?'Low recent stress burden':c.score>=65?'Some recent stress burden':c.score>=40?'Moderate recent stress burden':'Higher recent stress burden';
    const support=c.score>=85?'Strong':c.score>=65?'Good':c.score>=40?'Modest':'Limited';
    return `${support} ${['walking','lifestyle'].includes(c.key)?'current':'recent'} support`;
  }
  function interpretation(r){
    const available=r.components.filter(c=>c.score!==null),missing=r.components.filter(c=>c.score===null),walking=r.components.find(c=>c.key==='walking');
    if(!available.length)return 'There is not enough recorded information to describe Carryover yet.';
    const context=available.filter(c=>c.key!=='walking');
    const contextWeight=context.reduce((s,c)=>s+c.weight,0);
    const support=contextWeight?context.reduce((s,c)=>s+c.score*c.weight,0)/contextWeight:null;
    const parts=[];
    if(walking?.score!==null&&walking?.raw===0){parts.push(support!==null&&support>=65?'Your recorded conditions are generally supportive, but today’s Walking contribution has not started yet.':'Today’s Walking contribution has not started yet.');}
    else {
      const ranked=[...available].sort((a,b)=>b.score*b.weight-a.score*a.weight);
      const lead=ranked[0],second=ranked[1];
      parts.push(second&&Math.abs(lead.score*lead.weight-second.score*second.weight)<.005?`${name(lead.key)} and ${name(second.key)} currently make the largest weighted contributions.`:`${name(lead.key)} currently makes the largest weighted contribution.`);
    }
    if(missing.length)parts.push(`${missing.map(c=>name(c.key)).join(', ')} ${missing.length===1?'is':'are'} excluded while more data is needed.`);
    if(r.D===null)parts.push('Compass is still building a direction.');
    else if(r.D===50)parts.push('Compass places Response at the 50 pivot.');
    else if(Math.abs(r.carryover-50)<=5)parts.push('With Carryover near neutral, Response remains close to Compass.');
    else {const farther=(r.D>50&&r.carryover>50)||(r.D<50&&r.carryover<50);parts.push(`Carryover places Response ${farther?'farther from':'closer to'} the 50 pivot, on the same side as Compass.`);}
    return parts.join(' ');
  }
  const set=(id,text)=>{document.getElementById(id).textContent=text;};
  function render(){const r=window.MotionCResponseLive.snapshot();
    set('ro-value',r.displayResponse??'—');set('ro-position',r.response===null?'Building your Response':r.D===50?'At the 50 pivot':r.D>50?'Above the 50 pivot':'Below the 50 pivot');
    set('ro-direction',r.direction||'—');set('ro-d',r.D===null?'Not enough data':`${fmt(r.D)} / 100`);set('ro-carryover',r.carryover===null?'—':fmt(r.carryover));
    const rows=document.getElementById('ro-components');rows.replaceChildren();
    r.components.forEach(c=>{const row=document.createElement('div');row.className='ro-row';const title=document.createElement('div');title.className='ro-name';title.textContent=name(c.key)+' ';const weight=document.createElement('span');weight.className='ro-weight';weight.textContent=`— ${Math.round(c.weight*100)}%`;title.append(weight);const value=document.createElement('div');value.className='ro-score';value.textContent=c.score===null?'—':String(Math.round(c.score));if(c.score!==null){const unit=document.createElement('small');unit.textContent=' /100';value.append(unit);}const note=document.createElement('div');note.className='ro-note';note.textContent=phrase(c);row.append(title,value,note);rows.append(row);});
    const missing=r.components.filter(c=>c.score===null);set('ro-coverage',missing.length?'Unavailable components are excluded; available weights are renormalized.':'');set('ro-interpretation',interpretation(r));
  }
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','response-overlay');
  let returnPosition={x:0,y:0};
  trigger.addEventListener('click',()=>{if(dialog.open)return;returnPosition={x:window.scrollX,y:window.scrollY};render();dialog.showModal();});
  dialog.querySelector('.ro-close').addEventListener('click',()=>dialog.close());dialog.querySelector('.ro-dismiss').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{trigger.focus({preventScroll:true});window.scrollTo({left:returnPosition.x,top:returnPosition.y,behavior:'instant'});});
  const refresh=()=>{if(dialog.open)render();};
  window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);window.addEventListener('storage',refresh);window.addEventListener('motionc:cloud-restored',refresh);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
  // Also catch same-page checklist changes and midnight while the overlay is open.
  setInterval(refresh,1500);
})();
