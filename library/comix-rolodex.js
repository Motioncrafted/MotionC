(() => {
    const trigger=document.getElementById('comixHotspot'),reader=document.getElementById('comixReader'),panel=document.getElementById('comixPanel'),counter=document.getElementById('comixCounter'),previous=document.getElementById('comixPrevious'),next=document.getElementById('comixNext');
    const descriptions=["Mo at his front door: Just a short walk today.","Mo walks through the neighborhood: Maybe just around the block.","Mo notices an inviting trail: Wonder where that goes…","Far into the countryside, Mo checks his watch: 6.2 MILES. Huh.","Mo looks back toward the distant neighborhood: I really need to define ‘short’ before I leave. MotionC® – Motion Creates Change"];
    const artwork=document.getElementById('comixArtwork');
    // Add a finished issue here when its artwork is ready.
    const issues=[{id:'001',title:'The Short Walk',panels:descriptions.map((alt,i)=>({src:'/images/mo-comix-001-panel-'+(i+1)+'.png',alt}))}];
    issues.unshift({"id":"000","title":"Anniversary Edition: The Handbook That Isn't One","panels":[{"src":"/images/mo-comix-000-panel-1.png","alt":"Issue #000 — Anniversary Edition: The Handbook That Isn't One. Mo, without a cape, plans at his desk: Okay... this time I'm going to figure out the whole thing. Unused shoes, an unopened bottle and START NEXT MONDAY note surround him."},{"src":"/images/mo-comix-000-panel-2.png","alt":"An enormous MotionC Handbook lands with a THUD. The Complete Guide to Changing Everything. Mo, still without a cape: Ohhh."},{"src":"/images/mo-comix-000-panel-3.png","alt":"Mo puts on glasses, sharpens his pencil and prepares a notebook: Alright. Tell me what to do. No cape."},{"src":"/images/mo-comix-000-panel-4.png","alt":"Mo silently opens the enormous handbook. Both pages are completely blank. No cape."},{"src":"/images/mo-comix-000-panel-5.png","alt":"Mo shakes the blank handbook: Seriously? A tiny card reads START WITH ONE MOTION. He looks toward the unused shoes: Hmm. No cape."},{"src":"/images/mo-comix-000-panel-6.png","alt":"Mo walks away wearing his shoes and, for the first time, his green cape. He carries the water bottle; the handbook remains behind and the START NEXT MONDAY note is discarded. You don't need the whole plan. You need the next motion. MotionC — Motion Creates Change. Anniversary Edition."}]});
    issues.push({"id":"002","title":"The Scale Reality Check","panels":[{"src":"/images/mo-comix-002-panel-1.png","alt":"Mo stands on his bathroom scale, suspicious of its 201.2 reading: Hmm."},{"src":"/images/mo-comix-002-panel-2.png","alt":"Mo repositions the scale against another wall and steps on again: Maybe the floor's uneven."},{"src":"/images/mo-comix-002-panel-3.png","alt":"Mo drags the scale to yet another tile after trying several locations: There has to be a good spot somewhere."},{"src":"/images/mo-comix-002-panel-4.png","alt":"Mo reluctantly accepts the reading. Your weight can move from water, food, sodium, timing and normal day-to-day variation. One reading is information. The pattern matters more."},{"src":"/images/mo-comix-002-panel-5.png","alt":"The scale is tucked upright behind the door. Mo walks away in his cape and blue runners. Same Mo. Different day. Forward anyway. MotionC® — Motion Creates Change."}]});
    issues.push({"id":"003","title":"Waiting for Motivation","panels":[{"src":"/images/mo-comix-003-panel-1.png","alt":"Mo sits at his kitchen table in walking shoes and cape, determined: Today, I’m going for a walk. A small background plant has a tiny heart Moette card."},{"src":"/images/mo-comix-003-panel-2.png","alt":"Mo waits at the table, chin in his hand, with a coffee cup: Just waiting to feel motivated. The little plant remains in the background."},{"src":"/images/mo-comix-003-panel-3.png","alt":"Much later, Mo slumps down in his chair as the clock advances: Any minute now…"},{"src":"/images/mo-comix-003-panel-4.png","alt":"Still unenthusiastic, Mo gets up and heads for the door: Fine. I’ll go without it."},{"src":"/images/mo-comix-003-panel-5.png","alt":"Mo walks outside happily, cape moving, as a little puff labelled MOTIVATION catches up: Oh. There you are. You don’t always need motivation to start. Sometimes starting is what creates it. MotionC® — Motion Creates Change."}]});
    issues.push({"id":"004","title":"The One-Inch Victory","panels":[{"src":"/images/mo-comix-004-panel-1.png","alt":"Mo measures his waist in front of a mirror, underwhelmed: One inch? A record shows Before: 40 in, Today: 39 in, Change: −1 in."},{"src":"/images/mo-comix-004-panel-2.png","alt":"Mo holds a small one-inch section of tape between his fingers, disappointed: That’s it?"},{"src":"/images/mo-comix-004-panel-3.png","alt":"Mo looks down in surprise at his comfortably buttoned jeans: Huh."},{"src":"/images/mo-comix-004-panel-4.png","alt":"Mo checks his comfortable jeans in the mirror, pleased, with the tape nearby: That inch got a lot bigger."},{"src":"/images/mo-comix-004-panel-5.png","alt":"Mo happily gives his comfortable waistband a small tug while holding the tape: Okay. I’m keeping that inch. An inch sounds small on a ruler. It can feel very different on your body. MotionC® — Motion Creates Change."}]});
    issues.push({"id":"005","title":"The Perfect Day Trap","panels":[{"src":"/images/mo-comix-005-panel-1.png","alt":"Mo proudly writes THE PERFECT DAY checklist: Perfect breakfast, Long morning walk, Lots of water, No treats, No stress, Perfect supper, Early bedtime. Tomorrow. I do EVERYTHING right."},{"src":"/images/mo-comix-005-panel-2.png","alt":"The next morning is rainy; Mo started later than planned and has an ordinary breakfast: Well... this isn’t going perfectly."},{"src":"/images/mo-comix-005-panel-3.png","alt":"Mo sits defeated on the couch with his checklist, while walking shoes, a water bottle and rain jacket remain available: Maybe I’ll start again tomorrow."},{"src":"/images/mo-comix-005-panel-4.png","alt":"Mo puts the checklist aside and gets up, reaching for his water bottle: Or... I could just have a pretty good day."},{"src":"/images/mo-comix-005-panel-5.png","alt":"Mo winds down contentedly. Mud on his shoes, a drying rain jacket, water glass and used supper plate show worthwhile choices. Pretty good worked pretty good. You don’t need a perfect day to make progress. A good day you actually live beats a perfect one you keep restarting. MotionC® — Motion Creates Change."}]});
    issues.push({"id":"006","title":"Dinner Out","panels":[{"src":"/images/mo-comix-006-panel-1.png","alt":"Date night: Mo and his girlfriend Moette read menus at a casual restaurant. Mo exclaims FRIES! Moette smiles, amused."},{"src":"/images/mo-comix-006-panel-2.png","alt":"Mo orders from the server: Fries... then adds ...and maybe a salad too. Moette smiles quietly."},{"src":"/images/mo-comix-006-panel-3.png","alt":"Mo enjoys a fry, then suspiciously examines lettuce on his fork: Okay, green stuff. Impress me. Both fries and salad are on the table."},{"src":"/images/mo-comix-006-panel-4.png","alt":"Mo is pleasantly surprised by his salad and takes another bite: Hey... this is actually good. Fries remain beside the salad."},{"src":"/images/mo-comix-006-panel-5.png","alt":"Moette offers Want another fry? Mo, happily eating salad, replies In a minute. Healthy choices don’t always have to replace the foods you enjoy. Sometimes they just need a place beside them. MotionC® — Motion Creates Change."}]});
    let selected=0,issue=issues[selected],current=1,view='cover';
    const browserView=document.getElementById('comixBrowser'),stage=document.getElementById('comixDrum'),cardsHost=document.getElementById('comixCards');
    const cover=document.getElementById('comixCover'),issueView=document.getElementById('comixIssueView'),home=document.getElementById('comixHome'),enter=document.getElementById('comixEnter');
    const readIssue=document.getElementById('comixReadIssue'),browseReturn=document.getElementById('comixBrowseReturn');
    const number=document.getElementById('comixSelectedNumber'),title=document.getElementById('comixSelectedTitle'),count=document.getElementById('comixSelectedCount');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const mod=n=>(n%issues.length+issues.length)%issues.length;
    const relative=(i,center)=>{let d=mod(i-center);return d>Math.floor(issues.length/2)?d-issues.length:d;};
    let initialized=false,turning=false,targetIndex=null,turnTimer=null,wrapTimer=null,suppressClickUntil=0;
    const cards=[];
    function initializeCovers(){
      if(initialized)return;initialized=true;
      issues.forEach((item,i)=>{
        item.cover='/images/mo-comix-cover-'+item.id+'.webp';
        const button=document.createElement('button');button.type='button';button.className='rolodex-card';button.dataset.issueId=item.id;
        button.setAttribute('aria-label','Select issue #'+item.id+': '+item.title);
        const image=document.createElement('img');image.src=item.cover;image.alt='';image.width=600;image.height=800;image.draggable=false;image.decoding='async';
        image.addEventListener('error',()=>{image.hidden=true;const fallback=document.createElement('span');fallback.className='rolodex-card-fallback';fallback.textContent='MO COMIX · #'+item.id+' — '+item.title;button.append(fallback);},{once:true});
        button.append(image);button.addEventListener('click',()=>{if(performance.now()<suppressClickUntil)return;if(i===selected){if(!turning)showIssue();return;}requestSelection(i);});
        cardsHost.append(button);cards.push(button);
      });
    }
    function updateCards(){
      cards.forEach((card,i)=>{
        const d=relative(i,selected),a=Math.abs(d),sign=Math.sign(d);
        card.dataset.slot=d;card.style.setProperty('--x',d);card.style.setProperty('--scale',[1,.89,.82,.76][a]);
        card.style.setProperty('--lift',(-a*18)+'px');card.style.setProperty('--yaw',(-sign*[0,11,19,26][a])+'deg');card.style.setProperty('--lean',(sign*a*1.2)+'deg');
        card.style.zIndex=String(20-a*3);card.tabIndex=d===0?0:-1;
        if(d===0)card.setAttribute('aria-current','true');else card.removeAttribute('aria-current');
        card.setAttribute('aria-label',(d===0?'Read issue #':'Select issue #')+issues[i].id+': '+issues[i].title);
      });
      const item=issues[selected];number.textContent='Issue #'+item.id;title.textContent=item.title;count.textContent=item.panels.length+' panels';
      readIssue.setAttribute('aria-label','Read issue #'+item.id+': '+item.title);stage.dataset.selectedIssue=item.id;
    }
    function endTurn(){
      clearTimeout(turnTimer);clearTimeout(wrapTimer);cards.forEach(card=>card.classList.remove('is-wrapping'));
      turning=false;stage.removeAttribute('aria-busy');
      if(targetIndex!==null&&targetIndex!==selected)advanceTowardTarget();else targetIndex=null;
    }
    function oneStep(direction){
      if(view!=='browser')return;
      if(reduced.matches){selected=mod(selected+direction);updateCards();return;}
      turning=true;stage.setAttribute('aria-busy','true');
      const wrapping=cards.find((card,i)=>relative(i,selected)===-direction*3);
      if(wrapping)wrapping.classList.add('is-wrapping');
      selected=mod(selected+direction);updateCards();
      wrapTimer=setTimeout(()=>{if(wrapping)wrapping.classList.remove('is-wrapping');},230);
      turnTimer=setTimeout(endTurn,335);
    }
    function advanceTowardTarget(){
      if(targetIndex===null||turning)return;
      if(reduced.matches){selected=targetIndex;targetIndex=null;updateCards();return;}
      const delta=relative(targetIndex,selected);if(!delta){targetIndex=null;return;}oneStep(Math.sign(delta));
    }
    function requestSelection(index){targetIndex=mod(index);advanceTowardTarget();}
    function rotate(direction){requestSelection(mod((targetIndex===null?selected:targetIndex)+direction));}
    function stopTurns(){clearTimeout(turnTimer);clearTimeout(wrapTimer);turning=false;targetIndex=null;cards.forEach(c=>c.classList.remove('is-wrapping'));stage.removeAttribute('aria-busy');}
    function render(){artwork.src=issue.panels[current-1].src;artwork.alt=issue.panels[current-1].alt;counter.textContent=current+' / '+issue.panels.length;previous.disabled=current===1;next.disabled=current===issue.panels.length;}
    function showCover(){stopTurns();view='cover';browseReturn.hidden=true;cover.hidden=false;browserView.hidden=true;issueView.hidden=true;home.hidden=true;reader.classList.remove('comix-browser-mode');reader.classList.add('comix-cover-mode');reader.setAttribute('aria-labelledby','comixCoverTitle');reader.scrollTop=0;}
    function showBrowser(){stopTurns();view='browser';browseReturn.hidden=true;initializeCovers();cover.hidden=true;issueView.hidden=true;browserView.hidden=false;home.hidden=false;reader.classList.remove('comix-cover-mode');reader.classList.add('comix-browser-mode');reader.setAttribute('aria-labelledby','comixBrowserHeading');updateCards();reader.scrollTop=0;stage.focus({preventScroll:true});}
    function showIssue(){stopTurns();view='issue';browseReturn.hidden=false;if(issue!==issues[selected]){issue=issues[selected];current=1;}cover.hidden=true;browserView.hidden=true;issueView.hidden=false;home.hidden=false;reader.classList.remove('comix-cover-mode','comix-browser-mode');reader.setAttribute('aria-labelledby','comixTitle');render();reader.scrollTop=0;document.getElementById('comixTitle').focus({preventScroll:true});}
    trigger.addEventListener('click',()=>{current=1;showCover();reader.showModal();enter.focus({preventScroll:true});});
    enter.addEventListener('click',showBrowser);readIssue.addEventListener('click',showIssue);browseReturn.addEventListener('click',showBrowser);
    home.addEventListener('click',()=>{showCover();enter.focus({preventScroll:true});});
    document.getElementById('comixRotateLeft').addEventListener('click',()=>rotate(-1));document.getElementById('comixRotateRight').addEventListener('click',()=>rotate(1));
    stage.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();rotate(event.key==='ArrowLeft'?-1:1);}else if(event.key==='Home'){event.preventDefault();requestSelection(0);}else if(event.key==='End'){event.preventDefault();requestSelection(issues.length-1);}});
    let gesture=null;
    stage.addEventListener('pointerdown',event=>{if(!event.isPrimary||event.button!==0||event.target.closest('.rolodex-turn'))return;gesture={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,horizontal:false};});
    stage.addEventListener('pointermove',event=>{if(!gesture||gesture.id!==event.pointerId)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture.dx=dx;
      if(!gesture.horizontal&&Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){gesture=null;return;}
      if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.3){gesture.horizontal=true;if(!stage.hasPointerCapture(event.pointerId))stage.setPointerCapture(event.pointerId);}
    });
    stage.addEventListener('pointerup',event=>{if(!gesture||gesture.id!==event.pointerId)return;const g=gesture;gesture=null;if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);if(g.horizontal){suppressClickUntil=performance.now()+400;if(Math.abs(g.dx)>35)rotate(g.dx<0?1:-1);}});
    stage.addEventListener('pointercancel',()=>{gesture=null;});stage.addEventListener('lostpointercapture',()=>{gesture=null;});
    reduced.addEventListener('change',()=>{if(view==='browser'&&reduced.matches){const pending=targetIndex;stopTurns();if(pending!==null)selected=pending;updateCards();}});
    previous.addEventListener('click',()=>{if(current>1){current--;render();if(previous.disabled)next.focus();}});
    next.addEventListener('click',()=>{if(current<issue.panels.length){current++;render();if(next.disabled)previous.focus();}});
    document.getElementById('comixClose').addEventListener('click',()=>reader.close());
    reader.addEventListener('click',event=>{if(event.target!==reader)return;const r=reader.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)reader.close();});
    reader.addEventListener('close',()=>{stopTurns();gesture=null;trigger.focus({preventScroll:true});});

})();
