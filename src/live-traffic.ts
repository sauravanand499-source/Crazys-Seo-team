type TrafficRow={country?:string;city?:string;deviceCategory?:string;unifiedScreenName?:string;eventName?:string;activeUsers?:number;eventCount?:number;screenPageViews?:number;keyEvents?:number};

type TrafficPayload={source:'ga4'|'crm-demo';updatedAt:string;activeUsers:number;pageViews:number;events:number;keyEvents:number;countries:TrafficRow[];devices:TrafficRow[];pages:TrafficRow[];eventsStream:TrafficRow[];minutes:{label:string;value:number}[]};

import './live-traffic.css';

const qs=<T extends Element=Element>(s:string)=>document.querySelector<T>(s);
const qsa=(s:string)=>Array.from(document.querySelectorAll(s));
const money=(n:number)=>'₹'+Math.round(n).toLocaleString('en-IN');

function demoPayload():TrafficPayload{
  const seedCountries=[['India',18],['United States',7],['United Kingdom',4],['UAE',3],['Singapore',2]];
  const seedDevices=[['Mobile',21],['Desktop',10],['Tablet',3]];
  const pages=['/','/services/seo','/blog','/crm','/tools/seo-audit'];
  const events=['page_view','scroll','session_start','generate_lead','click'];
  const active=34;
  return {source:'crm-demo',updatedAt:new Date().toISOString(),activeUsers:active,pageViews:86,events:164,keyEvents:5,
    countries:seedCountries.map(([country,n])=>({country:String(country),activeUsers:Number(n)})),
    devices:seedDevices.map(([deviceCategory,n])=>({deviceCategory:String(deviceCategory),activeUsers:Number(n)})),
    pages:pages.map((unifiedScreenName,i)=>({unifiedScreenName,screenPageViews:[31,18,14,9,7][i]})),
    eventsStream:events.map((eventName,i)=>({eventName,activeUsers:[19,13,11,4,8][i],eventCount:[51,37,28,5,22][i]})),
    minutes:Array.from({length:30},(_,i)=>({label:`-${29-i}m`,value:Math.max(2,Math.round(18+Math.sin(i/2)*7+((i*13)%9)))}))};
}

function rowsFromApi(rows:any[],dims:string[],metrics:string[]):TrafficRow[]{
  return (rows||[]).map(r=>{const o:TrafficRow={};dims.forEach((d,i)=>{o[d]=r.dimensionValues?.[i]?.value});metrics.forEach((m,i)=>{o[m]=Number(r.metricValues?.[i]?.value||0)});return o});
}

async function getPayload():Promise<TrafficPayload>{
  try{
    const r=await fetch('/api/analytics-realtime',{headers:{accept:'application/json'},cache:'no-store'});
    if(!r.ok)throw new Error('GA4 endpoint not configured');
    const x=await r.json();
    return {source:'ga4',updatedAt:new Date().toISOString(),activeUsers:x.activeUsers||0,pageViews:x.pageViews||0,events:x.events||0,keyEvents:x.keyEvents||0,countries:x.countries||[],devices:x.devices||[],pages:x.pages||[],eventsStream:x.eventsStream||[],minutes:x.minutes||[]};
  }catch{return demoPayload()}
}

function injectNav(){
  const nav=qs('aside nav');
  if(!nav||nav.querySelector('[data-live-traffic]'))return;
  const b=document.createElement('button');
  b.className='nav liveTrafficNav';b.setAttribute('data-live-traffic','1');
  b.innerHTML='<span class="ltIcon">◉</span><span>Live Traffic</span><em>LIVE</em>';
  b.addEventListener('click',()=>openTraffic());nav.appendChild(b);
  const analytics=Array.from(nav.querySelectorAll('button')).find(x=>x.textContent?.trim().startsWith('Analytics'));
  analytics?.addEventListener('click',()=>openTraffic());
}

function card(label:string,value:string,sub:string,cls=''){return `<div class="ltMetric ${cls}"><span>${label}</span><strong>${value}</strong><small>${sub}</small></div>`}
function list(title:string,rows:TrafficRow[],label:(r:TrafficRow)=>string,value:(r:TrafficRow)=>number){return `<section class="ltCard"><div class="ltCardHead"><div><h3>${title}</h3><p>Realtime breakdown</p></div></div><div class="ltList">${rows.slice(0,8).map(r=>{const v=value(r);return `<div class="ltRow"><span>${label(r)}</span><div><i style="width:${Math.max(5,Math.min(100,v/(Math.max(1,...rows.map(value)))*100))}%"></i></div><b>${v}</b></div>`}).join('')}</div></section>`}

