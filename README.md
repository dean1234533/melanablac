# MelanaBlac: art shop + admin PWA

React (Vite) storefront with a Cloudflare Pages Functions backend (D1 database, R2 images). No Firebase needed.

- **Storefront**: hero slider, masonry gallery with lightbox, shop with categories, product pages with image slides, basket, checkout, contact form.
- **Admin PWA** at `/admin`: add/edit/delete artwork (multi-image upload), manage home slides, edit all site text, SEO titles/descriptions per page and per artwork, orders, messages, push notifications, password change.
- Install-the-app pop-up (Android/desktop install prompt + iOS Add-to-Home-Screen steps).
- Forgot password emails a reset link via **Resend**.
- Per-page SEO tags (and Product JSON-LD) are injected server-side from the dashboard values, plus `/sitemap.xml` and `/robots.txt`.
- Original placeholder artwork (generated SVGs) is used for seed data. Replace it from the dashboard.

## Local testing
`npm install && npm run seed && node scripts/make-vapid.mjs && npm run start:local` then open http://localhost:8788.
`scripts/dev-server.mjs` runs the real functions with SQLite/filesystem stand-ins for D1/R2 (useful where workerd can't run). In dev mode the forgot-password page shows the reset link on screen. Visit `/admin/forgot` with `dbs_workouts@yahoo.com` to set the first password.

## Deploy (Cloudflare account for dbs_workouts@yahoo.com)
```
npx wrangler login                      # sign in as dbs_workouts@yahoo.com
npx wrangler d1 create melanablac       # copy database_id into wrangler.toml
npx wrangler r2 bucket create melanablac-media
npm run seed && npm run db:remote       # schema + sample data (WARNING: schema.sql drops tables)
npx wrangler pages project create melanablac --production-branch main
npm run deploy
```
Then set secrets (`npx wrangler pages secret put NAME --project-name melanablac`):
| Secret | Purpose |
|---|---|
| `RESEND_API_KEY` | password reset + order emails (verify a sending domain in Resend and set `RESEND_FROM` in wrangler.toml) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_JWK` | push notifications. Generate with `node scripts/make-vapid.mjs` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | optional card payments. Webhook URL: `/api/stripe-webhook`, event `checkout.session.completed`. Without Stripe, orders are saved as "new" and you arrange payment yourself |

Set `SITE_URL` in `wrangler.toml` to your real domain. Only emails in `ADMIN_EMAIL` can create/reset an admin password.

## Notes
- Admin sign-in has no rate limiting yet. Consider a Cloudflare WAF rate-limit rule on `/api/admin/login`.
- Push payloads are empty; the service worker fetches the latest notification after the push arrives.
