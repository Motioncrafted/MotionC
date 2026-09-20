/* Frozen V1 compatibility. V2 and generic Compass globals are never consulted. */
(()=>{'use strict';
 const read=key=>{try{const x=JSON.parse(localStorage.getItem(key)||'null');return x&&typeof x==='object'?x:null;}catch{return null;}};
 function fromInputs(state={},summary=null,today){
  const legacy=window.ResponseCompassV1;let compass=null;
  if(legacy?.model==='compass-v1-legacy')try{compass=legacy.calculate({entries:state.entries||{},weeks:state.weeks||{},profile:state.profile||{},dailyGauges:state.dailyGauges||{}});}catch{compass=null;}
  return window.MotionCResponse.calculate(state,summary,compass,today);
 }
 function snapshot(){return fromInputs(read('motionc-daily-prototype-v1')||{},read('motionc-lifestyle-summary-v1'));}
 window.MotionCResponseLive=Object.freeze({directionModel:'compass-v1-legacy',snapshot,fromInputs});
})();
