# Arcade Analytics — Phase 1 (not activated)

## Status
The website deliberately ships with `enabled: false` in `analytics/config.js`.
Merging this branch adds only the optional analytics foundation; it **does not send
analytics traffic**. Never enable it without a separate owner-approved PR and a
privacy review appropriate for a site that children may use.

GA4 Measurement ID: `G-9FE0PH4LHC` (public identifier, not a secret).

## Architecture
- `analytics/config.js`: global feature flag and GA4 measurement ID.
- `analytics/analytics.js`: opt-in consent storage, controlled tag loading,
  privacy preference changes, and cookie cleanup after withdrawal.
- `privacy.html`: plain-language privacy notice and preference control.
- Homepage and game pages load the same configuration/loader at the end
  of the HTML; game code and homepage theme implementation are unchanged.

## When enabled, behavior
1. First visit: GA4 does not load. The homepage and games show no consent popup;
   playing is unaffected. A visitor can choose only from `privacy.html`.
2. The Privacy page provides inline `Off · No thanks` / `On · Allow` controls,
   defaulting to Off; they are disabled while the site feature flag is off.
3. Decline: a choice is stored locally, without loading GA4.
4. Allow: a choice is stored locally and GA4 loads. Measurement is limited
   to page views in Phase 1, with the GA4 property configured separately.
5. Returning visitors: saved choice applies across this website's pages.
6. Change: open `privacy.html` and choose On/Off; withdrawal stops future
   analytics, removes accessible GA cookies, and reloads the page.
7. Browsers that block localStorage remain untracked (fail-closed).

The preference is scoped to this browser and storage; other devices require
their own choice. Withdrawing cannot remove historical aggregated GA4 reports.

## Important privacy / compliance notes
- The site may be directed to or used by young children. **Do not activate**
  until suitability of GA4, COPPA requirements and any other applicable
  children’s privacy laws are reviewed. A normal site-visitor opt-in button is
  **not** verified parental consent.
- GA4 and its cookies can use pseudonymous identifiers. Do **not** call it
  anonymous analytics.
- Property settings (Google Signals / granular location / ads personalization /
  enhanced measurement / data retention) must be verified in the owner's
  Google Analytics console separately; this repository cannot audit that UI.
- Do not send names, emails, game answers, custom player IDs, or other
  child-related personal data. Do not add gameplay telemetry in Phase 1.
- A separate PR must change `enabled` to true only after review and approval.

## Test checklist
- Run `python3 scripts/check_site.py`.
- Confirm no requests to `googletagmanager.com` and no `_ga` cookies while off.
- In a separate review environment, temporarily enable the flag (do not merge
  that setting) and test: no tag before choice, none after decline, one tag
  after allow, no further collection after withdrawal.
- Verify home + all three game pages on iPad Safari, including navigation,
  sound, touch inputs, and absence of consent popups outside Privacy.
- Verify Realtime reports only after permission and the separate activation.
