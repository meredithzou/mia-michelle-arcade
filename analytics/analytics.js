/* Cloudflare Web Analytics — pageviews and site performance only.
   No GA4, cookies, visitor profiles, consent modal, or custom game events.
   Loaded once on each page from the shared /analytics/ folder. */
(function () {
  "use strict";
  var cfg = window.ARCADE_ANALYTICS_CONFIG;
  if (!cfg || cfg.enabled !== true || cfg.provider !== "cloudflare-web-analytics" ||
      !/^[a-f0-9]{32}$/.test(cfg.siteToken)) return;

  // Official Cloudflare manual beacon snippet, injected from one shared file.
  var beacon = document.createElement("script");
  beacon.type = "module";
  beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
  beacon.setAttribute("data-cf-beacon", JSON.stringify({
    token: cfg.siteToken,
    spa: false // All Arcade games and the homepage use traditional HTML navigation.
  }));
  document.head.appendChild(beacon);
})();
