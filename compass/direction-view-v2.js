/* Presentation only: exact V2 angles and the existing corrected-history predecessor. */
(function(root){'use strict';
  const angle=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=180;
  const degrees=v=>v.toFixed(1)+'°';
  function comparison(current,previous){
    const delta=current-previous,amount=Math.abs(delta);
    if(amount<=1e-12)return 'Direction is unchanged since your previous reading.';
    const movement=delta>0?'lower':'higher';
    return amount<.1?`Moved less than 0.1° ${movement} on the scale since your previous reading.`:`Moved ${amount.toFixed(1)}° ${movement} on the scale since your previous reading.`;
  }
  function describe(result,presentation={}){
    const current=result.accepted&&angle(result.angle)?result.angle:null;
    const prior=current!==null&&angle(presentation.previous?.angle)?presentation.previous:null;
    return {current,previous:prior?.angle??null,
      comparison:current===null?'A direction is not available yet.':prior?comparison(current,prior.angle):presentation.saved?'This is your current Compass baseline.':'This is your current direction. A saved baseline is not available yet.',
      accessible:current===null?'Direction unavailable. Scale from 0 degrees at the top to 180 degrees at the bottom.':`Current direction ${degrees(current)}.${prior?' Previous reading '+degrees(prior.angle)+'.':''} Scale from 0 degrees at the top to 180 degrees at the bottom.`,
      previousDescription:prior?`Previous reading: ${degrees(prior.angle)} · ${new Date(prior.savedAt).toLocaleString()}`:''};
  }
  function render(result,presentation){
    const view=describe(result,presentation),$=id=>document.getElementById(id);
    const current=$('currentMarker'),previous=$('previousMarker');
    current.hidden=view.current===null;previous.hidden=view.previous===null;
    if(view.current!==null){current.style.top=(view.current/180*100)+'%';$('currentAngle').textContent=degrees(view.current);current.title=`Current direction: ${view.current}°`;}
    else{current.style.removeProperty('top');$('currentAngle').textContent='—';current.removeAttribute('title');}
    if(view.previous!==null){previous.style.top=(view.previous/180*100)+'%';previous.title=`Previous reading: ${view.previous}°`;}
    else{previous.style.removeProperty('top');previous.removeAttribute('title');}
    $('directionTrack').setAttribute('aria-label',view.accessible);
    $('directionUnavailable').hidden=view.current!==null;
    $('directionComparison').textContent=view.comparison;
    $('previousDescription').textContent=view.previousDescription;
    $('previousReadout').hidden=view.previous===null;
    $('directionTechnicalValues').textContent=JSON.stringify({angle:result.angle,x:result.x,y:result.y,magnitude:result.magnitude,coverage:result.coverage,accepted:result.accepted,reasons:result.reasons},null,2);
  }
  const api=Object.freeze({describe,comparison,render});root.CompassV2DirectionView=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
