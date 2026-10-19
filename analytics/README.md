# Arcade website analytics (Cloudflare Web Analytics)

Mia and Michelle's Arcade uses **Cloudflare Web Analytics** for basic,
aggregate website usage and performance data. It is **on by default**, without
a visitor prompt, using Cloudflare's cookie-free, non-fingerprinting beacon.

## Configuration
- `analytics/config.js`: one public Cloudflare site token, and an emergency
  `enabled: true/false` master switch. It is **not** an API secret.
- `analytics/analytics.js`: injects the official Cloudflare beacon (module)
  only when the switch is enabled. The same loader is referenced by the home
  page, Privacy page, and each of the three independent games.
- `privacy.html`: short explanation for visitors, accessible from the home
  footer. It is informational; no visitor On/Off controls are necessary for
  these aggregate, cookie-free metrics.

Cloudflare dashboard hostname: `meredithzou.github.io`.
Live site: `https://meredithzou.github.io/mia-michelle-arcade/`.

## Phase 1 limits
Tracks pageviews, popular paths, country, browser/device categories, and
website performance. This is not precise unique-person tracking. It does not
capture `game_start`, `game_end`, score, note guesses or time actively playing.
Phase 2 gameplay events would need a separate design and privacy review.

The prior GA4 proof-of-concept and localStorage consent implementation were
removed. No Google Analytics library loads from any Arcade page.

## Privacy and scope
Cloudflare says its Web Analytics does not use analytics cookies, localStorage,
or visitor fingerprinting. A visitor's browser does contact Cloudflare's
beacon servers to send page performance and navigation metrics. We do not send
usernames, player answers, children’s personal information, or custom IDs.

The site may be used by children; limit this analytics integration to internal
site traffic/performance statistics. Before expanding into events or user
profiling, reassess applicable privacy requirements. The site's Privacy page
discloses the measurement provider.

## QA checklist
- Run `python3 scripts/check_site.py`.
- All home/game/Privacy pages load exactly one shared Cloudflare beacon.
- Confirm the token matches the Cloudflare site's configured hostname.
- In Safari/Chrome devtools, verify `static.cloudflareinsights.com/beacon.min.js`
  loads and beacon POSTs reach `cloudflareinsights.com/cdn-cgi/rum`.
- Confirm NO `googletagmanager.com`, `google-analytics.com`, `_ga` cookies or
  `arcade.analytics.consent` localStorage writes from our own site.
- Confirm dashboard pageviews for `/mia-michelle-arcade/` and the three game paths.
- Verify iPad gameplay, sound, buttons, touch navigation, and Rainbow/Halloween theme.
- If site CORS rejection occurs, check that Cloudflare Web Analytics hostname is
  exactly `meredithzou.github.io`.
