/* Optional GA4 Phase 1 pageview analytics.
   Fail-closed: no Google script, request, or analytics cookie until enabled AND
   the visitor has explicitly opted in on this browser. No game events yet. */
(function () {
  "use strict";

  var config = window.ARCADE_ANALYTICS_CONFIG;
  var script = document.currentScript;
  var id = config && config.measurementId;
  var active = !!(config && config.enabled === true && /^G-[A-Z0-9]+$/.test(id));
  var key = "arcade.analytics.consent.v" + (config && config.consentVersion || 1);
  var loaded = false;
  var panel = null;
  var privacyUrl = script && script.src
    ? new URL("../privacy.html", script.src).href : "privacy.html";

  function choice() {
    try {
      var value = window.localStorage.getItem(key);
      return value === "allow" || value === "decline" ? value : null;
    } catch (e) { return null; }
  }

  function save(value) {
    try {
      window.localStorage.setItem(key, value);
      return window.localStorage.getItem(key) === value;
    } catch (e) { return false; }
  }

  function eraseAnalyticsCookies() {
    // GA4's first-party cookies are normally _ga and _ga_<stream>.
    document.cookie.split(";").forEach(function (part) {
      var name = part.split("=")[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) return;
      ["/", "/mia-michelle-arcade/", window.location.pathname].forEach(function (path) {
        document.cookie = name + "=; Max-Age=0; path=" + path + "; SameSite=Lax; Secure";
      });
    });
  }

  function removePanel() {
    if (panel) { panel.remove(); panel = null; }
  }

  function dispatchChange() {
    window.dispatchEvent(new Event("arcade-analytics-consent-change"));
  }

  function loadGoogleTag() {
    if (!active || loaded || choice() !== "allow") return;
    loaded = true;
    window["ga-disable-" + id] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("js", new Date());
    window.gtag("config", id, {
      send_page_view: true,
      page_location: window.location.origin + window.location.pathname,
      page_referrer: "",
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(tag);
  }

  function setConsent(value) {
    if (!active || (value !== "allow" && value !== "decline")) return false;
    if (!save(value)) {
      // A browser that refuses local storage remains untracked.
      window.alert("Your browser could not save this choice. Analytics will stay off.");
      return false;
    }
    removePanel();
    if (value === "allow") {
      loadGoogleTag();
    } else {
      window["ga-disable-" + id] = true;
      eraseAnalyticsCookies();
      if (loaded) {
        // Loading an external script cannot be undone without a navigation.
        window.location.reload();
        return true;
      }
    }
    dispatchChange();
    return true;
  }

  function showChoices() {
    if (!active) return false;
    if (panel) return true;
    panel = document.createElement("section");
    panel.className = "arcade-analytics-consent";
    panel.setAttribute("aria-label", "Optional website statistics");
    panel.innerHTML =
      '<p class="arcade-analytics-consent__title">Optional website statistics</p>' +
      '<p class="arcade-analytics-consent__description">May we use Google Analytics to count page visits, general locations, and device categories? Google may set analytics cookies. No gameplay details or names are collected. You can say no and still play. <a href="' + privacyUrl + '">Privacy details</a>.</p>' +
      '<div class="arcade-analytics-consent__buttons">' +
        '<button type="button" class="arcade-analytics-consent__allow">Allow statistics</button>' +
        '<button type="button" class="arcade-analytics-consent__decline">No thanks</button>' +
      '</div>';
    panel.querySelector(".arcade-analytics-consent__allow").addEventListener("click", function () { setConsent("allow"); });
    panel.querySelector(".arcade-analytics-consent__decline").addEventListener("click", function () { setConsent("decline"); });
    document.body.appendChild(panel);
    return true;
  }

  // The public API can be used by the privacy page. If disabled, it stays inert.
  window.ArcadeAnalytics = {
    isEnabled: function () { return active; },
    getConsent: choice,
    showChoices: showChoices,
    setConsent: setConsent
  };

  if (!active) return; // Crucial: no CSS, consent UI, or Google network requests.

  var sheet = document.createElement("link");
  sheet.rel = "stylesheet";
  sheet.href = new URL("consent.css", script.src).href;
  document.head.appendChild(sheet);

  function init() {
    if (choice() === "allow") loadGoogleTag();
    else if (choice() === null) showChoices();
    dispatchChange();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
