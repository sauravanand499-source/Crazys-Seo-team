# Crazy SEO Team — Unified Analytics Setup

The admin analytics dashboard now combines **GA4 + Google Search Console + CRM revenue/leads** in one interface.

## Vercel environment variables

Add these server-side variables to the Vercel project:

- `GA_PROPERTY_ID` — numeric GA4 property ID.
- `GA_CLIENT_EMAIL` — Google service-account email.
- `GA_PRIVATE_KEY` — service-account private key. Keep it server-side only; if stored on one line, preserve newlines as `\\n`.
- `GSC_SITE_URL` — the exact Search Console property URL, normally `https://www.crazyseoteam.in/` for a URL-prefix property or `sc-domain:crazyseoteam.in` for a Domain property.

Never expose `GA_PRIVATE_KEY` in frontend code or any `VITE_` variable.

## Google Cloud / GA4

1. Enable Google Analytics Data API.
2. Create a Google service account.
3. In GA4 Admin, add the service-account email to the GA4 property with Viewer access.
4. Add the three GA4 environment variables in Vercel.

## Google Search Console

1. Verify the site/property in Search Console.
2. Give the same service-account email access to the Search Console property with read permission.
3. Add `GSC_SITE_URL` using the exact property identifier.
4. Redeploy.

The dashboard calls `/api/analytics-dashboard` server-side. Search Console data is queried with the Search Analytics API and can be grouped by query, page, country and device.

## Dashboard sections

- **Overview:** visitors, sessions, Google clicks, impressions, SEO CTR, CRM pipeline, won revenue and lead conversion.
- **Live Traffic:** current active visitors with country, city and device.
- **SEO Traffic:** clicks, impressions, CTR, average position, queries, SEO pages, countries and devices.
- **Sources:** GA4 channel/source/medium performance.
- **Country / City:** geographic traffic performance.
- **Revenue & Leads:** CRM pipeline, won revenue, average deal, conversion and lead sources.

## CRM revenue / conversion

The current CRM stores leads in browser storage (`cst-final-leads`). The dashboard reads that data on the admin browser to calculate pipeline, won revenue, average deal and lead conversion. For multi-user permanent reporting, move the lead store to Supabase/PostgreSQL and expose authenticated server-side CRM metrics.

## Important

If credentials are missing, the dashboard shows **DEMO DATA** clearly instead of pretending demo numbers are real analytics. Google Analytics realtime reports cover the current realtime window, while Search Console provides search-performance reporting over a date range.
