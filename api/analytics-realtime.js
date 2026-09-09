import {BetaAnalyticsDataClient} from '@google-analytics/data';

const dims=(rows,names,metrics)=> (rows||[]).map(row=>{const out={};names.forEach((n,i)=>{out[n]=row.dimensionValues?.[i]?.value||''});metrics.forEach((m,i)=>{out[m]=Number(row.metricValues?.[i]?.value||0)});return out});

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const propertyId=process.env.GA_PROPERTY_ID;
  const clientEmail=process.env.GA_CLIENT_EMAIL;
  const privateKey=process.env.GA_PRIVATE_KEY?.replace(/\\n/g,'\n');
  if(!propertyId||!clientEmail||!privateKey)return res.status(503).json({error:'GA4 realtime integration is not configured'});
  try{
    const client=new BetaAnalyticsDataClient({credentials:{client_email:clientEmail,private_key:privateKey}});
    const property=`properties/${propertyId}`;
    const base={property,minuteRanges:[{startMinutesAgo:29}]};
    const [summary,countries,devices,pages,events,pulse]=await Promise.all([
      client.runRealtimeReport({...base,metrics:[{name:'activeUsers'},{name:'screenPageViews'},{name:'eventCount'},{name:'keyEvents'}]}),
      client.runRealtimeReport({...base,dimensions:[{name:'country'}],metrics:[{name:'activeUsers'}]}),
      client.runRealtimeReport({...base,dimensions:[{name:'deviceCategory'}],metrics:[{name:'activeUsers'}]}),
      client.runRealtimeReport({...base,dimensions:[{name:'unifiedScreenName'}],metrics:[{name:'screenPageViews'}]}),
      client.runRealtimeReport({...base,dimensions:[{name:'eventName'}],metrics:[{name:'eventCount'},{name:'activeUsers'}]}),
      client.runRealtimeReport({property,dimensions:[{name:'minutesAgo'}],metrics:[{name:'activeUsers'}],minuteRanges:[{startMinutesAgo:29,endMinutesAgo:0}]})
    ]);
    const s=summary[0]?.rows?.[0]?.metricValues||[];
    return res.status(200).json({
      activeUsers:Number(s[0]?.value||0),pageViews:Number(s[1]?.value||0),events:Number(s[2]?.value||0),keyEvents:Number(s[3]?.value||0),
      countries:dims(countries[0]?.rows,['country'],['activeUsers']).sort((a,b)=>b.activeUsers-a.activeUsers),
      devices:dims(devices[0]?.rows,['deviceCategory'],['activeUsers']).sort((a,b)=>b.activeUsers-a.activeUsers),
      pages:dims(pages[0]?.rows,['unifiedScreenName'],['screenPageViews']).sort((a,b)=>b.screenPageViews-a.screenPageViews),
      eventsStream:dims(events[0]?.rows,['eventName'],['eventCount','activeUsers']).sort((a,b)=>b.eventCount-a.eventCount),
      minutes:dims(pulse[0]?.rows,['minutesAgo'],['activeUsers']).sort((a,b)=>Number(a.minutesAgo)-Number(b.minutesAgo)).map(x=>({label:`-${x.minutesAgo}m`,value:x.activeUsers}))
    });
  }catch(error){console.error('GA4 realtime error',error);return res.status(500).json({error:'Unable to read GA4 realtime data'});}
}
