import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';

const n = v => Number(v || 0);
const rows = (report, dims, metrics) => (report?.rows || []).map(r => {
  const o = {};
  dims.forEach((d, i) => { o[d] = r.dimensionValues?.[i]?.value || ''; });
  metrics.forEach((m, i) => { o[m] = n(r.metricValues?.[i]?.value); });
  return o;
});
const credentials = () => ({
  client_email: process.env.GA_CLIENT_EMAIL,
  private_key: process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n')
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const propertyId = process.env.GA_PROPERTY_ID;
  const siteUrl = process.env.GSC_SITE_URL || 'https://www.crazyseoteam.in/';
  const email = process.env.GA_CLIENT_EMAIL;
  const key = process.env.GA_PRIVATE_KEY;
  if (!propertyId || !email || !key) return res.status(503).json({ error: 'Analytics credentials are not configured', configured: false });

  try {
    const ga = new BetaAnalyticsDataClient({ credentials: credentials() });
    const property = `properties/${propertyId}`;
    const dateRange = [{ startDate: '28daysAgo', endDate: 'today' }];
    const report = (dimensions, metrics, orderBys = []) => ga.runReport({
      property, dateRanges: dateRange,
      dimensions: dimensions.map(name => ({ name })),
      metrics: metrics.map(name => ({ name })),
      orderBys,
      limit: 100
    });

    const [summary, daily, channels, geo, cities, sources, pages, realtime] = await Promise.all([
      report([], ['totalUsers','sessions','screenPageViews','engagementRate','keyEvents','purchaseRevenue']),
      report(['date'], ['totalUsers','sessions','screenPageViews','keyEvents']),
      report(['sessionDefaultChannelGroup'], ['sessions','totalUsers','screenPageViews','keyEvents','purchaseRevenue']),
      report(['country'], ['totalUsers','sessions','screenPageViews','keyEvents']),
      report(['city'], ['totalUsers','sessions','screenPageViews','keyEvents']),
      report(['sessionSource','sessionMedium'], ['sessions','totalUsers','keyEvents','purchaseRevenue']),
      report(['pagePath'], ['screenPageViews','totalUsers','keyEvents']),
      ga.runRealtimeReport({ property, minuteRanges: [{ startMinutesAgo: 29 }], dimensions: [{ name: 'country' }, { name: 'city' }, { name: 'deviceCategory' }], metrics: [{ name: 'activeUsers' }] })
    ]);

    const auth = new google.auth.GoogleAuth({ credentials: credentials(), scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
    const sc = google.searchconsole({ version: 'v1', auth });
    const end = new Date();
    const start = new Date(end); start.setDate(start.getDate() - 28);
    const iso = d => d.toISOString().slice(0, 10);
    const [scSummary, scDaily, scQueries, scPages, scCountries, scDevices] = await Promise.all([
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: iso(start), endDate: iso(end), dataState: 'all', rowLimit: 1 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: iso(start), endDate: iso(end), dataState: 'all', dimensions: ['date'], rowLimit: 31 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: iso(start), endDate: iso(end), dataState: 'all', dimensions: ['query'], rowLimit: 20 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: iso(start), endDate: iso(end), dataState: 'all', dimensions: ['page'], rowLimit: 20 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: iso(start), endDate: iso(end), dataState: 'all', dimensions: ['country'], rowLimit: 20 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: iso(start), endDate: iso(end), dataState: 'all', dimensions: ['device'], rowLimit: 10 } })
    ]);

    const s = rows(summary[0], [], ['totalUsers','sessions','screenPageViews','engagementRate','keyEvents','purchaseRevenue'])[0] || {};
    const rt = rows(realtime, ['country','city','deviceCategory'], ['activeUsers']);
    const gsc = r => (r?.data?.rows || []).map(x => ({ keys: x.keys || [], clicks: n(x.clicks), impressions: n(x.impressions), ctr: Number(x.ctr || 0), position: Number(x.position || 0) }));
    const gs = gsc(scSummary)[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

    return res.status(200).json({
      configured: true, source: 'ga4+gsc', updatedAt: new Date().toISOString(), siteUrl,
      ga4: {
        totalUsers: n(s.totalUsers), sessions: n(s.sessions), pageViews: n(s.screenPageViews), engagementRate: Number(s.engagementRate || 0), keyEvents: n(s.keyEvents), purchaseRevenue: n(s.purchaseRevenue),
        daily: rows(daily[0], ['date'], ['totalUsers','sessions','screenPageViews','keyEvents']),
        channels: rows(channels[0], ['sessionDefaultChannelGroup'], ['sessions','totalUsers','screenPageViews','keyEvents','purchaseRevenue']).sort((a,b)=>b.sessions-a.sessions),
        countries: rows(geo[0], ['country'], ['totalUsers','sessions','screenPageViews','keyEvents']).sort((a,b)=>b.totalUsers-a.totalUsers).slice(0,20),
        cities: rows(cities[0], ['city'], ['totalUsers','sessions','screenPageViews','keyEvents']).filter(x=>x.city && x.city!=='(not set)').sort((a,b)=>b.totalUsers-a.totalUsers).slice(0,20),
        sources: rows(sources[0], ['sessionSource','sessionMedium'], ['sessions','totalUsers','keyEvents','purchaseRevenue']).sort((a,b)=>b.sessions-a.sessions).slice(0,20),
        pages: rows(pages[0], ['pagePath'], ['screenPageViews','totalUsers','keyEvents']).sort((a,b)=>b.screenPageViews-a.screenPageViews).slice(0,20),
        realtime: rt.sort((a,b)=>b.activeUsers-a.activeUsers).slice(0,50)
      },
      gsc: {
        clicks: gs.clicks, impressions: gs.impressions, ctr: gs.ctr, position: gs.position,
        daily: gsc(scDaily), queries: gsc(scQueries), pages: gsc(scPages), countries: gsc(scCountries), devices: gsc(scDevices)
      }
    });
  } catch (error) {
    console.error('analytics dashboard error', error);
    return res.status(500).json({ error: 'Unable to read GA4/Search Console data', configured: true });
  }
}
