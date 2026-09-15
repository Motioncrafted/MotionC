(() => {
  'use strict';
  const dialog=document.getElementById('weeklyDialog'),status=document.getElementById('weeklySaveStatus');
  const selector='#weeklyAge,#weeklySex,#weeklyHeight,#startingWeight,#weeklyWaist,#realGoal,#motivationalGoal,[data-lifestyle]';
  const fields=()=>Array.from(dialog.querySelectorAll(selector));
  const snapshot=()=>JSON.stringify(fields().map(e=>[e.id||e.dataset.lifestyle,e.value]));
  let saved=null,active=false,goalTimer=null;
  function begin(){if(!active){active=true;saved=snapshot();status.textContent='Changes save automatically when you finish editing a field.';}}
  new MutationObserver(()=>{if(dialog.open)begin();else active=false;}).observe(dialog,{attributes:true,attributeFilter:['open']});
  function saveGoal(field){
    clearTimeout(goalTimer);
    if(!dialog.open)return false;begin();
    if(!field.value.trim() || !field.checkValidity()){status.textContent='Enter a valid goal before it can be saved.';return false;}
    const previous=JSON.parse(saved);
    if(previous.find(([id])=>id===field.id)?.[1]===field.value)return true;
    try{saveWeeklyGoalOnly(field.id);saved=JSON.stringify(previous.map(([id,value])=>[id,id===field.id?field.value:value]));status.textContent=(field.id==='realGoal'?'Real Goal':'Motivational Goal')+' saved: '+field.value+' '+document.getElementById(field.id==='realGoal'?'lineWeightUnit':'goalWeightUnit').textContent+'.';return true;}
    catch{status.textContent='Could not save this goal. Please keep the window open and try again.';return false;}
  }
  function valid(){const bad=fields().find(e=>!e.checkValidity());if(bad){status.textContent='Check the highlighted value before closing. Changes are not saved yet.';bad.reportValidity();return false;}return true;}
  function flush(){clearTimeout(goalTimer);if(!dialog.open)return true;begin();
    for(const id of ["realGoal","motivationalGoal"]){const field=document.getElementById(id);if(field.value.trim()&&field.checkValidity()&&!saveGoal(field))return false;}
    const baseline=document.getElementById('startingWaistInput'),editor=document.getElementById('startingWaistEditor');
    if(!editor.hidden){if(!baseline.checkValidity()||!baseline.value){status.textContent='Finish or cancel the Starting Waist edit before closing.';baseline.reportValidity();return false;}document.getElementById('saveStartingWaist').click();}
    if(snapshot()===saved)return true;if(!valid())return false;
    try{saveWeekly(false);saved=snapshot();renderWaistProgress();status.textContent='Changes saved on this device.';return true;}
    catch(error){status.textContent='Could not save changes. Please keep this window open and try again.';return false;}
  }
  dialog.addEventListener('input',e=>{if(e.target.matches(selector)){begin();clearTimeout(goalTimer);if(e.target.matches('#realGoal,#motivationalGoal')){status.textContent='Saving goal changes…';goalTimer=setTimeout(()=>{saveGoal(e.target);},600);}else status.textContent='Editing… changes save when you leave this field.';}});
  dialog.addEventListener('change',e=>{if(e.target.matches('#realGoal,#motivationalGoal'))saveGoal(e.target);else if(e.target.matches(selector))flush();});
  function close(){if(flush())dialog.close();}
  document.getElementById('closeWeekly').addEventListener('click',e=>{e.stopImmediatePropagation();close();},true);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  const outside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
  let startedOutside=false;dialog.addEventListener('pointerdown',e=>{startedOutside=e.target===dialog&&outside(e);});
  dialog.addEventListener('click',e=>{if(startedOutside&&e.target===dialog&&outside(e))close();startedOutside=false;});
  dialog.addEventListener('close',()=>{clearTimeout(goalTimer);active=false;});
})();

