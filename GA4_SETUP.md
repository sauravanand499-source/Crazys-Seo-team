# GA4 Realtime setup for Crazy SEO Team CRM

The CRM now includes an upgraded Live Traffic / Realtime Analytics monitor. It uses the Google Analytics Data API Realtime method when the server environment variables are configured; otherwise the UI safely falls back to clearly labelled CRM demo data.

## Vercel environment variables

Add these variables to the Vercel project for the CRM:

- `GA_PROPERTY_ID` — numeric GA4 property ID, for example `123456789`.
- `GA_CLIENT_EMAIL` — service-account client email.
- `GA_PRIVATE_KEY` — service-account private key. Keep the value server-side only; include the newline characters as `\\n` if Vercel stores the key on one line.

Do not put the private key in frontend files or `VITE_` variables.

## Google Cloud / GA4 permissions

1. Create or use a Google Cloud project.
2. Enable the Google Analytics Data API.
3. Create a service account.
4. In Google Analytics Admin, add the service-account email to the GA4 property with Viewer access.
5. Copy the service-account email and private key into the Vercel environment variables above.
6. Redeploy the CRM.

The endpoint is `/api/analytics-realtime`.

## What the upgraded monitor shows

- Active users in the last 30 minutes
- Realtime page views
- Realtime events
- Key events / conversions
- 30-minute active-user pulse chart
- Countries
- Device categories
- Top pages
- Event activity
- Connection and refresh health
- Automatic 15-second refresh

Google's Realtime Data API supports active users, event count, key events and page views, and realtime events can appear within seconds after collection. The API has a limited realtime dimension/metric set, so the CRM only requests supported realtime dimensions and metrics.
