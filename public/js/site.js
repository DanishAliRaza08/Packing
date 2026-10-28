// Menu, cookie consent, and analytics that only load after consent.
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var body = document.body;
  var CONSENT_KEY = "cookie-consent";

  // Mobile menu
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  function readConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function saveConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) { /* storage blocked */ }
  }

  // Events are queued until analytics loads, then sent. With no consent they are dropped.
  var queue = [];
  var analyticsReady = false;
  window.track = function (name, params) {
    if (analyticsReady && window.gtag) window.gtag("event", name, params || {});
    else queue.push([name, params]);
  };

  function loadScript(src) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function loadAnalytics() {
    var ga = body.dataset.ga4;
    var clarity = body.dataset.clarity;
    if (ga) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", ga, { anonymize_ip: true });
      loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ga));
      analyticsReady = true;
      queue.forEach(function (ev) { window.gtag("event", ev[0], ev[1] || {}); });
      queue = [];
    }
    if (clarity) {
      window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
      loadScript("https://www.clarity.ms/tag/" + encodeURIComponent(clarity));
    }
  }

  var banner = document.querySelector(".cookie-banner");
  function showBanner() { if (banner) banner.hidden = false; }
  var consent = readConsent();
  if (consent === "granted") loadAnalytics();
  else if (consent !== "denied") showBanner();

  document.querySelectorAll("[data-consent]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var value = btn.getAttribute("data-consent");
      saveConsent(value);
      if (banner) banner.hidden = true;
      if (value === "granted") loadAnalytics();
      else if (consent === "granted") window.location.reload(); // stop analytics already running
      consent = value;
    });
  });
  document.querySelectorAll("[data-cookie-settings]").forEach(function (btn) {
    btn.addEventListener("click", showBanner);
  });

  // Click tracking (e.g. WhatsApp links) and page-level events (e.g. quote_submitted)
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-track]");
    if (el) window.track(el.getAttribute("data-track"), { market: body.dataset.market });
  });
  if (body.dataset.event) window.track(body.dataset.event, { market: body.dataset.market });
})();
