/* Read-only presentation. Curated outputs are rendered without production controllers. */
const DemoCompass = (() => {
 const data=DEMO_COMPASS_DISPLAY,template="<main class=\"compass-page design-view\">\n  <header class=\"hero\">\n    <div class=\"brand\">Motion<span>C</span></div>\n    <button class=\"back-link\" id=\"compassReturnLink\" type=\"button\">← Back to MotionC</button>\n    <h1 id=\"dc-heading\" tabindex=\"-1\">Your Compass</h1><p>What your recorded information is saying.</p>\n  </header>\n  <div class=\"compass-overview\">\n    <section id=\"speakEasy\" class=\"speak-easy\" aria-labelledby=\"speakEasyHeading\">\n      <p class=\"eyebrow\">COMPASS SPEAK-EASY</p><h2 id=\"speakEasyHeading\">Reading your recorded picture…</h2><p id=\"speakEasyStory\"></p>\n    </section>\n    <section class=\"direction-panel\" aria-labelledby=\"directionHeading\">\n      <h2 id=\"directionHeading\">Your direction</h2>\n      <p class=\"direction-intro\">Where your recent pattern is heading.</p>\n      <div id=\"directionTrack\" class=\"direction-scale\" role=\"img\" aria-label=\"Direction unavailable. Scale from 0 degrees at the top to 180 degrees at the bottom.\">\n        <div class=\"direction-track-line\" aria-hidden=\"true\"></div>\n        <div class=\"direction-tick t0\" aria-hidden=\"true\"><span>0°</span></div>\n        <div class=\"direction-tick t45\" aria-hidden=\"true\"><span>45°</span></div>\n        <div class=\"direction-tick t90\" aria-hidden=\"true\"><span>90°</span></div>\n        <div class=\"direction-tick t135\" aria-hidden=\"true\"><span>135°</span></div>\n        <div class=\"direction-tick t180\" aria-hidden=\"true\"><span>180°</span></div>\n        <div id=\"previousMarker\" class=\"previous-marker\" hidden aria-hidden=\"true\"></div>\n        <div id=\"currentMarker\" class=\"current-marker\" hidden aria-hidden=\"true\"><strong id=\"currentAngle\">—</strong><span>Current</span></div>\n      </div>\n      \n      <p id=\"previousReadout\" class=\"previous-readout\" hidden><span class=\"previous-swatch\" aria-hidden=\"true\"></span><span id=\"previousDescription\"></span></p>\n      <p id=\"directionComparison\" class=\"direction-comparison\" aria-live=\"polite\"></p>\n      \n      <p id=\"mcpPosition\" class=\"mcp-position\" aria-label=\"Current position: MCP not assessed\"><span>Current position:</span><span class=\"mcp-readout\">MCP <strong id=\"mcpScore\">—</strong> · <span id=\"mcpZone\">Not assessed</span></span></p>\n      <p id=\"coverage\" class=\"coverage-note\"></p>\n    </section>\n  </div>\n  <section class=\"shaping-section\" aria-labelledby=\"shapingHeading\">\n    <h2 id=\"shapingHeading\">WHAT'S SHAPING THIS</h2>\n    <div class=\"shaping-cards\">\n      <article class=\"driver movement\" id=\"movementCard\"></article>\n      <article class=\"driver recovery\" id=\"recoveryCard\"></article>\n      <article class=\"driver support\" id=\"supportCard\"></article>\n      <article class=\"driver body\" id=\"bodyCard\"></article>\n    </div>\n  </section>\n  <section class=\"history-card\">\n    <header class=\"history-header\"><button id=\"historyBack\" aria-label=\"Show seven days earlier\">◀</button><div><h2>Your direction, over time</h2><p id=\"historyRange\"></p></div><button id=\"historyForward\" aria-label=\"Show seven days later\">▶</button></header>\n    <p class=\"history-intro\">Dave’s curated direction readings, in degrees. 0° at the top · 180° at the bottom.</p>\n    <div class=\"history-chart-wrap\"><svg id=\"historyPlot\" role=\"group\" aria-label=\"Dave’s curated direction readings, from 0 degrees at the top to 180 at the bottom. Select a point to inspect its dated reading.\"></svg></div>\n    <div id=\"v2History\" class=\"v2-history\"></div><button id=\"historyToday\">Latest 14 days</button>\n    <p class=\"design-note\">Curated Demo readings · September 7–20, 2026.</p>\n  </section>\n  <nav class=\"page-bottom-nav\"><a class=\"back-to-top\" href=\"#dc-heading\">Back to Top ↑</a></nav>\n</main>";
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const rich=(node,{text,strong})=>{const at=strong?text.toLowerCase().indexOf(strong.toLowerCase()):-1;if(at<0){node.textContent=text;return;}node.append(document.createTextNode(text.slice(0,at)),el('strong',text.slice(at,at+strong.length)),document.createTextNode(text.slice(at+strong.length)));};
 function drawHistory(){
  const svg=document.querySelector('#dc-root #historyPlot');if(!svg)return;
  const width=svg.parentElement.clientWidth;svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+width+' 180');
  const node=(tag,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;svg.append(n);return n;};
  // Layout geometry only: the angle-to-height mapping is already curated.
  const x=p=>65+p.xFraction*(width-85);
  for(const [y,label]of [[20,'0°'],[82.5,'90°'],[145,'180°']]){node('line',{x1:65,x2:width-20,y1:y,y2:y,class:'history-gridline'});node('text',{x:55,y:y+4,'text-anchor':'end',class:'history-axis'},label);}
  for(const [fraction,label,anchor]of [[0,'Sep 7','start'],[6/13,'Sep 13','middle'],[1,'Sep 20','end']])node('text',{x:65+fraction*(width-85),y:174,'text-anchor':anchor,class:'history-axis'},label);
  let previous=null;
  for(const p of data.history){
   if(previous)node('line',{x1:x(previous),x2:x(p),y1:previous.y,y2:p.y,class:'history-line'});
   const target=node('g',{class:'history-point',tabindex:0,role:'button','aria-controls':'dc-reading-'+p.date,'aria-label':p.label+': '+p.angleText+'. Show curated evidence.'});
   const circle=(radius,fill)=>{const n=document.createElementNS('http://www.w3.org/2000/svg','circle');n.setAttribute('cx',x(p));n.setAttribute('cy',p.y);n.setAttribute('r',radius);n.setAttribute('fill',fill);target.append(n);};
   circle(Math.min(12,(width-85)/26),'transparent');circle(5,'black');
   const select=()=>{const d=document.getElementById('dc-reading-'+p.date);d.open=true;d.querySelector('summary').focus();};
   target.addEventListener('click',select);target.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});previous=p;
  }
 }
 function render(){
  const host=document.getElementById('demo-root');host.innerHTML='<div id="dc-root">'+template+'</div>';
  const $=id=>document.getElementById(id),s=data.current;
  $('compassReturnLink').addEventListener('click',()=>requestScreen('home'));
  $('speakEasyHeading').textContent=s.story.headline;
  s.story.facts.forEach((fact,i)=>{if(i)$('speakEasyStory').append(document.createTextNode(' '));const span=el('span');rich(span,fact);$('speakEasyStory').append(span);});
  $('directionTrack').setAttribute('aria-label',s.accessible);
  $('currentMarker').hidden=false;$('currentMarker').style.top=s.markerTop+'%';$('currentAngle').textContent=s.angleText;
  $('previousMarker').hidden=false;$('previousMarker').style.top=s.previousTop+'%';$('previousReadout').hidden=false;$('previousDescription').textContent=s.previousText;
  $('directionComparison').textContent=s.comparison;$('mcpScore').textContent=s.mcpScore;$('mcpZone').textContent=s.mcpZone;$('mcpPosition').setAttribute('aria-label','Current position: MCP '+s.mcpScore+', '+s.mcpZone);$('coverage').textContent=s.coverageText;
  for(const c of s.cards){
   const box=$(c.id),head=el('div',null,'card-heading'),icon=el('div',c.icon,'driver-icon');icon.setAttribute('aria-hidden','true');head.append(icon,el('h2',c.title));box.append(head);
   const observation=el('p',null,'card-observation');rich(observation,c.observation);box.append(observation);
   const evidence=el('p',null,'evidence');for(const line of c.evidence)evidence.append(el('span',line));box.append(evidence);
   const disclosures=el('div',null,'card-disclosures');
   for(const [key,title,lines]of [['why','Why this matters',[c.why,...(c.context?[c.context]:[])]],['changed',"What's changed",[c.change.text,...c.change.lines]]]){const d=el('details',null,'card-disclosure'),summary=el('summary',title);summary.id=c.id+'-'+key;d.append(summary);lines.forEach((line,i)=>d.append(el('p',line,key==='changed'&&i?'comparison-evidence':null)));disclosures.append(d);}box.append(disclosures);
  }
  $('historyRange').textContent='Sep 7, 2026 – Sep 20, 2026';$('historyBack').disabled=true;$('historyForward').disabled=true;
  for(const p of data.history){const d=el('details',null,'history-reading');d.id='dc-reading-'+p.date;d.dataset.date=p.date;const summary=el('summary',p.label);summary.append(el('strong',p.angleText));d.append(summary,el('p',p.evidence));$('v2History').append(d);}
  $('historyToday').addEventListener('click',()=>{const d=$('dc-reading-2026-09-20');d.open=true;d.querySelector('summary').focus();});
  document.querySelector('#dc-root .back-to-top').addEventListener('click',e=>{e.preventDefault();$('dc-heading').focus({preventScroll:true});$('compassReturnLink').scrollIntoView({block:'start'});});
  drawHistory();
 }
 window.addEventListener('resize',drawHistory);
 return Object.freeze({render});
})();

