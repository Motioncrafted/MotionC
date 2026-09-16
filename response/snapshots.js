// Historical instrumentation only. Never supplies values back to the V1 engine.
(function(root){
  'use strict';
  const weights={walking:.30,sleep:.25,hydration:.20,stress:.15,lifestyle:.10};
  const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
  const near=(a,b)=>Math.abs(a-b)<1e-9;
  function snapshot(r){
    if(!r||!valid(r.response)||!Array.isArray(r.components)||r.components.some(c=>!c||typeof c!=='object'))return null;
    const value={snapshotVersion:1,calculationVersion:'response-v1-20260914',calculationDate:r.today,
      windowDates:r.dates,Response:r.response,Direction:r.D,direction:r.direction,Carryover:r.carryover,
      availableWeight:r.availableWeight,components:r.components.map(c=>({...c,effectiveWeight:c.score===null?0:c.weight/r.availableWeight}))};
    return usable(value)?JSON.parse(JSON.stringify(value)):null;
  }
  function usable(s){
    if(!s||s.snapshotVersion!==1||s.calculationVersion!=='response-v1-20260914'||!/^\d{4}-\d{2}-\d{2}$/.test(s.calculationDate)||!Array.isArray(s.windowDates)||s.windowDates.length!==7||!valid(s.Response)||!valid(s.Direction)||!valid(s.Carryover)||!Array.isArray(s.components)||s.components.length!==5)return false;
    if(s.components.some(c=>!c||typeof c!=='object')||new Set(s.components.map(c=>c.key)).size!==5)return false;
    if(new Set(s.windowDates).size!==7||s.windowDates.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d)))return false;
    let total=0,sum=0;
    for(const c of s.components){if(c.weight!==weights[c.key]||!(c.score===null||valid(c.score)))return false;if(c.score!==null){total+=c.weight;sum+=c.weight*c.score;}}
    if(!total||!near(total,s.availableWeight)||!near(sum/total,s.Carryover))return false;
    if(s.components.some(c=>!near(c.effectiveWeight,c.score===null?0:c.weight/total)))return false;
    return near(root.MotionCResponse.response(s.Direction,s.Carryover),s.Response);
  }
  const contents=s=>{if(!s)return null;const {capturedAt,...rest}=s;return JSON.stringify(rest);};
  function stamp(r,previous){const s=snapshot(r);if(!s)return null;return usable(previous)&&contents(s)===contents(previous)?previous:{...s,capturedAt:new Date().toISOString()};}
  function matches(s,value){return usable(s)&&s.Response===value;}
  function currentMatches(s,r){return usable(s)&&contents(s)===contents(snapshot(r));}
  root.MotionCResponseSnapshots=Object.freeze({snapshot,usable,stamp,matches,currentMatches});
})(typeof window==='undefined'?globalThis:window);
