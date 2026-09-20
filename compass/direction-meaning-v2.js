/* Presentation only: consume the existing accepted V2 angle; never alter the engine. */
(function(root){'use strict';
const meanings=Object.freeze({'North':'Positive Direction','North-East':'Positive, With Pressure','East':'Mixed Signals','South-East':'Negative, With Pressure','South':'Negative Direction'});
function describe(result){
 if(result?.model!=='nes-v2'||!result.accepted||typeof result.angle!=='number'||!Number.isFinite(result.angle)||result.angle<0||result.angle>180)return {direction:null,meaning:null,degrees:null};
 const a=result.angle,direction=a===0?'North':a<90?'North-East':a===90?'East':a<180?'South-East':'South';
 let degrees=a.toFixed(1)+'°';
 // Rounding must not visually turn a non-cardinal result into an exact pivot/end point.
 if(a>0&&a<.05)degrees='<0.1°';
 else if(a<90&&a>=89.95)degrees='just under 90°';
 else if(a>90&&a<90.05)degrees='just over 90°';
 else if(a<180&&a>=179.95)degrees='just under 180°';
 return {direction,meaning:meanings[direction],degrees};
}
root.CompassV2Meaning=Object.freeze({describe,meanings});if(typeof module!=='undefined')module.exports=root.CompassV2Meaning;
})(typeof window==='undefined'?globalThis:window);
