/* Presentation only. Embedded pixels are decoded locally; no production controller. */
const DemoWalking = (() => {
 const display=DEMO_WALKING_DISPLAY;
 let artworkPromise;
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 function pixels(){
  if(!artworkPromise)artworkPromise=Promise.all(Object.entries(DEMO_WALKING_ARTWORK).map(async([name,a])=>{
   const bytes=Uint8Array.from(atob(a.pixels),c=>c.charCodeAt(0));
   const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
   const raw=new Uint8ClampedArray(await new Response(stream).arrayBuffer());
   return [name,new ImageData(raw,a.width,a.height)];
  })).then(Object.fromEntries).catch(error=>{artworkPromise=null;throw error;});
  return artworkPromise;
 }
 function render(){
  const data=display.current,root=el('section');root.id='dw-root';root.setAttribute('aria-labelledby','dw-title');
  const heading=el('header','dw-heading');const title=el('h1',null,'Walking to Jasper');title.id='dw-title';
  heading.append(title,el('p',null,'Dave · September 20, 2026 · Read-only Demo'));root.append(heading);
  const scene=el('div','dw-scene'),art=el('div','dw-art'),map=el('canvas','dw-map');map.setAttribute('role','img');
  map.setAttribute('aria-label','Calgary to Jasper illustrated route. Castle Junction is the latest reached station; Lake Louise is next.');
  art.append(map);
  const stationList=el('ol','dw-sr');stationList.setAttribute('aria-label','Route stations');
  for(const s of display.stations){
   const dot=el('span','dw-dot dw-'+s.state);dot.style.left=s.x+'%';dot.style.top=s.y+'%';dot.setAttribute('aria-hidden','true');art.append(dot);
   stationList.append(el('li',null,s.name+' · '+s.miles+' mi · '+(s.state==='past'?'reached':s.state==='current'?'latest reached':'ahead')));
  }
  const marker=el('canvas','dw-marker');marker.style.left=data.marker.x+'%';marker.style.top=data.marker.y+'%';marker.setAttribute('aria-hidden','true');art.append(marker);
  const flag=el('span','dw-flag','MC');flag.setAttribute('aria-hidden','true');art.append(flag);
  const loading=el('p','dw-loading','Loading Jasper artwork…');loading.setAttribute('role','status');art.append(loading);
  scene.append(art);
  const total=el('section','dw-panel dw-total');total.setAttribute('aria-label','Walking page total');
  const journey=el('strong',null,data.journeyMiles);journey.id='dw-journey';
  const lifetime=el('small','dw-lifetime');lifetime.append('Lifetime: ',el('b',null,data.lifetimeMiles),' mi');
  total.append(journey,el('span',null,'Current Journey Miles'),lifetime);scene.append(total);
  const next=el('section','dw-panel dw-next');next.setAttribute('aria-labelledby','dw-next-title');
  const nextTitle=el('h2',null,'Next Stops');nextTitle.id='dw-next-title';next.append(nextTitle);
  const stops=el('div','dw-stops');
  display.upcoming.forEach((s,i)=>{const card=el('article','dw-stop');card.append(el('strong',null,(i+1)+'. '+s.name),el('span',null,s.away+' mi away'),el('small',null,'Route milestone: '+s.milestone+' mi'));stops.append(card);});next.append(stops);
  const progress=el('div','dw-progress'),label=el('div','dw-progress-heading');label.append(el('span',null,data.progressLabel),el('span',null,data.progressText));
  const track=el('div','dw-track');track.setAttribute('role','progressbar');track.setAttribute('aria-label',data.progressLabel);track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow','41');track.setAttribute('aria-valuetext',data.progressDetail+' · '+data.progressText);
  const fill=el('div','dw-fill');fill.style.width=data.progressFill+'%';track.append(fill);progress.append(label,track,el('small','dw-progress-detail',data.progressDetail));next.append(progress);scene.append(next);
  const entry=el('section','dw-panel dw-entry');entry.append(el('h2',null,'Walking Progress'),el('p',null,'Current Journey tracks this route. Lifetime includes every walk saved on Daily, even after starting a new journey.'),el('span','dw-readonly','Read-only Demo'));scene.append(entry);
  const route=el('div','dw-route');route.append(el('strong',null,'Calgary to Jasper'),el('span',null,'Read-only Demo'));scene.append(route);
  root.append(scene,stationList);document.getElementById('demo-root').replaceChildren(root);
  pixels().then(images=>{
   if(!root.isConnected)return;
   for(const [canvas,key]of [[map,'map'],[marker,'marker']]){canvas.width=images[key].width;canvas.height=images[key].height;canvas.getContext('2d').putImageData(images[key],0,0);}
   loading.remove();root.dataset.artwork='ready';
  }).catch(()=>{if(root.isConnected){loading.textContent='Jasper artwork could not be displayed in this browser. Journey details are shown below.';root.dataset.artwork='unavailable';}});
 }
 return Object.freeze({render});
})();
