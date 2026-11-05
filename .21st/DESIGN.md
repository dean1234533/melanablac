# MelanaBlac design context

A contemporary editorial gallery and independent illustrated card shop. Warm paper, ink, muted olive and restrained gold; Cormorant Garamond display type paired with Inter. Square edges, fine rules, spacious layouts and original art rather than decorative UI cards.

The homepage introduces the brand, shows the curated collection, tells the creative story, and offers category navigation. Product images remain uncropped. Responsive layouts, keyboard focus, reduced motion are required. The existing commerce, contact and admin flows are retained. External marketplace links are removed.

21st initialization completed; catalogue search requires a signed-in 21st account in this environment. The redesign uses the project's React primitives and original assets.

Use the existing signature logo asset (`public/logo-dark.png`) in the header and footer. Do not recreate the logo as typeset text.

Homepage artwork should not repeat between the curated edit and category covers. Product images use consistent uncropped frames; gallery films fill fixed 4:3 slides across desktop and mobile.

Hero copy and the shop button overlay the full-width gallery film. Use a dark scrim and warm light text for readability on desktop and mobile.

Per user preference, videos have no visible play/pause controls. Continue muted playback while on screen and honour reduced motion.

Buttons use text labels without arrow icons; arrows may remain on editorial text links and artwork navigation.

The private Studio uses the original signature logo, warm paper, sage navigation and restrained dark-green actions. Dashboard figures come from the authenticated APIs; no fabricated trends or charts. Sign-in has a dedicated branded panel, password visibility control and recovery. Mobile navigation must close on Escape and route changes. Keep admin CSS scoped to the workspace.

Three quick clicks on the storefront header logo open admin sign-in. A single click remains the homepage link. The shortcut is navigation only; server-side password protection is required.

Serve compressed WebP artwork and posters, preserve logo transparency, and retain the original artwork proportions. Admin image and video pickers compress uploads automatically. Video conversion must retain frame timing and soundtracks; video processing code is loaded only when uploading a film.
