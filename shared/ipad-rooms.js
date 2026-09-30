// iPad-only room presentation. Existing calculations, controls and saved state remain authoritative.
(() => {
 // iPadOS Safari may identify as a Mac. Do not apply these room changes to Android,
 // iPhone or desktop browsers merely because their viewport has tablet dimensions.
 const isIPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
 if (!isIPad) return;
 const engine=location.pathname.includes('engine-room');
 document.documentElement.classList.add('ipad-room-presentation');
 const style=document.createElement('style');style.textContent=`
 .orientation-room{display:none}
 .room-tools button,.room-dialog button,.orientation-room a{min-height:44px;padding:10px 16px;font:700 16px/1.3 Arial,sans-serif;border:2px solid #ae8549;border-radius:9px;background:#fff4dc;color:#30251e;cursor:pointer}
 .room-tools{position:absolute;z-index:20;left:69.05%;bottom:4.35%;width:26.65%;height:16.35%;min-height:92px;display:grid;grid-template-rows:1fr 1fr;gap:4px;padding:0;background:#252b2d;border-radius:9px}
 .room-tools button{min-width:0;padding:6px;font-size:clamp(14px,1.6vw,18px);line-height:1.2}
 .room-dialog{box-sizing:border-box;width:min(760px,calc(100vw - 32px));max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow:auto;padding:20px;border:2px solid #ae8549;border-radius:14px;background:#f7f1e5;color:#172f28;font:16px/1.5 Arial,sans-serif}
 .room-dialog::backdrop{background:#071b18ba}.room-dialog header{display:flex;justify-content:space-between;align-items:center;gap:16px;position:sticky;top:-20px;padding:12px 0;background:#f7f1e5;z-index:4}.room-dialog h2{font-size:22px;margin:0}.room-dialog h3{margin:16px 0 10px}
 .room-dialog .population-summary,.room-dialog .population-counts{position:static;width:100%;height:auto;overflow:visible;padding:16px;margin:12px 0}
 .room-dialog .population-counts h2,.room-dialog .population-summary h2{font-size:18px;line-height:1.3}
 .room-dialog .population-count-row{font-size:15px;min-height:30px;grid-template-columns:90px 1fr 40px}
 .room-dialog .population-summary table{font-size:15px;line-height:1.4}.room-dialog .population-summary td,.room-dialog .population-summary th{height:auto;padding:8px 4px}
 .room-dialog #refresh-population-button{font-size:14px;min-height:44px;padding:8px 12px}.room-dialog #refresh-population-button::after{content:none}
 .room-zone-list{list-style:none;padding:0;margin:16px 0}.room-zone-list li{display:flex;justify-content:space-between;padding:14px 8px;border-bottom:1px solid #bbc9be;font-size:20px}.room-zone-list strong{font-size:24px}
 .room-dialog .population-summary-header{flex-wrap:wrap;gap:12px}
 @media(orientation:portrait){
  body>:not(.orientation-room):not(script):not(style){display:none!important}
  .orientation-room{display:flex;min-height:100vh;min-height:100dvh;padding:28px;align-items:center;justify-content:center;box-sizing:border-box;background:#eef2ed;color:#173c31;font:18px/1.6 Arial,sans-serif}
  .orientation-room section{max-width:580px;background:#fffdf5;border:1px solid #b6c6bc;border-radius:20px;padding:32px}
  .orientation-room h1{outline:none;font:700 32px/1.2 Georgia,serif;margin:10px 0 20px}.orientation-room .rotate-symbol{font-size:52px}
  .orientation-room nav{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.orientation-room a{display:inline-flex;align-items:center;text-decoration:none}
 }
 .engine-room-theme .room-tools{background:#252b2d}
 .engine-room-theme .room-dialog button{background:#e2e5e6;color:#20282c;border-color:#7d898e;box-shadow:0 2px 5px #0003}
 .engine-room-theme .room-dialog,.engine-room-theme .room-dialog header{background:#eef0f1;color:#20282c;border-color:#7d898e}
 .engine-room-theme .room-dialog #refresh-population-button{background:#e2e5e6;color:#20282c;border-color:#7d898e}
 .engine-room-theme .room-dialog button:hover{background:#f4f5f5}
 .engine-room-theme .room-tools button{background:#727679;color:#fff;border-color:#252a2e;box-shadow:0 2px 5px #0006}
 .engine-room-theme .room-tools button:hover{background:#65696c}
 `;document.head.append(style);
 if(engine) document.body.classList.add('engine-room-theme');
 const guidance=document.createElement('div');guidance.className='orientation-room';guidance.innerHTML=`<section><div class="rotate-symbol" aria-hidden="true">↻</div><p>${engine?'Engine Room':'Drop Zone'}</p><h1>Please rotate your iPad to landscape</h1><p>This room needs a wider view to keep its controls readable and within reach.</p><p>If the screen will not turn, check Portrait Orientation Lock in Control Centre. You can leave this page at any time.</p><nav aria-label="Leave this room"><a href="/dashboard/">Back to Summary</a><a href="/">Home</a><a href="/library/">Library</a></nav></section>`;document.body.append(guidance);
 if(engine){
  const toolbar=document.createElement('nav');toolbar.className='room-tools';toolbar.setAttribute('aria-label','Engine Room readable views');toolbar.innerHTML='<button id="roomSimulation">Sample Simulation</button><button id="roomZones">MCP Zones — tap to read</button>';document.querySelector('main').append(toolbar);
  const sim=document.createElement('dialog');sim.className='room-dialog';sim.id='roomSimulationDialog';sim.setAttribute('aria-labelledby','roomSimTitle');sim.innerHTML='<header><h2 id="roomSimTitle">Sample Simulation</h2><button type="button">Close ×</button></header><div class="room-content"></div>';document.body.append(sim);
  const sections=[document.querySelector('.population-counts'),document.querySelector('.population-summary')],markers=sections.map(e=>{const c=document.createComment('original simulation panel');e.before(c);return c});
  const open=()=>{sections.forEach(e=>sim.querySelector('.room-content').append(e));sim.showModal();};toolbar.querySelector('#roomSimulation').onclick=open;
  sim.querySelector('button').onclick=()=>sim.close();sim.addEventListener('close',()=>sections.forEach((e,i)=>markers[i].after(e)));
  const zones=document.createElement('dialog');zones.className='room-dialog';zones.id='roomZoneDialog';zones.setAttribute('aria-labelledby','roomZoneTitle');zones.innerHTML='<header><h2 id="roomZoneTitle">MCP Zones</h2><button type="button">Close ×</button></header>';
  const list=document.querySelector('.mcp-zone-note ul').cloneNode(true);list.className='room-zone-list';zones.append(list);document.body.append(zones);toolbar.querySelector('#roomZones').onclick=()=>zones.showModal();zones.querySelector('button').onclick=()=>zones.close();
  const note=document.querySelector('.mcp-zone-note');note.setAttribute('role','button');note.tabIndex=0;note.setAttribute('aria-label','MCP Zones — open readable reference');note.style.cursor='pointer';note.onclick=()=>zones.showModal();note.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();zones.showModal();}};
 }else{
  // Keep the original input and submit elements/listeners together. Wall tabs stay in the right-hand rail.
  const dock=document.createElement('section');dock.className='room-drop-dock';dock.setAttribute('aria-label','Add your win');document.querySelector('main').after(dock);
  const controls=document.getElementById('interactiveControls');dock.append(controls);controls.classList.add('open');
  dock.append(document.getElementById('visitorAccountActions'));
  document.getElementById('editorOpen').hidden=true;document.getElementById('editorClose').hidden=true;
  document.getElementById('sprayButton').textContent='Add Your Win';
  const guide=document.createElement('button');guide.className='room-composer-guide';guide.textContent='Add Your Win ↓';guide.onclick=()=>dock.scrollIntoView({behavior:'smooth'});document.querySelector('.wall-stage').append(guide);
  const css=document.createElement('style');css.textContent=`
  @media(orientation:landscape){
   #editorOpen,#editorClose{display:none!important}
   .room-composer-guide{position:absolute;z-index:15;left:.5%;top:75%;width:79.3%;height:19.6%;border:1px solid #41474a;border-radius:10px;background:#101112;color:#fff;font:700 18px Arial;cursor:pointer}
   .prototype-shell{min-height:0;display:block}.wall-stage{margin:auto}
   .room-drop-dock{max-width:1200px;margin:auto;padding:14px;background:#102823}
   .room-drop-dock .interactive-controls{position:static;display:grid;grid-template-columns:minmax(260px,1fr) 170px;gap:12px;width:100%;height:auto;max-height:none;padding:0;overflow:visible;transform:none;visibility:visible;pointer-events:auto;border:0;box-shadow:none;background:none}
   .room-drop-dock .interactive-controls::before{content:none}.room-drop-dock .message-field{grid-column:1;grid-row:1;position:relative;inset:auto;width:100%;height:84px;min-height:84px;margin:0;box-shadow:none}.room-drop-dock textarea{min-height:84px;height:84px;font-size:16px}
   .room-drop-dock .spray-button{position:static;grid-column:2;grid-row:1;width:100%;height:84px;min-height:44px;box-shadow:none;font-size:17px}
   .room-drop-dock .emoji-picker,.room-drop-dock .font-picks,.room-drop-dock .color-picks,.room-drop-dock .size-picks{position:static;grid-column:1/-1;grid-row:auto;display:flex;flex-wrap:wrap;width:auto;height:auto;gap:10px;margin:0}
   .room-drop-dock .emoji-toggle,.room-drop-dock .font-picks button,.room-drop-dock .color-picks button,.room-drop-dock .size-picks button{min-width:44px;min-height:44px}
   .room-drop-dock .emoji-menu[hidden]{display:none}.room-drop-dock .emoji-menu{position:static;flex:0 1 auto;display:grid;grid-template-columns:repeat(7,44px);gap:6px;width:max-content;max-width:100%;margin:0;padding:6px}
   .room-drop-dock .emoji-menu button{width:44px;min-width:44px;height:44px;min-height:44px;aspect-ratio:1}
   .room-drop-dock .visitor-account-actions{position:static;width:auto;display:flex;gap:12px;padding:12px 0 0}.room-drop-dock .visitor-account-actions[hidden]{display:none}.room-drop-dock .visitor-account-actions a{min-height:44px;font:700 15px Arial;padding:12px}
  }`;document.head.append(css);
 }
 const portrait = matchMedia('(orientation: portrait)');
 const heading = guidance.querySelector('h1');heading.tabIndex = -1;
 const syncOrientation = () => {
  if (portrait.matches) {
   document.querySelectorAll('.room-dialog[open]').forEach(dialog => dialog.close());
   requestAnimationFrame(() => heading.focus({preventScroll:true}));
  }
 };
 portrait.addEventListener('change', syncOrientation);
 syncOrientation();
})();
