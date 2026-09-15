# LoadMatch — Empty Truck Marketplace (MVP)

A complete, self-contained MVP for matching trucks returning empty with shippers who need the
reverse route (e.g. truck goes Accra → Kumasi, shipper needs Kumasi → Accra).

## Run it
Open `index.html` in a browser — no build step, no dependencies, works offline.
Demo data (3 trucks, 3 loads, 1 pre-matched deal) is auto-seeded into `localStorage`.

## Feature checklist (your requirements → where it lives)

| Requirement | Where |
|---|---|
| Matching engine (reverse route priority, capacity, dates, budget) | `assets/js/data.js` — `scoreMatch()` / `findMatches()`; Marketplace page "Run matching" |
| Truck & driver verification | Verified/pending badges; submission flow on `post-truck.html` (24h review note) |
| Cargo details | `post-load.html` form (weight, volume, description, dates, budget) |
| Pricing | per-km rate × route distance estimate; budget-vs-estimate scoring |
| GPS tracking | Dashboard → GPS Tracking tab (animated SVG map + breadcrumbs timeline) |
| Digital contracts | Dashboard → Digital Contract tab (auto-generated, typed e-signature, terms checkbox) |
| Payment + 3–10% commission | Dashboard → Payment tab (escrow simulation, adjustable 3–10% slider, payout breakdown) |
| Proof of delivery | Dashboard → Proof of Delivery tab (6-digit OTP; delivery releases escrow) |
| Privacy policy | `privacy.html` |
| Terms & conditions | `terms.html` |
| Secrets off the frontend | `main.js` only contains the public GA measurement ID; server-side keys go in env vars — never here (static site holds no secrets) |
| Force HTTPS | `.htaccess` (Apache 301 redirect); Netlify/Vercel snippets below |
| Cookie consent banner | Fixed bottom banner in footer partial; **analytics only load after acceptance** |
| Meta titles & descriptions | Every page in `<head>` |
| Social preview images | `assets/img/og-image.png` (1200×630) wired to OG + Twitter cards |
| Favicon | `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `site.webmanifest` |
| Sitemap / robots.txt | `sitemap.xml`, `robots.txt`https://trackloadadmin.onrender.com';</script>` with your domain) |
| Alt text on images | All SVGs/maps have `aria-label`/`alt` (decorative icons are `aria-hidden`) |
| Page load speed | No frameworks/CDNs; gzip + long cache headers in `.htaccess`; optimized PNGs |
| Color contrast | Text pairs verified ≥ 4.5:1 (e.g. `#111827` on white ≈ 15.8:1; white on `#116B4F` ≈ 5.4:1; `#B45309` on `#FDE68A` ≈ 4.6:1) |
| Mobile friendly | Responsive grid, hamburger nav, fluid `clamp()` typography, touch-sized controls |
| Custom 404 | `404.html` (also wired via `.htaccess` `ErrorDocument`) |
| Broken links | All internal links checked; sitemap lists only existing pages |
| Form validation | Inline `aria-invalid` errors, email/phone/date/number patterns, password match, required checks |
| Spam protection | Honeypot field + minimum-fill-time trap (2.5s) + math CAPTCHA — see `pages.js` |
| Analytics | GA4 loader gated behind cookie consent; set your ID in `main.js` (`ANALYTICS_ID`) |
| One clear CTA | Landing page converges on "Post your load now / List your empty truck" |

## Deploy (HTTPS forcing)

**Netlify** — `netlify.toml`:
```toml
[[redirects]]
  from = "https://trackloadadmin.onrender.com/*"
  to =https://trackloadadmin.onrender.com';</script>/:splat"
  status = 301
  force = true
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
```
**Vercel** — `vercel.json`: `{ "redirects": [{ "source": "/(.*)", "has": [{ "type": "host", "value": "loadmatch.example.com" }], "destination": "https://loadmatch.example.com/:path*", "permanent": true }] }`
**Nginx**:
```nginx
server {
  listen 80;
  server_name https://trackloadadmin.onrender.com;
  return 301 https://$host$request_uri;
}
```

## Before going to production
1. Replace https://trackloadadmin.onrender.com`` everywhere (meta, sitemap, robots) and the GA ID.
2. Move forms/storage to a real backend (this MVP uses `localStorage`); keep the matcher logic as-is.
3. Swap the escrow/OTP demos for a payment processor (Paystack/Flutterwave) + SMS OTP.
4. Commission band is configured in `main.js`: `COMMISSION_MIN/MAX/DEFAULT` (3/10/5).
