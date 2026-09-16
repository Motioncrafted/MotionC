(function(root){
  'use strict';
  const name=k=>k[0].toUpperCase()+k.slice(1),eps=1e-9;
  const format=v=>new Intl.NumberFormat(undefined,{maximumFractionDigits:4}).format(v);
  function analyse(before,after){
    const check=root.MotionCResponseSnapshots.usable;
    if(!check(before)||!check(after))return null;
    const f=root.MotionCResponse.response,D0=before.Direction,D1=after.Direction,C0=before.Carryover,C1=after.Carryover;
    // Average the two exact change orders, sharing the Direction/Carryover
    // interaction equally. Uses V1 including its pivot and clamping behavior.
    const directionEffect=((f(D1,C0)-f(D0,C0))+(f(D1,C1)-f(D0,C1)))/2;
    const carryoverEffect=((f(D0,C1)-f(D0,C0))+(f(D1,C1)-f(D1,C0)))/2;
    const components=after.components.map(c=>{const old=before.components.find(x=>x.key===c.key);
      return {key:c.key,before:old.score,after:c.score,availabilityChanged:(old.score===null)!==(c.score===null),
        weightedChange:(c.score??0)*c.effectiveWeight-(old.score??0)*old.effectiveWeight};});
    return {directionEffect,carryoverEffect,carryoverChange:C1-C0,components,change:after.Response-before.Response};
  }
  function explain(pair){
    if(!pair)return 'A matching starting and current calculation is not available yet. Detailed causes cannot be identified for this change.';
    const {before,after}=pair,a=analyse(before,after);
    if(!a)return 'Detailed causes are unavailable because the matching calculation snapshots are incomplete.';
    const from=Math.round(before.Response),to=Math.round(after.Response),parts=[];
    const moved=Math.abs(a.change)>eps,verb=a.change>0?'rose':'fell';
    const largest=Math.max(Math.abs(a.directionEffect),Math.abs(a.carryoverEffect));
    const significant=v=>Math.abs(v)>Math.max(eps,largest*.1);
    const ranking=[...a.components].sort((x,y)=>Math.abs(y.weightedChange)-Math.abs(x.weightedChange));
    const availability=a.components.some(c=>c.availabilityChanged);
    if(!moved){parts.push(`Response remains at ${to}.`);
      if(Math.abs(a.directionEffect)>eps&&Math.abs(a.carryoverEffect)>eps)parts.push('Direction and Carryover changes balanced each other out.');
      else if(Math.abs(a.carryoverChange)>eps||before.Direction!==after.Direction)parts.push('The inputs changed, but the pivot or score limit kept Response unchanged.');
      else if(ranking.some(c=>Math.abs(c.weightedChange)>eps))parts.push('Opposing component changes balanced out within Carryover.');
      else parts.push('There was no change in the inputs that set this score.');
    }else if(Math.abs(a.directionEffect)>=Math.abs(a.carryoverEffect)){
      parts.push(`Response ${verb}${from!==to?` from ${from} to ${to}`:''} mainly because Compass changed its direction or strength.`);
      if(significant(a.carryoverEffect))parts.push(`Carryover ${a.carryoverChange>0?'increased':'decreased'}${Math.sign(a.carryoverEffect)!==Math.sign(a.change)?', partly offsetting that movement':', adding to that movement'}.`);
    }else{
      const aligned=ranking.filter(c=>Math.sign(c.weightedChange)===Math.sign(a.carryoverChange)),lead=aligned[0];
      if(availability)parts.push(`Response ${verb}${from!==to?` from ${from} to ${to}`:''} mainly because the available Carryover inputs changed.`);
      else parts.push(`Response ${verb}${from!==to?` from ${from} to ${to}`:''} mainly because ${lead?name(lead.key):'Carryover'} support ${a.carryoverChange>0?'strengthened':'weakened'}.`);
      if(significant(a.directionEffect))parts.push(`Compass also changed${Math.sign(a.directionEffect)!==Math.sign(a.change)?', partly offsetting that movement':', adding to that movement'}.`);
    }
    if(Math.abs(a.carryoverChange)>eps){
      const aligned=ranking.filter(c=>Math.sign(c.weightedChange)===Math.sign(a.carryoverChange));
      const threshold=Math.max(eps,(ranking[0]?.weightedChange?Math.abs(ranking[0].weightedChange):0)*.1);
      const meaningful=aligned.filter(c=>Math.abs(c.weightedChange)>=threshold).slice(0,2);
      const opposing=ranking.filter(c=>Math.sign(c.weightedChange)!==Math.sign(a.carryoverChange)&&Math.abs(c.weightedChange)>=threshold).slice(0,2);
      parts.push(`Carryover ${a.carryoverChange>0?'rose':'fell'} from ${format(before.Carryover)} to ${format(after.Carryover)}${meaningful.length?`, led by ${meaningful.map(c=>name(c.key)).join(' and ')} after weighting`:''}${opposing.length?`; ${opposing.map(c=>name(c.key)).join(' and ')} partly offset that change`:''}.`);
    }
    if(moved&&Math.abs(a.carryoverChange)<=eps&&ranking.some(c=>Math.abs(c.weightedChange)>eps)){
      const positive=ranking.find(c=>c.weightedChange>eps),negative=ranking.find(c=>c.weightedChange< -eps);
      parts.push(`${name(positive.key)} and ${name(negative.key)} led opposing changes that balanced out within Carryover.`);
    }
    if(availability)parts.push(`${a.components.filter(c=>c.availabilityChanged).map(c=>name(c.key)+(c.after===null?' became unavailable':' became available')).join('; ')}. Available weights were redistributed.`);
    if(from!==to&&Math.abs(a.change)<1)parts.push(`The underlying change was less than one point (${format(before.Response)} → ${format(after.Response)}); crossing a rounding boundary changed the displayed integer.`);
    else if(moved&&from===to)parts.push(`The change is too small to alter the displayed ${to}.`);
    return parts.join(' ');
  }
  root.MotionCResponseMovement=Object.freeze({analyse,explain});
})(typeof window==='undefined'?globalThis:window);
