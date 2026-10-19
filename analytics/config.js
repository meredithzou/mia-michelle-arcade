// Cloudflare Web Analytics: basic aggregate page stats, enabled by default.
// The token identifies this public website; it is NOT a secret API credential.
// Set enabled: false if we ever want to stop the analytics beacon globally.
window.ARCADE_ANALYTICS_CONFIG = Object.freeze({
  provider: "cloudflare-web-analytics",
  enabled: true,
  siteToken: "1c7b00000c834cf19ed42b8256ac04ae"
});
