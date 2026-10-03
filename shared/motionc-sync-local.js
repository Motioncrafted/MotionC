/* Loaded before member page writers. Bookkeeping is deliberately outside motionc-*. */
(() => {
  'use strict';
  const C=window.MotionCSyncCore, prefix='MotionCSync.v1:', ownerKey='motionc-auth-active-user';
  const proto=Storage.prototype, get=proto.getItem, set=proto.setItem, remove=proto.removeItem;
  const rawGet=k=>get.call(localStorage,k), rawSet=(k,v)=>set.call(localStorage,k,v), rawRemove=k=>remove.call(localStorage,k);
  const owner=()=>rawGet(ownerKey); let enabled=false, seen, draft=null,guestPage=!owner();
  const key=(id,suffix)=>prefix+id+':'+suffix;
  function capture(){return {schemaVersion:1,storage:Object.fromEntries(Object.keys(localStorage).filter(C.eligible).sort().map(k=>[k,rawGet(k)]))};}
  function read(id){const raw=rawGet(key(id,'checkpoint'));return raw ? JSON.parse(raw) : null;}
  function operations(id){return Object.keys(localStorage).filter(k=>k.startsWith(key(id,'op:'))).sort().map(k=>({...JSON.parse(rawGet(k)),key:k}));}
  function append(id,changes,resolution){
    const op={id:crypto.randomUUID(),changes,...(resolution?{resolution}:{})};
    // UUID is uniqueness, not ordering. Each tab's predecessor establishes local causality.
    const prior=operations(id);op.parents=prior.map(x=>x.id);
    rawSet(key(id,'op:'+op.id),JSON.stringify(op)); return op;
  }
  function ordered(ops){
    const out=[],remaining=new Map(ops.map(x=>[x.id,x]));
    while(remaining.size){let moved=false;for(const [id,op] of remaining) if(!(op.parents||[]).some(p=>remaining.has(p))){out.push(op);remaining.delete(id);moved=true;}if(!moved)throw new Error('Invalid local sync journal');}
    return out;
  }
  function apply(state){
    const old=capture();
    for(const k of Object.keys(old.storage))if(!(k in state.storage))rawRemove(k);
    for(const [k,v] of Object.entries(state.storage))if(C.eligible(k)&&typeof v==='string'&&old.storage[k]!==v)rawSet(k,v);
    seen=C.clone(state);
  }
  function commit(k,v,expected){
    if(!owner()&&guestPage){if(v===null)rawRemove(k);else rawSet(k,String(v));seen=capture();return rawGet(k);}
    if(!enabled || !owner())return rawGet(k);
    const current=capture(),before=C.clone(seen),desired=C.clone(seen);
    if(expected!==undefined){if(expected===null)delete before.storage[k];else before.storage[k]=expected;}
    if(v===null)delete desired.storage[k];else desired.storage[k]=String(v);
    let changes=C.changes(before,desired);
    const currentRecords=C.split(current);
    // A render/readback that is already present is not another edit.
    changes=changes.filter(c=>!C.equal(c.after,C.value(currentRecords,c.id)));
    if(draft && expected===undefined)for(const change of changes)if(Object.hasOwn(draft,change.id))change.before=draft[change.id];
    if(!changes.length)return rawGet(k);
    const id=owner(),op=append(id,changes);
    // Journal is durable BEFORE the visible storage changes.
    const local=C.replay(current,[op]);apply(local.view);
    if(draft)for(const change of changes)delete draft[change.id];
    window.dispatchEvent(new Event('motionc:local-change'));
    return rawGet(k);
  }
  proto.setItem=function(k,v){if(this===localStorage&&C.eligible(String(k))){commit(String(k),String(v));return;}return set.call(this,k,v);};
  proto.removeItem=function(k){if(this===localStorage&&C.eligible(String(k))){commit(String(k),null);return;}return remove.call(this,k);};
  // A broad storage.clear() must not erase the acknowledged baseline or pending work.
  const clear=proto.clear;
  proto.clear=function(){if(this===localStorage&&owner())throw new Error('Use account sign-out to clear member state safely.');return clear.call(this);};
  seen=capture();
  if(owner()&&!read(owner()))preserveUpgrade(owner(),seen);
  // A person may start editing before the first network request completes. Startup render
  // writers stay gated, but an actual interaction can journal work immediately, even offline.
  for(const event of ['pointerdown','keydown','input'])document.addEventListener(event,e=>{
    if(e.isTrusted&&owner())enabled=true;
  },true);
  document.addEventListener('input',e=>{if(e.target.closest('#motionc-sync-review'))return;if(enabled&&!draft)draft=C.split(capture());},true);
  window.addEventListener('motionc:account-changing',()=>{enabled=false;draft=null;guestPage=false;});
  function enable(id){if(owner()!==id)throw new Error('Sync owner changed');enabled=true;seen=capture();}
  function checkpoint(id,record){const value=JSON.stringify(record);if(rawGet(key(id,'checkpoint'))!==value)rawSet(key(id,'checkpoint'),value);}
  function preserveUpgrade(id,state){if(rawGet(key(id,'pre-upgrade'))===null)rawSet(key(id,'pre-upgrade'),JSON.stringify(state));}
  function removeCovered(id,ids){for(const op of operations(id))if(ids.includes(op.id))rawRemove(op.key);}
  function resolve(id,conflict,choice){
    if(id!==owner())throw new Error('Sync owner changed');
    const after=choice==='cloud'?conflict.cloud:choice==='local'?conflict.local:conflict.alternatives[Number(choice)];
    append(id,[{id:conflict.id,before:conflict.cloud,after}],{cloud:conflict.cloud,local:conflict.local});
    window.dispatchEvent(new Event('motionc:local-change'));
  }
  const reviewKey=(id,dateId)=>key(id,'review:'+encodeURIComponent(dateId));
  function saveReview(review){if(review.owner!==owner())throw Error('Review belongs to another account');const encoded=JSON.stringify(review),k=reviewKey(review.owner,review.id);if(rawGet(k)!==encoded)rawSet(k,encoded);}
  function readReview(dateId){const raw=rawGet(reviewKey(owner(),dateId));return raw?JSON.parse(raw):null;}
  function reviews(){return Object.keys(localStorage).filter(k=>k.startsWith(key(owner(),'review:'))).map(k=>JSON.parse(rawGet(k)));}
  const pendingReview=review=>!['acknowledged','archived'].includes(review.status);
  function archiveReview(review){if(review.owner!==owner())throw Error('Review belongs to another account');rawSet(key(owner(),'review-archive:'+crypto.randomUUID()),JSON.stringify(review));}
  function reviewIsCurrent(review){
    if(review.owner!==owner())return false;
    const checkpoint=read(owner()),conflict=checkpoint?.conflicts?.[review.id];
    return C.equal(window.MotionCDayReview.signature(conflict),window.MotionCDayReview.signature(review.sources))&&
      C.equal(C.value(C.split(capture()),review.id),review.sources.local)&&
      C.equal(C.value(C.split(checkpoint?.base),review.id),review.sources.cloud)&&
      !operations(owner()).some(op=>op.changes.some(c=>c.id===review.id));
  }
  function resolveComposed(review){
    if(!reviewIsCurrent(review)){review.status='stale';saveReview(review);throw Error('This date changed during review. Your draft is retained. Review the latest versions before saving.');}
    const after=window.MotionCDayReview.record(review);
    review.result=Object.values(after)[0];review.submittedRecord=after;review.status='submitted';review.cloudRevision=String(read(owner()).revision);saveReview(review);
    append(owner(),[{id:review.id,before:review.sources.cloud,after}],{cloud:review.sources.cloud,local:review.sources.local});
    window.dispatchEvent(new Event('motionc:local-change'));
  }
  function acknowledgeReviews(state){
    for(const review of reviews())if(review.status==='submitted'&&C.equal(C.value(C.split(state),review.id),review.submittedRecord)){review.status='acknowledged';saveReview(review);}
  }
  window.MotionCSyncLocal=Object.freeze({capture,read,operations:id=>ordered(operations(id)),apply,commit,enable,checkpoint,preserveUpgrade,removeCovered,resolve,rawGet,rawSet,rawRemove,key,owner,saveReview,readReview,reviews,pendingReview,archiveReview,reviewIsCurrent,resolveComposed,acknowledgeReviews,
    clearDraft:()=>{draft=null;},hasDraft:()=>Boolean(draft),disable:()=>{enabled=false;},
    canDerive:()=>Boolean(enabled&&window.MotionCAccountReady?.owner===owner()&&!Object.keys(read(owner())?.conflicts||{}).length)});
})();
