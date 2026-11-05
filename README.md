# MelanaBlac: art shop + admin PWA

React (Vite) storefront with a Cloudflare Pages Functions backend (D1 database, R2 images). No Firebase needed.

- **Storefront**: editorial gallery homepage, curated cards, category collections, masonry gallery with accessible lightbox, shop with categories, product pages with image slides, basket, checkout, contact form.
- **Admin PWA** at `/admin`: add/edit/delete artwork (multi-image upload), manage home slides, edit all site text, SEO titles/descriptions per page and per artwork, orders, messages, push notifications, password change.
- Install-the-app pop-up (Android/desktop install prompt + iOS Add-to-Home-Screen steps).
- Forgot password emails a reset link via **Resend**.
- Per-page SEO tags (and Product JSON-LD) are injected server-side from the dashboard values, plus `/sitemap.xml` and `/robots.txt`.
- Original placeholder artwork (generated SVGs) is used for seed data. Replace it from the dashboard.

## Local testing
`npm install && npm run seed && node scripts/make-vapid.mjs && npm run start:local` then open http://localhost:8788.
`scripts/dev-server.mjs` runs the real functions with SQLite/filesystem stand-ins for D1/R2 (useful where workerd can't run). In dev mode the forgot-password page shows the reset link on screen. Visit `/admin/forgot` with `dbs_workouts@yahoo.com` to set the first password.

## Live deployment (dbs_workouts@yahoo.com Cloudflare account)
- Site: https://melanablac.pages.dev  ·  Admin: https://melanablac.pages.dev/admin
- D1 database `melanablac` (id in `wrangler.toml`), Pages project `melanablac`, VAPID push keys set as Pages secrets.
- R2 is not enabled on the account, so uploaded images are stored in D1 (`media` table; the admin shrinks photos to <1.5MB first).
  To use R2 instead: enable R2 in the dashboard, `npx wrangler r2 bucket create melanablac-media`, uncomment the binding in `wrangler.toml`, redeploy.
- Redeploy after changes: `npm run deploy` (wrangler must be logged in as dbs_workouts@yahoo.com: `npx wrangler whoami`).
- Reseeding the live DB wipes everything: `npm run seed && npm run db:remote` (only for a fresh start).
- A temporary admin password was created directly in the database (not by email) and saved outside the repo. Change it in Admin > Settings.

### Still to add (secrets)
`npx wrangler pages secret put NAME --project-name melanablac`
| Secret | Purpose |
|---|---|
| `RESEND_API_KEY` | password reset + order emails. Verify a domain in Resend and set `RESEND_FROM` in `wrangler.toml` (the default sender only delivers to the Resend account owner) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | optional card payments. Webhook `/api/stripe-webhook`, event `checkout.session.completed`. Without Stripe, orders are saved as "new" and you arrange payment yourself |

Set `SITE_URL` in `wrangler.toml` if you attach a custom domain. Only emails in `ADMIN_EMAIL` can create/reset an admin password.

### Videos
Looping gallery clips live in `public/video/` (mp4 + matching poster `.jpg`): split hero gallery film, "why I create", "pause", and a scrolling "Gallery in Motion" strip.
They play muted only while on screen. Each visible film has play/pause controls; visitors who prefer reduced motion see a paused poster until they choose to play. `functions/video/[[path]].js` serves them with HTTP Range support, which Safari/iOS needs.
Change or hide any of them in Admin > Site text > Videos (paths or links; blank hides). New clips need to be added to `public/video/` and redeployed, because R2 is not enabled for uploads yet. Keep each file under 25MB.

### Importing more artwork
Put PNGs in a folder, add titles/categories to `scripts/art-titles.json`, run `node scripts/import-art.mjs <folder> && npm run seed`. Or just add pieces from the admin dashboard.

## Notes
- Admin sign-in has no rate limiting yet. Consider a Cloudflare WAF rate-limit rule on `/api/admin/login`.
- Push payloads are empty; the service worker fetches the latest notification after the push arrives.
