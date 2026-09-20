(function(root){'use strict';
 const KEY='motionc-compass-daily-history-v2',MODEL='nes-v2',REVISION='nes-v2-waist05-112d-1';
 const clone=x=>JSON.parse(JSON.stringify(x));
 function canonical(x){if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';if(x&&typeof x==='object')return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';return JSON.stringify(x);}
 const angle=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=180;
 const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
 function valid(r,owner,today,now){return Boolean(r&&r.owner===owner&&r.model===MODEL&&r.calculationVersion===REVISION&&r.accepted===true&&angle(r.angle)&&date(r.asOf)&&r.asOf<=today&&typeof r.id==='string'&&r.id&&Number.isFinite(Date.parse(r.savedAt))&&Date.parse(r.savedAt)<=now&&Number.isInteger(r.sequence)&&r.sequence>0&&Array.isArray(r.drivers)&&r.drivers.length===4&&r.drivers.every(d=>d&&Number.isFinite(d.vector?.x)&&Number.isFinite(d.vector?.y)&&d.inputs)&&r.evidence&&typeof r.signature==='string');}
 function comparison(current,previous,prefix='Since last reading: '){if(!angle(current)||!angle(previous))return '';const delta=current-previous;if(Math.abs(delta)<=1e-12)return prefix+'Direction unchanged.';return prefix+(Math.abs(delta)<.1?'Less than 0.1':Math.abs(delta).toFixed(1))+'° toward '+(delta<0?'North':'South')+'.';}
 function material(result,state){
  const asOf=result.asOf,days=(key,span)=>date(key)&&key<=asOf&&(Date.parse(asOf)-Date.parse(key))/86400000<span;
  const entries=Object.entries(state.entries||{}).filter(([d])=>days(d,35)).map(([d,e])=>({date:d,minutes:days(d,14)?e.minutes??null:null,distance:days(d,14)?e.distance??null:null,weight:e.weight??null})).sort((a,b)=>a.date.localeCompare(b.date));
  const gauges=Object.fromEntries(Object.entries(state.dailyGauges||{}).filter(([d])=>days(d,14)).map(([d,g])=>[d,{sleep:g.sleep?.value??null,stress:g.stress?.value??null,hydration:g.hydration?.value??null}]));
  const drivers=clone(result.drivers);for(const d of drivers){if(d.waist&&!d.waist.qualified)d.waist={qualified:false,status:'omitted'};if(d.key==='bodyTrend'){delete d.inputs.waistCurrent;delete d.inputs.waistTrend;}}
  return {asOf,angle:result.angle,x:result.x,y:result.y,coverage:result.coverage,magnitude:result.magnitude,direction:result.direction,drivers,evidence:{entries,gauges}};
 }
 function read(storage){const raw=storage.getItem(KEY);return raw?JSON.parse(raw):null;}
 // One atomic local write: daily snapshots plus the pair, never source inputs or V1 keys.
 function observe({storage,owner,ready,result,state={},now=new Date(),id=()=>root.crypto.randomUUID()}){
  const empty={previous:null,current:null,text:'',saved:false,changed:false,history:null,error:null};
  if(!ready||!owner)return {...empty,error:'account-not-ready'};
  let history;try{history=read(storage);}catch{return {...empty,error:'history-unreadable'};}
  if(history&&(history.version!==2||history.model!==MODEL||history.calculationVersion!==REVISION||history.owner!==owner||!history.records||typeof history.records!=='object'))return {...empty,error:'history-owner-or-version-mismatch'};
  history=history||{version:2,model:MODEL,calculationVersion:REVISION,owner,records:{},current:null,previous:null};
  const today=result.asOf,stamp=+now;
  const localToday=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  if(!date(today)||!Number.isFinite(stamp)||today!==localToday)return {...empty,error:'invalid-date'};
  const all=[history.current,history.previous,...Object.values(history.records)].filter(r=>valid(r,owner,today,stamp));
  const unique=[...new Map(all.map(r=>[r.id,r])).values()].sort((a,b)=>a.sequence-b.sequence||a.savedAt.localeCompare(b.savedAt));
  const latest=unique.at(-1)||null,prior=unique.at(-2)||null;
  if(!result.accepted||result.model!==MODEL||!angle(result.angle))return {...empty,history};
  const value=material(result,state);
  // atan2/hypot can differ by a last binary digit between runtimes. A restored
  // reading's identity follows evidence and drivers, not derived display math.
  const signature=canonical({asOf:value.asOf,drivers:value.drivers,evidence:value.evidence});
  if(latest?.signature===signature)return {...empty,history,current:latest,previous:prior,saved:true,text:prior?comparison(latest.angle,prior.angle):'V2 baseline established.'};
  if(history.current&&(history.current.asOf>today||Date.parse(history.current.savedAt)>stamp))return {...empty,history,error:'clock-before-saved-reading'};
  const current={...value,id:id(),owner,model:MODEL,calculationVersion:REVISION,accepted:true,savedAt:now.toISOString(),sequence:(latest?.sequence||0)+1,signature};
  const next={...history,current,previous:latest,records:{...history.records,[today]:current}};
  try{storage.setItem(KEY,JSON.stringify(next));}catch{return {...empty,history,previous:latest,text:latest?comparison(result.angle,latest.angle,'Compared with last saved reading: '):'',error:'save-failed'};}
  return {...empty,history:next,current,previous:latest,saved:true,changed:true,text:latest?comparison(result.angle,latest.angle):'V2 baseline established.'};
 }
 const api=Object.freeze({KEY,MODEL,REVISION,observe,comparison,valid,canonical,material});root.CompassV2History=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
