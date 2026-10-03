/* Transport-independent coordinator; the browser bridge supplies locks and account checks. */
(function(root){
  'use strict';
  const C=root.MotionCSyncCore;
  async function synchronize({id,local,readCloud,writeCloud,assertCurrent}){
    assertCurrent();
    let checkpoint=local.read(id);
    if(checkpoint?.projectionPending){
      const later=local.operations(id).filter(o=>!(checkpoint.covered||[]).includes(o.id));
      local.apply(C.replay(checkpoint.base,later,checkpoint.conflicts).view);
      checkpoint.projectionPending=false;local.checkpoint(id,checkpoint);
      local.removeCovered(id,checkpoint.covered||[]);
    }
    let cloud=await readCloud();assertCurrent();
    for(let attempt=0;attempt<4;attempt++){
      const current=local.capture(),ops=local.operations(id).filter(o=>!(checkpoint?.covered||[]).includes(o.id));
      let initial;
      if(!checkpoint){
        local.preserveUpgrade(id,current);
        initial=C.reconcile(null,current,cloud.state);
      }else{
        // Preserve unjournaled differences (e.g. an older tab on this browser) conservatively.
        initial=C.reconcile(checkpoint.base,checkpoint.view,cloud.state,checkpoint.conflicts);
        const unexpected=C.changes(checkpoint.view,current);
        const touched=new Set(ops.flatMap(o=>o.changes.map(c=>c.id)));
        for(const c of unexpected)if(!touched.has(c.id))initial.conflicts[c.id]={id:c.id,base:c.before,local:c.after,cloud:C.value(C.split(cloud.state),c.id)};
      }
      let merged=C.replay(initial.upload,ops,initial.conflicts);
      // During first upgrade, pre-existing differences are conflicts even if startup has intents.
      if(!checkpoint)merged=C.replay(cloud.state,ops,initial.conflicts);
      let saved=cloud;
      if(!C.equal(C.split(merged.upload),C.split(cloud.state))){
        assertCurrent();
        const result=await writeCloud(cloud.revision,merged.upload);assertCurrent();
        if(!result.ok){cloud=await readCloud();assertCurrent();continue;}
        saved=result;
      }
      // Include edits made while the network request was in flight; never acknowledge those early.
      const covered=ops.map(o=>o.id),later=local.operations(id).filter(o=>!covered.includes(o.id)&&!(checkpoint?.covered||[]).includes(o.id));
      const projected=C.replay(saved.state,later,merged.conflicts);
      const needsProjection=!C.equal(C.split(local.capture()),C.split(projected.view));
      const next={version:1,base:saved.state,revision:String(saved.revision),view:merged.view,conflicts:merged.conflicts,covered,projectionPending:needsProjection};
      // Persist the recovery checkpoint before multi-key projection or journal cleanup.
      assertCurrent();local.checkpoint(id,next);local.apply(projected.view);
      if(needsProjection){next.projectionPending=false;local.checkpoint(id,next);}
      local.removeCovered(id,covered);
      return {cloud:saved,view:projected.view,conflicts:projected.conflicts,pending:later.length};
    }
    throw new Error('Cloud changed repeatedly. Your local changes are retained; synchronization will retry.');
  }
  root.MotionCSyncEngine=Object.freeze({synchronize});
  if(typeof module!=='undefined')module.exports=root.MotionCSyncEngine;
})(typeof window!=='undefined'?window:globalThis);
