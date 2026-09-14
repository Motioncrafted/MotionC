(function (root) {
  'use strict';
  const clamp = (v, lo=0, hi=100) => Math.max(lo, Math.min(hi, v));
  const number = v => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v)) ? Number(v) : null;
  const anchors = {
    walking:[[0,0],[10,20],[20,40],[30,60],[45,80],[60,90],[75,94],[90,96],[120,98]],
    sleep:[[4,15],[4.5,25],[5,35],[5.5,45],[6,60],[6.5,75],[7,90],[7.5,95],[8,98],[8.5,97],[9,95],[10,90]],
    hydration:[[0,0],[15,20],[30,40],[45,70],[60,85],[75,95],[90,98],[105,98]],
    stress:[[0,100],[1,98],[2,90],[3,70],[4,40],[5,15]]
  };
  // Shape-preserving cubic Hermite interpolation (PCHIP). Exact anchors,
  // continuous first derivative and no overshoot on each monotone interval.
  function curve(points) {
    const n=points.length, h=[], delta=[], slopes=[];
    for(let i=0;i<n-1;i++){h[i]=points[i+1][0]-points[i][0];delta[i]=(points[i+1][1]-points[i][1])/h[i];}
    function edge(h0,h1,d0,d1){let m=((2*h0+h1)*d0-h0*d1)/(h0+h1);if(Math.sign(m)!==Math.sign(d0))m=0;else if(Math.sign(d0)!==Math.sign(d1)&&Math.abs(m)>Math.abs(3*d0))m=3*d0;return m;}
    slopes[0]=edge(h[0],h[1],delta[0],delta[1]);
    slopes[n-1]=edge(h[n-2],h[n-3],delta[n-2],delta[n-3]);
    for(let i=1;i<n-1;i++){
      if(delta[i-1]*delta[i]<=0)slopes[i]=0;
      else {const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];slopes[i]=(w1+w2)/(w1/delta[i-1]+w2/delta[i]);}
    }
    return {slopes,at(x){if(x<=points[0][0])return points[0][1];if(x>=points[n-1][0])return points[n-1][1];let i=0;while(x>points[i+1][0])i++;const t=(x-points[i][0])/h[i],t2=t*t,t3=t2*t;return (2*t3-3*t2+1)*points[i][1]+(t3-2*t2+t)*h[i]*slopes[i]+(-2*t3+3*t2)*points[i+1][1]+(t3-t2)*h[i]*slopes[i+1];}};
  }
  const curves=Object.fromEntries(Object.entries(anchors).map(([k,v])=>[k,curve(v)]));
  function score(key,raw){const x=number(raw);if(x===null||x<0)return null;
    if(key==='walking'&&x>120)return Math.min(100-Number.EPSILON*100,100-2*Math.exp(-curves.walking.slopes.at(-1)*(x-120)/2));
    // Unspecified low-sleep tail: smooth exponential decay below four hours.
    if(key==='sleep'&&x<4)return 15*Math.exp(curves.sleep.slopes[0]*(x-4)/15);
    if(key==='sleep'&&x>10)return 90*Math.exp(curves.sleep.slopes.at(-1)*(x-10)/90);
    return clamp(curves[key].at(x));
  }
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function previousDays(today){const d=new Date(today+'T12:00:00');return Array.from({length:7},()=>{d.setDate(d.getDate()-1);return iso(d);});}
  function weeklyKey(today){const d=new Date(today+'T12:00:00');d.setDate(d.getDate()-d.getDay());return iso(d);}
  function gaugeWindow(state,key,dates){const samples=[];for(const date of dates){const item=state.dailyGauges?.[date]?.[key];let v=number(item?.value);if(v===null||v<0)continue;
    // Match Daily's existing legacy hydration migration, without writing it.
    if(key==='hydration'&&item.unit!=='oz')v*=10;
    if((key==='stress'&&v>5)||(key==='sleep'&&v>12))continue;
    samples.push({date,value:v});}
    return {samples,raw:samples.length===7?samples.reduce((s,x)=>s+x.value,0)/7:null};
  }
  const lifestyleKeys=['sleep','hydration','nutrition','activity','stress','alcohol','smoking','movement'];
  function lifestyle(state,summary,today){
    const candidates=[];
    for(const [week,item] of Object.entries(state.weeks||{})){
      if(!item||item.assessed===false||week>today)continue;
      const values=lifestyleKeys.map(k=>number(item.values?.[k]));
      if(item.lifestyleScale!==3||values.some(v=>v===null||v<1||v>3))continue;
      const total=number(item.summaryScore)??values.reduce((s,v)=>s+v,0);
      candidates.push({week,total,updatedAt:item.updatedAt||item.summaryUpdatedAt||week});
    }
    if(summary&&summary.week<=today&&number(summary.maximumScore)===24){
      const values=lifestyleKeys.map(k=>number(summary.values?.[k]));const total=number(summary.score);
      if(total!==null&&values.every(v=>v!==null&&v>=1/3&&v<=1))candidates.push({week:summary.week,total,updatedAt:summary.updatedAt||summary.week});
    }
    const current=weeklyKey(today);candidates.sort((a,b)=>Number(b.week===current)-Number(a.week===current)||String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const selected=candidates[0];return selected?{raw:selected.total,score:clamp((selected.total-8)/16*100),week:selected.week}: {raw:null,score:null,week:null};
  }
  function directionValue(compass){if(!compass?.defensible||number(compass.angle)===null)return null;
    const angle=((compass.angle%360)+360)%360;
    // Exact cardinal pivots avoid sin(180°)'s floating-point residue.
    if(angle===0||angle===180)return 50;
    return clamp(50+50*Math.sin(angle*Math.PI/180));
  }
  function response(D,C){if(number(D)===null||number(C)===null)return null;if(D===50)return 50;return clamp(D>50?50+(D-50)*(1+(C-50)/100):50-(50-D)*(1+(50-C)/100));}
  function calculate(state={},summary=null,compass=null,today=iso(new Date())){
    const dates=previousDays(today),entry=state.entries?.[today];let minutes=null;
    if(Array.isArray(entry?.walks)&&entry.walks.length){const values=entry.walks.map(w=>number(w?.minutes));if(values.every(v=>v!==null&&v>=0))minutes=values.reduce((s,v)=>s+v,0);}
    else {const v=number(entry?.minutes);if(v!==null&&v>=0)minutes=v;}
    const windows=Object.fromEntries(['sleep','hydration','stress'].map(k=>[k,gaugeWindow(state,k,dates)]));
    const life=lifestyle(state,summary,today);
    const components=[{key:'walking',weight:.30,raw:minutes,score:score('walking',minutes),days:minutes===null?0:1},
      ...['sleep','hydration','stress'].map((key,i)=>({key,weight:[.25,.20,.15][i],raw:windows[key].raw,score:score(key,windows[key].raw),days:windows[key].samples.length})),
      {key:'lifestyle',weight:.10,...life,days:life.score===null?0:1}];
    const available=components.filter(c=>c.score!==null),weight=available.reduce((s,c)=>s+c.weight,0);
    const carryover=weight?available.reduce((s,c)=>s+c.score*c.weight,0)/weight:null;
    const D=directionValue(compass),value=response(D,carryover);
    const completeDays=dates.filter(d=>Object.values(windows).every(w=>w.samples.some(s=>s.date===d))).length;
    return {today,dates,components,availableWeight:weight,carryover,D,response:value,displayResponse:value===null?null:Math.round(value),completeDays,direction:compass?.defensible?compass.direction:null};
  }
  root.MotionCResponse=Object.freeze({anchors,score,calculate,directionValue,response,previousDays});
})(typeof window==='undefined'?globalThis:window);
