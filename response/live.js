(() => {
  'use strict';
  const read=key=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'?v:null;}catch{return null;}};
  function snapshot(){
    const state=read('motionc-daily-prototype-v1')||{};
    const compassState={entries:state.entries||{},weeks:state.weeks||{},profile:state.profile||{},dailyGauges:state.dailyGauges||{}};
    const compass=window.MotionCCompassPrototype.calculate(compassState);
    return window.MotionCResponse.calculate(state,read('motionc-lifestyle-summary-v1'),compass);
  }
  window.MotionCResponseLive=Object.freeze({snapshot});
})();
