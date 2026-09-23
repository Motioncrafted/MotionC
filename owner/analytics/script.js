import { supabase } from '/shared/motionc-supabase.js?v=20260923-phase2';
const gate=document.querySelector('#gate'), dashboard=document.querySelector('#dashboard'), period=document.querySelector('#period'), status=document.querySelector('#status');
let generation=0;
const names={weekly_checkin_saved:'Weekly Check-In Saved',mo_shortcut:'Mo Explainer shortcut uses',comix_opened:'Comix viewer opened',contribution_local:'Drop Zone — local completion',contribution_server:'Drop Zone — server saved',signin_success:'Successful sign-ins',signin_failed:'Failed sign-ins',save_failed:'Contribution save failures',sync_failed:'Account sync failures',article_failed:'Article load failures'};
const labels={'/':'MotionC','/landing-page/':'MotionC','/daily/':'Daily','/walking/':'Walking','/dashboard/':'Summary','/compass/':'Compass','/engine-room/':'Engine Room','/library/':'Library','/drop-zone/':'Drop Zone'};
const number=n=>Number(n||0).toLocaleString();
function text(id,value){document.querySelector('#'+id).textContent=value;}
function duration(s){s=Math.round(s||0);return Math.floor(s/60)+'m '+s%60+'s';}
function list(id,rows){const root=document.querySelector('#'+id);root.replaceChildren();for(const row of rows){const li=document.createElement('li'),span=document.createElement('span'),b=document.createElement('b');span.textContent=labels[row.name]||names[row.name]||row.name;b.textContent=row.display??number(row.count);li.append(span,b);root.append(li);}if(!rows.length){const li=document.createElement('li');li.textContent='No activity in this period';root.append(li);}}
function deny(message){generation++;dashboard.hidden=true;gate.hidden=false;gate.replaceChildren();const h=document.createElement('h1'),p=document.createElement('p'),a=document.createElement('a');h.textContent=message;p.textContent='This page is restricted to the MotionC owner.';a.href='/auth/?mode=signin&next=%2Fowner%2Fanalytics%2F';a.textContent='Sign in';gate.append(h,p,a);}
async function render(){const stamp=++generation;status.textContent='Refreshing…';const {data,error}=await supabase.rpc('motionc_owner_analytics',{p_days:Number(period.value)});if(stamp!==generation)return;if(error||!data){status.textContent='Analytics could not refresh. No partial results are shown.';return;}const d=data;
text('visits',number(d.sessions));text('registered',number(d.signed_in));text('visitors',number(d.signed_out));text('views',number(d.page_views));text('active',duration(d.visible_seconds));text('averageActive',duration(d.sessions?d.visible_seconds/d.sessions:0));
const date=v=>new Intl.DateTimeFormat('en-CA',{timeZone:d.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(v));text('windowNote',date(d.from)+' through '+date(d.through)+' · Edmonton time · Today plus the previous '+(d.days-1)+' calendar days.');
const browsers=d.first_time_browsers+d.returning_browsers;list('recognition',[{name:'First-time recognized browsers',count:d.first_time_browsers},{name:'Returning recognized browsers',count:d.returning_browsers},{name:'Returning share',display:browsers?(100*d.returning_browsers/browsers).toFixed(1)+'%':'—'}]);
list('screens',['Desktop','Tablet','Mobile'].map(name=>{const count=d.screens.find(r=>r.name===name)?.count||0;return {name,display:number(count)+' · '+(d.sessions?(100*count/d.sessions).toFixed(1):'0.0')+'%'};}));
for(const [id,key] of [['pages','areas'],['articles','articles'],['entries','entries'],['sources','sources'],['searchTopics','topics']])list(id,d[key]);
list('searchSummary',[{name:'Total Library searches',count:d.searches},{name:'Unclassified searches',count:d.unclassified_searches},{name:'Zero-result searches',count:d.zero_result_searches}]);
const get=keys=>keys.map(name=>({name,count:d.actions.find(r=>r.name===name)?.count||0}));list('actions',get(['weekly_checkin_saved','mo_shortcut','comix_opened','contribution_local','contribution_server']).concat([{name:'Compass views from Summary',count:d.summary_navigation}]));list('accounts',get(['signin_success','signin_failed']).concat([{name:'Accounts created',display:'Unavailable'}]));list('failures',get(['save_failed','sync_failed','article_failed']));
const chart=document.querySelector('#daily');chart.replaceChildren();const max=Math.max(1,...d.daily.map(r=>r.count));for(const row of d.daily){const bar=document.createElement('span'),b=document.createElement('b'),i=document.createElement('i'),small=document.createElement('small');bar.className='bar';bar.title=row.day+': '+row.count+' sessions';b.textContent=number(row.count);i.style.height=Math.max(3,row.count/max*110)+'px';small.textContent=row.day.slice(5);bar.append(b,i,small);chart.append(bar);}status.textContent='Complete database aggregation · Updated '+date(d.through)+'.';}
async function boot(){const {data,error}=await supabase.auth.getUser();if(error||data.user?.app_metadata?.role!=='owner'){deny('Owner access required');return;}const {error:refreshError}=await supabase.auth.refreshSession();if(refreshError){deny('Sign in required');return;}gate.hidden=true;dashboard.hidden=false;await installTestMode();await render();period.addEventListener('change',()=>{void render().catch(()=>{status.textContent='Analytics unavailable. Please try again.';});});}
supabase.auth.onAuthStateChange((_event,session)=>{if(session?.user?.app_metadata?.role!=='owner')deny('Owner access required');});
boot().catch(()=>deny('Analytics unavailable'));

async function installTestMode() {
  const button = document.querySelector('#analyticsExclude');
  const state = document.querySelector('#analyticsExcludeStatus');
  try {
    const controls = await import('/shared/motionc-analytics.js?v=20260923-phase2');
    const display = (value = controls.getAnalyticsExclusion()) => {
      button.disabled = !value.available;
      button.setAttribute('aria-pressed', value.excluded === true ? 'true' : 'false');
      state.textContent = value.available ? 'Browser exclusion: ' + (value.excluded ? 'ON' : 'OFF') : 'Browser exclusion unavailable: storage could not be read or saved. No change confirmed.';
    };
    display();
    button.addEventListener('click', () => display(controls.setAnalyticsExclusion(button.getAttribute('aria-pressed') !== 'true')));
    window.addEventListener('motionc:analytics-exclusion', () => display());
    window.addEventListener('storage', event => { if (event.key === controls.EXCLUDE_KEY || event.key === null) display(); });
  } catch { button.disabled = true; state.textContent = 'Browser exclusion unavailable. No change confirmed.'; }
}
