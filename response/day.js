(() => {
  'use strict';
  const key='motionc-response-day-v1',ownerKey='motionc-auth-active-user';
  const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
  const date=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  let owner=null,lastInputs=null;
  function advance(previous,day,value){
    const usable=previous?.version===1&&/^\d{4}-\d{2}-\d{2}$/.test(previous.day)&&valid(previous.lastResponse);
    if(!usable)return valid(value)?{version:1,day,startOfDayResponse:null,lastResponse:value}:null;
    if(day<previous.day)return previous; // Do not rewrite a later baseline after a clock rollback.
    return {version:1,day,startOfDayResponse:day===previous.day?(valid(previous.startOfDayResponse)?previous.startOfDayResponse:null):previous.lastResponse,lastResponse:valid(value)?value:previous.lastResponse};
  }
  function read(){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
  function enabled(){return owner&&owner===localStorage.getItem(ownerKey);}
  function observe(value,day=date(),calculation=null){
    if(!enabled())return null;
    const previous=read(),next=advance(previous,day,value);
    if(next&&next!==previous){
      const snapshots=window.MotionCResponseSnapshots;
      // Freeze the same snapshot as the scalar's starting point, never backfill.
      const candidate=previous?.day===day?previous?.startingSnapshot:previous?.latestSnapshot;
      next.startingSnapshot=snapshots?.matches(candidate,next.startOfDayResponse)?candidate:null;
      // A scalar-only write cannot establish the inputs that produced that value.
      next.latestSnapshot=valid(value)
        ? (calculation?.response===value?snapshots?.stamp(calculation,previous?.latestSnapshot):null)
        : (snapshots?.matches(previous?.latestSnapshot,next.lastResponse)?previous.latestSnapshot:null);
    }
    if(next&&JSON.stringify(next)!==localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(next));
    return next;
  }
  function capture(){
    if(!enabled())return;
    try{
      // Only input changes trigger a calculation here. Midnight carries the last
      // full-precision result forward; it does not itself recalculate Response.
      const inputs=JSON.stringify(['motionc-daily-prototype-v1','motionc-lifestyle-summary-v1'].map(k=>localStorage.getItem(k)));
      if(inputs!==lastInputs){const calculation=window.MotionCResponseLive.snapshot();observe(calculation.response,date(),calculation);lastInputs=inputs;}
      else observe(null);
    }catch(error){console.warn('Response daily readout could not be stored',error);}
  }
  function start(userId){owner=userId;lastInputs=null;capture();window.dispatchEvent(new Event('motionc:response-day-ready'));}
  function display(value,calculation=null){
    if(!valid(value)||!enabled())return {text:'',title:''};
    let record;
    try{record=observe(value,date(),calculation);}catch{return {text:'',title:''};}
    if(!record||record.day!==date())return {text:'',title:''};
    if(!valid(record.startOfDayResponse))return {text:'Starting point established today.',title:''};
    const start=record.startOfDayResponse,delta=value-start;
    // The arrow uses raw movement; displayed integers reconcile with the gauge.
    const movement=Math.abs(Math.round(value)-Math.round(start));
    return {text:`Started ${Math.round(start)}  •  ${delta>0?'↑':delta<0?'↓':'—'} ${movement} today`,title:`Start: ${start}. Current: ${value}. Movement: ${delta}. Displayed values are rounded to whole points.`};
  }
  function comparison(current){
    if(!enabled())return null;
    const record=read(),s=window.MotionCResponseSnapshots;
    if(record?.day!==date()||!s?.matches(record.startingSnapshot,record.startOfDayResponse)||!s.matches(record.latestSnapshot,record.lastResponse)||!s.currentMatches(record.latestSnapshot,current))return null;
    return {before:record.startingSnapshot,after:record.latestSnapshot};
  }
  window.MotionCResponseDay=Object.freeze({advance,capture,start,display,comparison});
})();
