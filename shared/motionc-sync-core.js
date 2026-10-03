/* Pure reconciliation. Dates and coupled groups are atomic; clocks never choose a winner. */
(function (root) {
  'use strict';
  const DAILY = 'motionc-daily-prototype-v1';
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o || {},k);
  const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  const canonical = v => JSON.stringify(v, (_k,x) => x && typeof x === 'object' && !Array.isArray(x)
    ? Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])) : x);
  const equal = (a,b) => canonical(a) === canonical(b);
  function equivalent(id,a,b){
    if(equal(a,b))return true;
    if(id!=='Compass history'||!a||!b)return false;
    // Independent devices can stamp identical evidence with different UUIDs/times.
    // Only a complete V2 pair/history with identical evidence is equivalent; do not
    // splice histories or infer equivalence merely from an angle/current value.
    const normalize=record=>Object.fromEntries(Object.entries(record).map(([path,raw])=>{
      let h;try{h=JSON.parse(raw);}catch{return [path,raw];}
      if(h?.version!==2||h.model!=='nes-v2'||!h.records)return [path,raw];
      const reading=r=>{if(!r)return r;if(typeof r.signature!=='string')return r;const v={...r};delete v.id;delete v.savedAt;delete v.sequence;return v;};
      return [path,{...h,current:reading(h.current),previous:reading(h.previous),records:Object.fromEntries(Object.entries(h.records).map(([date,r])=>[date,reading(r)]))}];
    }));
    return equal(normalize(a),normalize(b));
  }
  const eligible = k => k.startsWith('motionc-') && !k.startsWith('motionc-auth-') && !k.startsWith('motionc-analytics-') && k !== 'motionc-visitor-commons-wall-v1';
  const keyGroup = k => /^(motionc-weight-goal-v1|motionc-mcp-summary-v1)$/.test(k) ? 'Profile and goals'
    : k.startsWith('motionc-compass-') ? 'Compass history'
    : k.startsWith('motionc-response-') ? 'Response history'
    : k.startsWith('motionc-walking-') ? 'Walking journeys'
    : k === 'motionc-lifestyle-summary-v1' ? 'Lifestyle assessments' : k;
  function split(state) {
    const out = Object.create(null);
    function put(id,path,value) { (out[id] ||= Object.create(null))[JSON.stringify(path)] = clone(value); }
    for (const [key,raw] of Object.entries(state?.storage || {})) {
      if (!eligible(key) || typeof raw !== 'string') continue;
      let daily;
      if (key === DAILY) { try { daily=JSON.parse(raw); } catch {} }
      if (!daily || typeof daily !== 'object' || Array.isArray(daily)) { put(keyGroup(key),[key],raw); continue; }
      const shell = {...daily};
      for (const section of ['entries','dailyGauges','scratchPads','weeks','profile']) delete shell[section];
      put('Daily structure',[key,'$shell'],shell);
      for (const [date,value] of Object.entries(daily.entries || {})) put('Daily / '+date,[key,'entries',date],value);
      for (const [date,value] of Object.entries(daily.scratchPads || {})) put('Notes / '+date,[key,'scratchPads',date],value);
      for (const [date,gauges] of Object.entries(daily.dailyGauges || {})) {
        for (const [metric,value] of Object.entries(gauges || {})) put('Gauge / '+date+' / '+metric,[key,'dailyGauges',date,metric],value);
      }
      // The current summary and its assessments are coupled; never mix independent versions.
      if (own(daily,'weeks')) put('Lifestyle assessments',[key,'weeks'],daily.weeks);
      if (own(daily,'profile')) put('Profile and goals',[key,'profile'],daily.profile);
    }
    return out;
  }
  function join(records) {
    const storage = Object.create(null); let daily = null;
    for (const record of Object.values(records)) for (const [encoded,value] of Object.entries(record || {})) {
      const path = JSON.parse(encoded);
      if (path.length === 1) { storage[path[0]]=value; continue; }
      daily ||= {entries:{},dailyGauges:{},scratchPads:{}};
      if (path[1] === '$shell') { Object.assign(daily,clone(value)); continue; }
      let target=daily;
      for (const part of path.slice(1,-1)) {
        if (!own(target,part)) Object.defineProperty(target,part,{value:{},writable:true,enumerable:true,configurable:true});
        target=target[part];
      }
      Object.defineProperty(target,path.at(-1),{value:clone(value),writable:true,enumerable:true,configurable:true});
    }
    if (daily) storage[DAILY]=JSON.stringify(daily);
    return {schemaVersion:1,storage};
  }
  const value = (map,id) => own(map,id) ? map[id] : null;
  function changes(before,after) {
    const b=split(before),a=split(after),out=[];
    for (const id of new Set([...Object.keys(b),...Object.keys(a)])) if (!equivalent(id,value(b,id),value(a,id))) out.push({id,before:value(b,id),after:value(a,id)});
    return out;
  }
  function assign(map,id,v) { if (v === null) delete map[id]; else map[id]=clone(v); }
  function reconcile(base,local,cloud,previous={}) {
    const b=split(base),l=split(local),c=split(cloud),upload=clone(c),view=clone(c),conflicts={};
    for (const id of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(c),...Object.keys(previous)])) {
      const bv=value(b,id),lv=value(l,id),cv=value(c,id);
      if (equivalent(id,lv,cv) && !previous[id]?.alternatives?.length) continue;
      if (previous[id] || !base || (!equivalent(id,lv,bv) && !equivalent(id,cv,bv))) {
        conflicts[id]={...previous[id],id,base:previous[id]?.base ?? bv,local:lv,cloud:cv}; assign(view,id,lv);
      } else if (!equivalent(id,lv,bv)) { assign(view,id,lv); assign(upload,id,lv); }
    }
    return {upload:join(upload),view:join(view),conflicts};
  }
  // Durable intents preserve edits even if another tab wins a localStorage race.
  function replay(cloud,operations,initialConflicts={}) {
    const original=split(cloud),upload=split(cloud),view=split(cloud),conflicts=clone(initialConflicts);
    for (const [id,c] of Object.entries(conflicts)) assign(view,id,c.local);
    for (const op of operations) for (const change of op.changes) {
      const {id,before,after}=change,cv=value(upload,id),existing=conflicts[id];
      if (op.resolution) {
        if (equal(cv,op.resolution.cloud) && (!existing || equal(existing.local,op.resolution.local))) {
          assign(upload,id,after);assign(view,id,after);delete conflicts[id];
        } else { const remote=value(original,id);conflicts[id]={id,base:before,local:after,cloud:remote};assign(upload,id,remote);assign(view,id,after); }
      } else if (existing && (!equivalent(id,after,cv)||existing.alternatives?.length)) {
        // Preserve a third independent tab's version too, rather than replacing it.
        const alternatives=existing.alternatives || [];
        if (!equal(before,existing.local) && !equal(after,existing.local) && !alternatives.some(v=>equal(v,existing.local))) alternatives.push(existing.local);
        const remote=value(original,id);conflicts[id]={...existing,local:after,cloud:remote,alternatives};assign(upload,id,remote);assign(view,id,after);
      } else if (equivalent(id,cv,before) || equivalent(id,cv,after)) {
        const accepted=equivalent(id,cv,after)?cv:after;
        assign(upload,id,accepted);assign(view,id,accepted);delete conflicts[id];
      } else {
        const remote=value(original,id),alternatives=!equal(cv,remote)&&!equal(cv,after)?[cv]:[];
        conflicts[id]={id,base:before,local:after,cloud:remote,alternatives};assign(upload,id,remote);assign(view,id,after);
      }
    }
    return {upload:join(upload),view:join(view),conflicts};
  }
  const api={DAILY,clone,equal,equivalent,eligible,split,join,changes,reconcile,replay,value,assign};
  root.MotionCSyncCore=Object.freeze(api);
  if (typeof module !== 'undefined') module.exports=api;
})(typeof window !== 'undefined' ? window : globalThis);
