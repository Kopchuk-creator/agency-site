/* ==========================================================================
   Аналітика — GA4, Google Tag Manager, Meta Pixel, Google Ads
   --------------------------------------------------------------------------
   ЯК УВІМКНУТИ: впишіть свої ID у CONFIG нижче. Порожнє значення = вимкнено,
   жодного запиту не надсилається. Це навмисно: сайт не має стукати в чужі
   лічильники з чужими ідентифікаторами, поки ви не підключили власні.

   Де взяти ID:
   • GA4      — analytics.google.com → Адміністратор → Потоки даних   (G-XXXXXXXXXX)
   • GTM      — tagmanager.google.com → Робоча область               (GTM-XXXXXXX)
   • Meta     — business.facebook.com → Events Manager               (15–16 цифр)
   • Ads      — ads.google.com → Інструменти → Менеджер конверсій    (AW-XXXXXXXXX)

   Якщо ви ставите GTM — GA4, Pixel і Ads зазвичай підключають уже всередині
   GTM, а не тут. Тоді залишіть заповненим лише GTM.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    ga4:       '',   // 'G-XXXXXXXXXX'
    gtm:       '',   // 'GTM-XXXXXXX'
    metaPixel: '',   // '1234567890123456'
    googleAds: ''    // 'AW-XXXXXXXXX'
  };

  var head = document.head;

  function loadScript(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    head.appendChild(s);
  }

  /* ---------- Google Tag Manager ---------- */
  if (CONFIG.gtm) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    loadScript('https://www.googletagmanager.com/gtm.js?id=' + CONFIG.gtm);

    // <noscript>-запасний варіант для GTM
    var ns = document.createElement('noscript');
    var fr = document.createElement('iframe');
    fr.src = 'https://www.googletagmanager.com/ns.html?id=' + CONFIG.gtm;
    fr.height = '0';
    fr.width = '0';
    fr.style.cssText = 'display:none;visibility:hidden';
    ns.appendChild(fr);
    document.body.insertBefore(ns, document.body.firstChild);
  }

  /* ---------- GA4 + Google Ads (спільний gtag) ---------- */
  if (CONFIG.ga4 || CONFIG.googleAds) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());

    loadScript('https://www.googletagmanager.com/gtag/js?id=' + (CONFIG.ga4 || CONFIG.googleAds));

    if (CONFIG.ga4) window.gtag('config', CONFIG.ga4);
    if (CONFIG.googleAds) window.gtag('config', CONFIG.googleAds);
  }

  /* ---------- Meta Pixel ---------- */
  if (CONFIG.metaPixel) {
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', CONFIG.metaPixel);
    window.fbq('track', 'PageView');
  }

  /* ---------- Події сайту ----------
     main.js штовхає подію 'audit_form_submit' у dataLayer після успішної
     відправки форми. Тут перекидаємо її в GA4 і Meta як конверсію. */
  window.addEventListener('agency:lead', function (e) {
    var detail = (e && e.detail) || {};

    if (window.gtag && CONFIG.ga4) {
      window.gtag('event', 'generate_lead', {
        form: detail.form || 'audit',
        niche: detail.niche || ''
      });
    }

    if (window.fbq && CONFIG.metaPixel) {
      window.fbq('track', 'Lead', { content_name: detail.form || 'audit' });
    }
  });
})();
