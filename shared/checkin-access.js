(() => {
  'use strict';
  const choices=[['personal','Personal & Measurements','Age, sex, height, starting weight, waist / waist progress.'],['lifestyle','Weekly Lifestyle','Eight habits and your weekly lifestyle score.'],['goals','Goals','Real Goal and Motivational Goal.']];
  const menus=['preferencesMenu','summaryPreferencesMenu','walkingPreferencesMenu','enginePreferencesMenu'];
  function openSection(section){
    if(!choices.some(c=>c[0]===section))return;
    const button=document.getElementById('weeklyButton');if(!button)return;
    const menu=document.getElementById('preferencesMenu');if(menu)menu.hidden=true;
    document.getElementById('preferencesToggle')?.setAttribute('aria-expanded','false');
    // Invoke the exact existing opener through its untouched Daily button.
    button.click();
    const dialog=document.getElementById('weeklyDialog');
    const target=section==='personal'?document.getElementById('weeklyProfile'):document.getElementById(section==='goals'?'weeklyGoalsTitle':'weeklyLifestyleTitle');
    if(section==='personal')target.open=true;
    requestAnimationFrame(()=>{const focusTarget=section==='personal'?target.querySelector('summary'):target;focusTarget.setAttribute('tabindex','-1');focusTarget.focus({preventScroll:true});const box=target.getBoundingClientRect(),bounds=dialog.getBoundingClientRect();dialog.scrollTop+=box.top-bounds.top-24;});
  }
  menus.forEach(id=>{const menu=document.getElementById(id);if(!menu)return;menu.classList.add('has-checkin-access');if(['walkingPreferencesMenu','enginePreferencesMenu'].includes(id)){const home=document.createComment('preferences menu home');menu.before(home);const mobile=matchMedia('(max-width:900px)'),place=()=>{if(mobile.matches)document.body.append(menu);else home.after(menu);};place();mobile.addEventListener('change',place);}const group=document.createElement('section');group.className='my-checkin-menu';group.setAttribute('aria-label','My Check-In');const title=document.createElement('h3');title.textContent='My Check-In';group.append(title);
    choices.forEach(([key,label,description])=>{const link=document.createElement('a');link.href='/daily/?checkin='+key;link.dataset.checkinSection=key;const name=document.createElement('strong');name.textContent=label;const detail=document.createElement('small');detail.textContent=description;link.append(name,detail);if(document.getElementById('weeklyDialog'))link.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();openSection(key);});group.append(link);});
    const measurement=Array.from(menu.children).find(el=>el.tagName==='P'&&/Measurement system/i.test(el.textContent));menu.insertBefore(group,measurement||null);
  });
  const url=new URL(location.href),section=url.searchParams.get('checkin');
  if(document.getElementById('weeklyDialog')&&choices.some(c=>c[0]===section)){
    openSection(section);url.searchParams.delete('checkin');history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }
})();