function render(p:TrafficPayload){
  const overlay=qs<HTMLElement>('#liveTrafficOverlay');if(!overlay)return;
  const max=Math.max(1,...p.minutes.map(x=>x.value));
  overlay.innerHTML=`<div class="ltShell"><header class="ltHeader"><div><div class="ltEyebrow">CRAZY SEO TEAM • REALTIME ANALYTICS</div><h2>Live Traffic Command Center</h2><p>Monitor active visitors, pages, devices, countries and events.</p></div><div class="ltHeaderActions"><span class="ltStatus"><i></i>${p.source==='ga4'?'GA4 REALTIME CONNECTED':'CRM DEMO DATA'}</span><button id="ltRefresh">↻ Refresh</button><button id="ltClose">×</button></div></header><div class="ltBody">
    <div class="ltMetrics">${card('Active users',String(p.activeUsers),'last 30 minutes','hot')}${card('Page views',String(p.pageViews),'realtime')}${card('Events',String(p.events),'realtime')}${card('Key events',String(p.keyEvents),'conversions')}</div>
    <section class="ltCard ltChartCard"><div class="ltCardHead"><div><h3>Active users — 30 minute pulse</h3><p>Updates automatically every 15 seconds when GA4 is connected.</p></div><strong>${p.activeUsers} online</strong></div><div class="ltChart">${p.minutes.map(x=>`<div class="ltBar" title="${x.label}: ${x.value}" style="height:${Math.max(7,x.value/max*100)}%"></div>`).join('')}</div><div class="ltAxis"><span>-30m</span><span>-20m</span><span>-10m</span><span>Now</span></div></section>
    <div class="ltGrid2">${list('Top countries',p.countries,r=>r.country||'Unknown',r=>r.activeUsers||0)}${list('Devices',p.devices,r=>r.deviceCategory||'Unknown',r=>r.activeUsers||0)}</div>
    <div class="ltGrid2">${list('Top pages',p.pages,r=>r.unifiedScreenName||'Unknown',r=>r.screenPageViews||0)}${list('Event activity',p.eventsStream,r=>r.eventName||'Unknown',r=>r.eventCount||0)}</div>
    <section class="ltCard"><div class="ltCardHead"><div><h3>Traffic health</h3><p>Operational checks for the analytics connection.</p></div></div><div class="ltHealth"><div><i class="ok"></i><span>Realtime collector</span><b>${p.source==='ga4'?'Connected':'Ready for GA4 credentials'}</b></div><div><i class="ok"></i><span>Refresh cycle</span><b>15 seconds</b></div><div><i class="ok"></i><span>Realtime window</span><b>30 minutes</b></div><div><i class="warn"></i><span>Data provider</span><b>${p.source==='ga4'?'Google Analytics 4':'Demo fallback'}</b></div></div></section>
  </div></div>`;
  qs('#ltClose')?.addEventListener('click',closeTraffic);qs('#ltRefresh')?.addEventListener('click',()=>refresh(true));
}

let timer:number|undefined;
async function refresh(force=false){
  const overlay=qs<HTMLElement>('#liveTrafficOverlay');if(!overlay)return;
  const button=qs<HTMLButtonElement>('#ltRefresh');if(button)button.disabled=true;
  const p=await getPayload();render(p);
  const note=qs<HTMLElement>('#ltLastUpdate');if(note)note.textContent=`Updated ${new Date().toLocaleTimeString('en-IN')}`;
  if(button)button.disabled=false;
  if(force)document.body.dispatchEvent(new CustomEvent('cst-traffic-refresh'));
}
function openTraffic(){
  let overlay=qs<HTMLElement>('#liveTrafficOverlay');
  if(!overlay){overlay=document.createElement('div');overlay.id='liveTrafficOverlay';document.body.appendChild(overlay)}
  overlay.classList.add('open');render(demoPayload());refresh();
  window.clearInterval(timer);timer=window.setInterval(()=>refresh(),15000);
}
function closeTraffic(){qs('#liveTrafficOverlay')?.classList.remove('open');window.clearInterval(timer)}

function boot(){injectNav();const observer=new MutationObserver(()=>injectNav());observer.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
