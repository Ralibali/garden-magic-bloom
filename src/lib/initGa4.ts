import { initGa4 } from './ga4Runtime';
// The shared Ads tag previously also sent traffic to Updro.
if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>)['ga-disable-G-C0XMZG0KDQ'] = true;
initGa4({
  "measurementId": "G-E4PGQ6WJVZ",
  "hosts": [
    "odlingsdagboken.com",
    "www.odlingsdagboken.com"
  ],
  "excluded": [
    "/app/admin",
    "/admin"
  ],
  "consentKey": "cookie-consent-ga4-v1",
  "consentFormat": "updro"
});
