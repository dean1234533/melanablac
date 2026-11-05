# MelanaBlac design context

A contemporary editorial gallery and independent illustrated card shop. White and warm paper, black ink and the established gold (#D4AF37); Cormorant Garamond display type paired with Inter. Square edges, fine rules, spacious layouts and original art rather than decorative UI cards.

The homepage introduces the brand, shows the curated collection, tells the creative story, and offers category navigation. Product images remain uncropped. Responsive layouts, keyboard focus, reduced motion are required. The existing commerce, contact and admin flows are retained. External marketplace links are removed.

21st initialization completed; catalogue search requires a signed-in 21st account in this environment. The redesign uses the project's React primitives and original assets.

Use the existing signature logo asset (`public/logo-dark.png`) in the header and footer. Do not recreate the logo as typeset text.

Homepage artwork should not repeat between the curated edit and category covers. Product images use consistent uncropped frames; gallery films fill fixed 4:3 slides across desktop and mobile.

Hero copy and the shop button overlay the full-width gallery film. Use a dark scrim and warm light text for readability on desktop and mobile.

Per user preference, videos have no visible play/pause controls. Continue muted playback while on screen and honour reduced motion.

Do not use arrow icons anywhere in the storefront or admin. Use text labels for links, navigation and image reordering.

The private Studio uses the original signature logo, white and warm paper, black navigation text and brand-gold actions. Dashboard figures come from the authenticated APIs; no fabricated trends or charts. Sign-in has a dedicated branded panel, password visibility control and recovery. Mobile navigation must close on Escape and route changes. Keep admin CSS scoped to the workspace.

Three quick clicks on the storefront header logo open admin sign-in. A single click remains the homepage link. The shortcut is navigation only; server-side password protection is required.

Serve compressed WebP artwork and posters, preserve logo transparency, and retain the original artwork proportions. Admin image and video pickers compress uploads automatically. Video conversion must retain frame timing and soundtracks; video processing code is loaded only when uploading a film.

Brand palette verified against https://melanablac.com: #121212 black, #D4AF37 primary gold, #C9AB47 secondary gold, and white. Keep the light backgrounds; use #806519 for small gold text on white to maintain readable contrast.

On mobile the hero video uses its complete frame, contain fitting, and a viewport height cap. Overlay the kicker and heading on the clip with compact mobile type; keep the description and button below it. Desktop retains the full overlaid copy.

Product cards and collection boxes use black backgrounds, fine brand-gold borders, light titles and gold details; keep the surrounding white layout.

The enquiries page opens with a wide, uncropped gallery film and overlaid heading, followed by an open white enquiry area. Keep its short introduction beside the form on desktop and above it on phones. Avoid promotional copy panels.

Keep the artwork editor in plain language with grouped details, images and availability. Show one customer description; collapse optional search overrides and display order, explaining automatic title/description fallbacks.

Boxed action buttons across storefront and Studio use black borders and consistent sweep, lift, shadow, focus and press effects. Preserve gold filter borders and red destructive text. Disabled/busy actions stay still; reduced motion disables the sweep and lift.
