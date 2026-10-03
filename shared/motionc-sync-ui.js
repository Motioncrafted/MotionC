/* Minimal status and explicit conflict resolution. No record contents enter analytics/logs. */
(() => {
  'use strict';let button,dialog,current=null,editing=null,review=null,editorControls=null,draftError=null;
  const L=()=>window.MotionCSyncLocal,D=()=>window.MotionCDayReview;
  const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  function setup(){
    if(button)return;
    const style=document.createElement('style');style.textContent='#motionc-sync-status{position:fixed;bottom:12px;right:12px;z-index:10000;max-width:calc(100vw - 24px);padding:8px 12px;border:1px solid #b8cec5;border-radius:8px;background:#fff;color:#174b3a;font:600 13px system-ui}#motionc-sync-review{width:min(620px,calc(100vw - 40px));max-height:80vh;border:1px solid #b8cec5;border-radius:12px;padding:20px;color:#173b30}#motionc-sync-review pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;max-height:220px;overflow:auto}#motionc-sync-review button{margin:6px;padding:8px}';style.textContent+='#motionc-sync-review{box-sizing:border-box;overflow:auto}#motionc-sync-review fieldset{min-width:0;margin:12px 0}#motionc-sync-review select{max-width:100%;width:100%;padding:8px;box-sizing:border-box}#motionc-sync-review button{max-width:100%}#motionc-sync-review label{display:block;margin:10px 0}';document.head.append(style);
    button=document.createElement('button');button.id='motionc-sync-status';button.type='button';button.hidden=true;button.setAttribute('aria-live','polite');button.onclick=show;
    dialog=document.createElement('dialog');dialog.id='motionc-sync-review';dialog.setAttribute('aria-label','Review sync differences');document.body.append(button,dialog);
  }
  function show(){
    editing=null;review=null;editorControls=null;
    setup();dialog.replaceChildren();const heading=document.createElement('h2');heading.textContent='Sync needs review';dialog.append(heading);
    const note=document.createElement('p');note.textContent='Both versions are preserved. Choose the version to use for each record. Other records can continue syncing.';dialog.append(note);
    for(const c of Object.values(current?.conflicts||{})){
      const block=document.createElement('section'),title=document.createElement('h3');title.textContent=c.id;block.append(title);
      if(/^Daily \/ \d{4}-\d{2}-\d{2}$/.test(c.id)){
        const build=node('button','Build the correct day');build.onclick=()=>openEditor(c.id);block.append(build);
      }
      const versions=[['local','This device',c.local],['cloud','Cloud',c.cloud],...(c.alternatives||[]).map((v,i)=>[String(i),'Other local version '+(i+1),v])];
      for(const [choice,label,value] of versions){const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre'),use=document.createElement('button');summary.textContent=label;pre.textContent=value===null?'Deleted / absent':JSON.stringify(value,null,2);details.append(summary,pre);use.textContent='Use '+label.toLowerCase();use.onclick=()=>{window.MotionCSyncLocal.resolve(window.MotionCSyncLocal.owner(),c,choice);use.disabled=true;use.textContent='Checking latest cloud…';};block.append(details,use);}dialog.append(block);
    }
    for(const draft of L().reviews().filter(d=>L().pendingReview(d)&&!current?.conflicts?.[d.id])){
      const resume=node('button','Resume saved draft · '+draft.id);resume.onclick=()=>openEditor(draft.id);dialog.append(resume);
    }
    const close=document.createElement('button');close.textContent='Close';close.onclick=()=>dialog.close();dialog.append(close);if(!dialog.open)dialog.showModal();
  }
  function openEditor(id){
    const conflict=L().read(L().owner())?.conflicts?.[id];
    review=L().readReview(id);
    if(review&&!L().pendingReview(review)){L().archiveReview(review);review=null;}
    if(!review){if(!conflict)return;review=D().create(L().owner(),conflict,L().read(L().owner()).revision);L().saveReview(review);}
    editing=id;draftError=null;renderEditor();
  }
  function renderEditor(){
    const m=D().model(review.sources);dialog.replaceChildren();
    dialog.append(node('h2','Build the correct day · '+m.date),node('p','Choose each walk explicitly. Matching distance, time, or position does not tell us whether two records are the same walk. Omit a duplicate or deleted walk rather than keeping it twice.'));
    const note=node('p');note.id='motionc-day-review-status';note.setAttribute('role','status');dialog.append(note);
    const latest=node('button','Review latest versions');latest.onclick=()=>{
      const conflict=L().read(L().owner())?.conflicts?.[editing];if(!conflict)return;
      L().archiveReview(review);const old=D().compose(review);const previous={result:old.result,selections:{walkDecisions:review.walkDecisions,fieldChoices:review.fieldChoices},sources:review.sources};
      review=D().create(L().owner(),conflict,L().read(L().owner()).revision);review.previousDraft=previous;L().saveReview(review);renderEditor();
    };dialog.append(latest);
    if(review.previousDraft){const prior=node('details'),heading=node('summary','Previous draft retained');prior.append(heading,node('pre',JSON.stringify(review.previousDraft,null,2)));dialog.append(prior);}
    for(const v of m.versions){const details=node('details');details.append(node('summary',v.label+' · original Daily record'),node('pre',v.entry===null?'This date is absent in this version.':JSON.stringify(v.entry,null,2)));dialog.append(details);}
    dialog.append(node('h3','Walking records'));
    if(!m.walks.length)dialog.append(node('p','Neither version contains a recorded walk.'));
    for(const item of m.walks){
      const field=node('fieldset'),legend=node('legend',item.label),w=item.walk;
      field.append(legend,node('p',`${w.distance??'—'} mi · ${w.minutes??'—'} min · ${w.steps??'—'} steps · ${w.walkingHr??'—'} bpm${w.recordedAt?' · '+w.recordedAt:''}`));
      const select=node('select');select.dataset.walkHandle=item.handle;select.setAttribute('aria-label',item.label);
      for(const [value,label] of [['','Choose what to retain'],['keep','Keep as a separate walk'],['duplicate','Omit: same walk retained elsewhere'],['omit','Omit: deleted, replaced, or not part of this day']]){const option=node('option',label);option.value=value;select.append(option);}
      select.value=review.walkDecisions[item.handle]||'';select.onchange=()=>{review.walkDecisions[item.handle]=select.value;edited();};field.append(select);dialog.append(field);
    }
    const differing=m.fields.filter(f=>!f.same);
    if(differing.length)dialog.append(node('h3','Other Daily values'));
    for(const f of differing){
      const label=node('label',f.label+' '),select=node('select');select.dataset.dayField=f.name;select.setAttribute('aria-label',f.label);
      const empty=node('option','Choose a version');empty.value='';select.append(empty);
      for(const o of f.options){const option=node('option',o.label+': '+(o.present?JSON.stringify(o.value):'Not recorded'));option.value=o.key;select.append(option);}
      select.value=review.fieldChoices[f.name]||'';select.onchange=()=>{review.fieldChoices[f.name]=select.value;edited();};label.append(select);dialog.append(label,node('br'));
    }
    const preview=node('pre');preview.id='motionc-day-preview';dialog.append(node('h3','Resulting day'),preview);
    const full=node('pre'),details=node('details');details.append(node('summary','Complete composed record'),full);dialog.append(details);
    const verifyLabel=node('label'),verify=node('input');verify.type='checkbox';verify.id='motionc-day-verified';verify.checked=Boolean(review.verified);verify.onchange=()=>{review.verified=verify.checked;saveDraft();refreshEditor();};
    verifyLabel.append(verify,document.createTextNode(' I checked that retained items are separate walks, no deleted walk is being restored unintentionally, and the Daily values are correct.'));dialog.append(verifyLabel,node('br'));
    const confirm=node('button','Confirm and sync this day');confirm.id='motionc-day-confirm';confirm.onclick=async()=>{
      confirm.disabled=true;if(!saveDraft())return;note.textContent='Checking the latest local and cloud versions…';
      try{
        const owner=review.owner;await window.MotionCSupabase.saveCloudState(owner);
        if(owner!==L().owner())throw Error('Account changed; the draft remains with its original account.');
        L().resolveComposed(review);refreshEditor();await window.MotionCSupabase.saveCloudState(owner);refreshEditor();
      }catch(error){note.textContent=error.message||'Could not synchronize. Your draft is retained.';refreshEditor(false);}
    };
    const back=node('button','Back to conflicts');back.onclick=()=>{if(saveDraft())show();};
    const close=node('button','Close · draft saved');close.onclick=()=>{if(saveDraft())dialog.close();};dialog.append(confirm,back,close);
    const archive=node('button','Archive draft without changing Daily');archive.onclick=()=>{
      if(!saveDraft())return;L().archiveReview(review);review.status='archived';L().saveReview(review);show();
    };dialog.append(archive);
    editorControls={note,latest,preview,full,verify,confirm};refreshEditor();if(!dialog.open)dialog.showModal();
  }
  function saveDraft(){
    const result=D().compose(review);review.result=result.result;
    try{L().saveReview(review);draftError=null;return true;}
    catch{draftError='Could not save the draft on this device. Keep this review open and free device storage before confirming.';if(editorControls){editorControls.note.textContent=draftError;editorControls.confirm.disabled=true;}return false;}
  }
  function edited(){review.verified=false;if(review.status!=='stale')review.status='draft';editorControls.verify.checked=false;saveDraft();refreshEditor();}
  function refreshEditor(replaceMessage=true){
    if(!editing||!editorControls)return;
    const stored=L().readReview(editing);if(stored?.status==='acknowledged')review=stored;
    const composed=D().compose(review),active=L().reviewIsCurrent(review),submitted=review.status==='submitted',saved=review.status==='acknowledged';
    if(!active&&!submitted&&!saved&&review.status!=='stale'){review.status='stale';L().saveReview(review);}
    if(submitted&&!L().operations(L().owner()).some(op=>op.changes.some(c=>c.id===editing))&&L().read(L().owner())?.conflicts?.[editing]){review.status='stale';L().saveReview(review);}
    editorControls.preview.textContent=composed.ready?`${composed.result.walks.length} walks · ${composed.result.distance.toFixed(2)} mi · ${composed.result.minutes} min\nSteps: ${composed.result.steps??'not fully recorded'}\nWalking heart rate: ${composed.result.walkingHr??'not fully recorded'}\n`+D().model(review.sources).fields.map(f=>f.label+': '+(Object.hasOwn(composed.result,f.name)?JSON.stringify(composed.result[f.name]):'not recorded')).join('\n'):'Choose each walking record and differing field to see the complete result.\nRemaining: '+composed.missing.join(', ');
    editorControls.full.textContent=composed.ready?JSON.stringify(composed.result,null,2):'Complete the selections first.';
    editorControls.confirm.disabled=Boolean(draftError)||!composed.ready||!review.verified||!active||submitted||saved;
    editorControls.latest.hidden=active||submitted||saved;editorControls.latest.disabled=!L().read(L().owner())?.conflicts?.[editing];
    if(replaceMessage)editorControls.note.textContent=draftError||(saved?'This completed day is saved in the cloud.':review.status==='stale'?'This date changed during review. Your draft is retained. Review the latest versions before confirming.':submitted?'Confirmed draft retained. Waiting for guarded cloud acknowledgment.':'Your selections are saved on this device. No walks are combined automatically.');
  }
  function update(detail){
    current=detail;setup();const count=Object.keys(detail.conflicts||{}).length;
    const drafts=L().reviews().some(L().pendingReview);
    button.hidden=!count&&!detail.error&&!detail.pending&&!drafts;
    button.textContent=count?`Sync needs review (${count})`:drafts?'Day review draft retained':detail.error?'Sync unavailable · local work retained':'Changes waiting to sync';
    button.onclick=count||drafts?show:()=>window.MotionCSupabase?.syncNow();
    if(dialog.open){if(editing)refreshEditor();else if(count||drafts)show();else dialog.close();}
  }
  window.addEventListener('motionc:sync-status',e=>update(e.detail));
  window.addEventListener('motionc:account-changing',()=>{
    if(dialog?.open)dialog.close();if(button)button.hidden=true;editing=null;review=null;current=null;editorControls=null;
  });
})();
