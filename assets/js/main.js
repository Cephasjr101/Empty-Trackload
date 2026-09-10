
/* LoadMatch MVP — main.js
   Shared behavior: nav, cookie consent (gates analytics), footer year. */
(function(){
  "use strict";
  window.LM = window.LM || {};
  LM.CONFIG = { ANALYTICS_ID: "G-XXXXXXXXXX", COMMISSION_DEFAULT: 5, COMMISSION_MIN: 3, COMMISSION_MAX: 10 };

  /* ---------- Mobile nav ---------- */
  var toggle = document.getElementById("nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function(){
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function(el){
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Cookie consent + analytics gating ---------- */
  var CONSENT_KEY = "lm_cookie_consent";
  function getConsent(){ try { return localStorage.getItem(CONSENT_KEY); } catch(e){ return null; } }
  function loadAnalytics(){
    if (LM.CONFIG.ANALYTICS_ID.indexOf("XXXX") !== -1) return; // not configured yet
    var s = document.createElement("script"); s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + LM.CONFIG.ANALYTICS_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", LM.CONFIG.ANALYTICS_ID, { anonymize_ip: true });
  }
  var banner = document.getElementById("cookie-banner");
  function refreshBanner(){
    if (banner && !getConsent()) banner.classList.add("show");
  }
  document.querySelectorAll("[data-consent]").forEach(function(btn){
    btn.addEventListener("click", function(){
      var v = btn.getAttribute("data-consent");
      try { localStorage.setItem(CONSENT_KEY, v); } catch(e){}
      if (banner) banner.classList.remove("show");
      if (v === "accepted") loadAnalytics();
    });
  });
  if (getConsent() === "accepted") loadAnalytics();
  refreshBanner();
})();
