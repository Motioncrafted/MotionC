/* DOM presentation only; all observations come from Compass V2 evidence. */
(()=>{'use strict';
  const $=id=>document.getElementById(id);
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  let lastOwner=null,lastView=null;
  function rich(node,observation){
    const {text,strong}=observation,at=strong?text.toLowerCase().indexOf(strong.toLowerCase()):-1;
    if(at<0){node.textContent=text;return;}
    node.append(document.createTextNode(text.slice(0,at)),el('strong',text.slice(at,at+strong.length)),document.createTextNode(text.slice(at+strong.length)));
  }
  function disclosure(card,key,title,open){const d=el('details',null,'card-disclosure');d.dataset.disclosure=key;d.open=Boolean(open[key]);const summary=el('summary',title);summary.id=card.id+'-'+key;d.append(summary);return d;}
  function renderCard(c,reset){
    const box=$(c.id),open={};
    if(!reset)box.querySelectorAll('details[data-disclosure]').forEach(d=>open[d.dataset.disclosure]=d.open);
    const focused=box.contains(document.activeElement)?document.activeElement.id:null;
    box.replaceChildren();
    const header=el('div',null,'card-heading'),icon=el('div',c.icon,'driver-icon');icon.setAttribute('aria-hidden','true');header.append(icon,el('h2',c.title));box.append(header);
    const observation=el('p',null,'card-observation');rich(observation,c.observation);box.append(observation);
    const evidence=el('p',null,'evidence');for(const line of c.evidence)evidence.append(el('span',line));box.append(evidence);
    const disclosures=el('div',null,'card-disclosures');
    const why=disclosure(c,'why','Why this matters',open);why.append(el('p',c.why));if(c.context)why.append(el('p',c.context));
    const changed=disclosure(c,'changed',"What's changed",open);changed.append(el('p',c.change.text));for(const line of c.change.lines)changed.append(el('p',line,'comparison-evidence'));
    const how=disclosure(c,'how','How Compass uses this',open);how.append(el('p',c.how));
    disclosures.append(why,changed,how);box.append(disclosures);
    if(focused)$(focused)?.focus({preventScroll:true});
  }
  function render(state,result,previous=null,owner=null){
    let metric=false;try{metric=JSON.parse(localStorage.getItem('motionc-preferences-v1'))?.unitSystem==='metric';}catch{}
    const view=window.CompassV2Language.build(state,result,previous,{metric}),serialized=JSON.stringify(view),reset=owner!==lastOwner;
    if(!reset&&serialized===lastView)return;lastOwner=owner;lastView=serialized;
    for(const card of view.cards)renderCard(card,reset);
    const area=$('speakEasy');area.querySelector('h2').textContent=view.story.headline;const body=$('speakEasyStory');body.replaceChildren();
    view.story.facts.forEach((fact,i)=>{if(i)body.append(document.createTextNode(' '));const span=el('span');rich(span,fact);body.append(span);});
  }
  window.CompassV2Cards=Object.freeze({render});
})();
