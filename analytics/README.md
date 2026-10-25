# Website statistics — Cloudflare Web Analytics

The Arcade uses **Cloudflare Web Analytics** for aggregate pageviews and performance. It is enabled by default and uses Cloudflare's cookie-free, non-fingerprinting browser beacon. The site does not send game scores, note guesses, player names, or custom player identifiers.

## Live site and configuration

- Primary website: **https://miamichellearcade.com/**
- GitHub Pages repository: `meredithzou/mia-michelle-arcade`
- `analytics/config.js`: public Cloudflare Web Analytics site token and `enabled` master switch. The token is **not** an API secret.
- `analytics/analytics.js`: loads Cloudflare's official beacon once per page.
- `privacy.html`: public explanation of aggregate analytics.

The homepage, Privacy page, and **all ten games** load the same shared analytics scripts:
Chicken Jockey Dash, Chinese Checkers, Name That Note!, Play That Note!, Do I Have Absolute Pitch?, Find the Pair!, Five in a Row (Gomoku), Piano Note Finder, Jigsaw Garden, and Marble Run Lab.

**Dashboard check after the custom-domain move:** The original analytics configuration was created while the site used `meredithzou.github.io`. In Cloudflare Web Analytics, verify that the site hostname/configuration also accepts `miamichellearcade.com`, and confirm actual pageviews from the new hostname. Updating this README or DNS alone does not update Cloudflare's analytics dashboard configuration.

## Scope

Analytics covers page visits, popular paths, approximate country/device/browser breakdowns, and web performance. It does **not** capture `game_start`, `game_end`, scores, correct answers, or active playtime. Any future gameplay event tracking needs separate design and privacy review, especially because children may use the site.

The previous Google Analytics experiment was removed. No GA4 code should be loaded by the Arcade.

## QA

1. Run `python3 scripts/check_site.py`.
2. Confirm the homepage, Privacy page, and ten games each load `analytics/config.js` and `analytics/analytics.js` exactly once.
3. In browser developer tools, confirm `static.cloudflareinsights.com/beacon.min.js` loads and that beacon requests succeed.
4. In Cloudflare Web Analytics, check that visits to `https://miamichellearcade.com/` and `/games/<game-slug>/` appear. This requires checking the dashboard, not just the source code.
5. Confirm the site does not load Google Analytics or write tracking-consent cookies/localStorage entries.
6. Verify touch gameplay and audio separately on iPad Safari.

Cloudflare's beacon is independent of whether the DNS records are proxied (orange cloud) or DNS-only (gray cloud).
