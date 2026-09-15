(() => {
  'use strict';
  const dialog=document.getElementById('weeklyDialog'),status=document.getElementById('weeklySaveStatus');
  const selector='#weeklyAge,#weeklySex,#weeklyHeight,#startingWeight,#weeklyWaist,#realGoal,#motivationalGoal,[data-lifestyle]';
  const fields=()=>Array.from(dialog.querySelectorAll(selector));
  const snapshot=()=>JSON.stringify(fields().map(e=>[e.id||e.dataset.lifestyle,e.value]));
  let saved=null,active=false;
  function begin(){if(!active){active=true;saved=snapshot();status.textContent='Changes save automatically when you finish editing a field.';}}
  new MutationObserver(()=>{if(dialog.open)begin();else active=false;}).observe(dialog,{attributes:true,attributeFilter:['open']});
  function valid(){const bad=fields().find(e=>!e.checkValidity());if(bad){status.textContent='Check the highlighted value before closing. Changes are not saved yet.';bad.reportValidity();return false;}return true;}
  function flush(){if(!dialog.open)return true;begin();
    const baseline=document.getElementById('startingWaistInput'),editor=document.getElementById('startingWaistEditor');
    if(!editor.hidden){if(!baseline.checkValidity()||!baseline.value){status.textContent='Finish or cancel the Starting Waist edit before closing.';baseline.reportValidity();return false;}document.getElementById('saveStartingWaist').click();}
    if(snapshot()===saved)return true;if(!valid())return false;
    try{saveWeekly(false);saved=snapshot();renderWaistProgress();status.textContent='Changes saved on this device.';return true;}
    catch(error){status.textContent='Could not save changes. Please keep this window open and try again.';return false;}
  }
  dialog.addEventListener('input',e=>{if(e.target.matches(selector)){begin();status.textContent='Editing… changes save when you leave this field.';}});
  dialog.addEventListener('change',e=>{if(e.target.matches(selector))flush();});
  function close(){if(flush())dialog.close();}
  document.getElementById('closeWeekly').addEventListener('click',e=>{e.stopImmediatePropagation();close();},true);
  document.getElementById('saveWeekly').addEventListener('click',e=>{e.stopImmediatePropagation();if(valid()){try{saveWeekly();}catch{status.textContent='Could not save changes. Please try again.';}}},true);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  const outside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
  let startedOutside=false;dialog.addEventListener('pointerdown',e=>{startedOutside=e.target===dialog&&outside(e);});
  dialog.addEventListener('click',e=>{if(startedOutside&&e.target===dialog&&outside(e))close();startedOutside=false;});
  dialog.addEventListener('close',()=>{active=false;});
})();

