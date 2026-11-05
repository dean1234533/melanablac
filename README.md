# MelanaBlac: art shop + admin PWA

React (Vite) storefront with a Cloudflare Pages Functions backend (D1 database, R2 images). No Firebase needed.

- **Storefront**: editorial gallery homepage, curated cards, category collections, masonry gallery with accessible lightbox, shop with categories, product pages with image slides, basket, checkout, contact form.
- **Admin PWA** at `/admin`: add/edit/delete artwork (multi-image upload), manage homepage films and edit all site text, SEO titles/descriptions per page and per artwork, orders, messages, push notifications, password change.
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
- R2 is not enabled on the account, so uploaded images are stored in D1 (`media` table; the admin compresses photos to WebP below 1.4MB first).
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
Looping gallery clips live in `public/video/` (mp4 + matching poster `.jpg`): full-width hero gallery film with overlaid text and shop button, "why I create", "pause", and a scrolling "Gallery in Motion" strip.
They play muted only while on screen. Playback buttons are hidden. Visitors who prefer reduced motion see the still poster instead. `functions/video/[[path]].js` serves them with HTTP Range support, which Safari/iOS needs.
Change or hide any of them in Admin > Site text > Videos (paths or links; blank hides). Upload clips directly in Admin > Site text > Videos. They are compressed in the browser with a matching WebP poster before upload. Clips can be up to 30 seconds; each compressed file is capped at 1.4MB so it also works with D1 storage. Static clips added to `public/video/` are optimised before every build.

### Importing more artwork
Put PNGs in a folder, add titles/categories to `scripts/art-titles.json`, run `node scripts/import-art.mjs <folder> && npm run seed`. Or just add pieces from the admin dashboard.

## Notes
- Admin sign-in uses persistent D1 rate limits by account and IP, eight-hour HttpOnly sessions, and server-side access checks. Admin pages are not cached or indexed. Changing a password revokes existing sessions.
- Push payloads are empty; the service worker fetches the latest notification after the push arrives.

## Private Studio redesign and security migration

Three quick clicks on the storefront header logo open `/admin/login`; one click still opens the homepage. The shortcut only opens the sign-in screen and never bypasses authentication. The existing admin account and password are retained.

Before deploying this version to an existing database, apply `migrations/0001_admin_auth.sql` with `wrangler d1 execute melanablac --remote --file=migrations/0001_admin_auth.sql`. It adds the rate-limit table and signs out existing sessions. **Do not run `schema.sql` against the live database**: it is a destructive fresh-install script. Catalogue, orders, messages and passwords are preserved by the migration.

Sign-in and password recovery are rate limited. Sessions expire after eight hours; a password change or reset revokes all sessions and outstanding reset links. Admin API mutations require the same-origin custom request header. The dashboard refreshes authentication on focus and returns to sign-in when an API session expires. Reset emails still require the existing Resend configuration.

Run `node --test tests/admin-auth.test.mjs` for the security regression checks. They use an isolated in-memory SQLite database and never touch production.

The sign-in form accepts a username or the existing admin email. `ADMIN_USERNAME` (default `admin`) maps to the first address in `ADMIN_EMAIL`; both use the same stored password hash and rate-limit bucket. Passwords must be provisioned in the database, never added to source or configuration.

## Media compression

Every image uploaded through the admin is decoded, resized to a maximum 1800px edge, and re-encoded as WebP (with PNG fallback where the browser lacks WebP encoding). Transparency and aspect ratio are preserved. Compression failures stop the upload rather than sending an oversized original. GIF/APNG/animated WebP/AVIF files are rejected with guidance to upload a video instead of silently losing animation.

Video uploads use Mediabunny with the browser's native WebCodecs encoder: up to 30 seconds, maximum 1280px edge, 24fps, a size budget below 1.4MB, and a WebP poster. MP4/H.264/AAC is preferred, with WebM fallback. Existing smaller compatible files may be retained rather than enlarged. Frame timestamps and audio are preserved during conversion; progress is shown in the editor. Soundtracks are retained; storefront playback remains muted. Both D1 and R2 uploads support byte-range playback for Safari and iOS.

`npm run media:optimize` runs before builds. It generates compressed WebP copies for bundled JPEGs, losslessly optimises PNGs, and optimises bundled video for web delivery. JPEGs remain as backwards-compatible fallbacks. Served artwork and posters use the WebP versions. FFmpeg is required when adding or changing static videos; `sharp` handles images. The tracked `scripts/media-lock.json` prevents repeatedly encoding unchanged media. Use `MEDIA_BACKUP_DIR` and `MEDIA_REPORT_PATH` to save originals and an optimisation report outside the checkout.

Run `npm run test:media` for media sizing, asset decoding, bounded uploads, storage and byte-range checks. Externally hosted URLs are controlled by their hosts; upload those files through the picker to apply this compression.
