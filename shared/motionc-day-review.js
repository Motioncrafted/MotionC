/* Explicit human composition only. Source/index handles identify frozen UI options, NOT walks. */
(function(root){
  'use strict';const C=root.MotionCSyncCore;
  const computed=new Set(['date','walks','distance','minutes','steps','walkingHr','updatedAt']);
  const fieldLabels={weight:'Weight (lb)',restingHr:'Resting heart rate',observation:'Observation',noRestaurant:'No restaurant food',noAlcohol:'No alcohol',noJunkFood:'No junk food',smokeFreeDay:'Smoke-free day',weightNote:'Weight note'};
  function signature(conflict){return conflict?{id:conflict.id,local:conflict.local,cloud:conflict.cloud,alternatives:conflict.alternatives||[]}:null;}
  function entry(record,date){const slot=JSON.stringify([C.DAILY,'entries',date]);return record&&Object.hasOwn(record,slot)?record[slot]:null;}
  function model(conflict){
    if(!/^Daily \/ \d{4}-\d{2}-\d{2}$/.test(conflict?.id||''))throw Error('Only Daily date conflicts can be composed.');
    const date=conflict.id.slice(8);
    const versions=[{key:'local',label:'This device',record:conflict.local},{key:'cloud',label:'Cloud',record:conflict.cloud},...(conflict.alternatives||[]).map((record,i)=>({key:'alternative-'+i,label:'Other saved version '+(i+1),record}))].map(v=>({...v,entry:entry(v.record,date)}));
    const walks=[];
    for(const v of versions){
      if(!v.entry)continue;
      const items=Array.isArray(v.entry.walks)?v.entry.walks:((Number(v.entry.distance)>0||Number(v.entry.minutes)>0)?[{distance:Number(v.entry.distance||0),minutes:Number(v.entry.minutes||0),steps:v.entry.steps??null,walkingHr:v.entry.walkingHr??null,...(v.entry.updatedAt?{recordedAt:v.entry.updatedAt}:{}),legacy:true}]:[]);
      items.forEach((walk,index)=>walks.push({handle:v.key+':'+index,label:v.label+' · '+(walk.legacy?'legacy daily total':'walk '+(index+1)),walk:C.clone(walk)}));
    }
    const fields=[];
    for(const name of new Set(versions.flatMap(v=>Object.keys(v.entry||{})))){
      if(computed.has(name))continue;
      const options=versions.map(v=>({key:v.key,label:v.label,present:Boolean(v.entry&&Object.hasOwn(v.entry,name)),value:v.entry?.[name]}));
      const same=options.every(o=>C.equal({present:o.present,value:o.value},{present:options[0].present,value:options[0].value}));
      fields.push({name,label:fieldLabels[name]||name,options,same});
    }
    return {date,versions,walks,fields};
  }
  // These are the existing Daily rules, now shared with review; no estimated minutes or pace.
  function walkTotals(entry){
    const walks=entry.walks;
    entry.distance=Math.round(walks.reduce((sum,walk)=>sum+Number(walk.distance||0),0)*100)/100;
    entry.minutes=walks.reduce((sum,walk)=>sum+Number(walk.minutes||0),0);
    entry.steps=walks.length&&walks.every(walk=>Number(walk.steps)>0)?walks.reduce((sum,walk)=>sum+Math.round(Number(walk.steps)),0):null;
    const allHrMeasured=walks.length&&walks.every(walk=>Number(walk.walkingHr)>0&&Number(walk.minutes)>0);
    entry.walkingHr=allHrMeasured?Math.round(walks.reduce((sum,walk)=>sum+Number(walk.walkingHr)*Number(walk.minutes),0)/entry.minutes):null;
    return entry;
  }
  function create(owner,conflict,revision){return {version:1,owner,id:conflict.id,sources:C.clone(conflict),cloudRevision:String(revision),walkDecisions:{},fieldChoices:{},verified:false,status:'draft',result:null,createdAt:new Date().toISOString()};}
  function compose(draft){
    const m=model(draft.sources),missing=[],out={date:m.date,walks:[]};
    for(const item of m.walks){const choice=draft.walkDecisions[item.handle];if(!['keep','duplicate','omit'].includes(choice))missing.push(item.label);else if(choice==='keep')out.walks.push(C.clone(item.walk));}
    if(!out.walks.length&&Object.values(draft.walkDecisions).includes('duplicate'))missing.push('A walk marked as a duplicate needs a retained walk.');
    for(const f of m.fields){const chosen=f.same?f.options[0]:f.options.find(o=>o.key===draft.fieldChoices[f.name]);if(!chosen)missing.push(f.label);else if(chosen.present)Object.defineProperty(out,f.name,{value:C.clone(chosen.value),enumerable:true,writable:true,configurable:true});}
    if(missing.length)return {ready:false,missing,result:null};
    walkTotals(out);return {ready:true,missing:[],result:out};
  }
  function record(draft,now=new Date().toISOString()){
    const composed=compose(draft);if(!composed.ready||!draft.verified)throw Error('Complete the explicit selections and review the resulting day first.');
    composed.result.updatedAt=now;return {[JSON.stringify([C.DAILY,'entries',composed.result.date])]:composed.result};
  }
  root.MotionCDayReview=Object.freeze({model,signature,create,compose,record,walkTotals});
})(typeof window!=='undefined'?window:globalThis);
