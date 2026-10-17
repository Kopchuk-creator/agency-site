/* ==========================================================================
   Агенція — інтерактив
   Принцип: якщо вимкнути JS — сайт лишається робочим і читабельним.
   Усі анімації поважають prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Рік у футері ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- 2. Тінь хедера при скролі ---------- */
  var header = document.getElementById('header');
  var onScrollHeader = function () {
    header.classList.toggle('is-stuck', window.scrollY > 8);
  };
  onScrollHeader();

  /* ---------- 3. Мобільне меню ---------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobile-menu');

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    menu.setAttribute('data-open', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    // Липка панель знизу перекривала б нижні пункти меню
    document.body.classList.toggle('menu-open', open);
  }

  if (burger && menu) {
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });

    // Закриваємо після переходу за посиланням
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });

    // Escape — вихід
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        burger.focus();
      }
    });

    // Перехід на десктоп при відкритому меню лишав би body із
    // overflow:hidden — сторінка не скролилась би.
    window.matchMedia('(min-width: 1001px)').addEventListener('change', function (e) {
      if (e.matches && burger.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
  }

  /* ---------- 4. Поява елементів при скролі ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    // Без анімації — просто показуємо все
    Array.prototype.forEach.call(revealEls, function (el) { el.classList.add('is-in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

    Array.prototype.forEach.call(revealEls, function (el) { revealObserver.observe(el); });
  }

  /* ---------- 5. Лічильники в кейсах ---------- */
  var counters = document.querySelectorAll('[data-count]');

  function formatNum(value, decimals) {
    return decimals > 0
      ? value.toFixed(decimals).replace('.', ',')
      : Math.round(value).toString();
  }

  function renderCounter(el, value) {
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    el.textContent = prefix + formatNum(value, decimals) + suffix;
  }

  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);

    if (reduceMotion) { renderCounter(el, target); return; }

    var duration = 1100;
    var start = null;
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      renderCounter(el, target);
    }

    function step(ts) {
      if (done) return;
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      renderCounter(el, target * eased);
      if (p < 1) requestAnimationFrame(step);
      else finish();
    }

    // Страховка: якщо rAF не виконується (фонова вкладка, throttling),
    // число не має залишитись нулем — показуємо фінальне значення.
    window.setTimeout(finish, duration + 400);

    renderCounter(el, 0);
    requestAnimationFrame(step);

    void decimals;
  }

  if (counters.length) {
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(counters, function (el) {
        renderCounter(el, parseFloat(el.getAttribute('data-count')));
      });
    } else {
      var countObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          countObserver.unobserve(entry.target);
        });
      }, { threshold: 0.5 });

      Array.prototype.forEach.call(counters, function (el) { countObserver.observe(el); });
    }
  }

  /* ---------- 7. Скрол: хедер і віджет «Передзвонимо» ---------- */
  window.addEventListener('scroll', function () {
    onScrollHeader();
    toggleCallback();
  }, { passive: true });

  /* ---------- 8. Віджет «Передзвонимо» ---------- */
  var callback = document.getElementById('callback');
  function toggleCallback() {
    if (!callback) return;
    var pastHero = window.scrollY > 700;
    var atForm = false;
    var form = document.getElementById('audyt');
    if (form) {
      var rect = form.getBoundingClientRect();
      atForm = rect.top < window.innerHeight && rect.bottom > 0;
    }
    callback.classList.toggle('is-visible', pastHero && !atForm);
  }

  /* ---------- 9. Форма зв'язку ---------- */
  var form = document.getElementById('contactForm');

  if (form) {
    var statusEl = document.getElementById('formStatus');
    var submitBtn = document.getElementById('submitBtn');

    var validators = {
      name: function (value) {
        return value.trim().length >= 2;
      },
      phone: function (value) {
        var digits = value.replace(/\D/g, '');
        return digits.length >= 9 && digits.length <= 15;
      },
      package: function (value) {
        return value !== '';
      }
    };

    // Кнопка «Обрати пакет» на сторінці цін веде сюди з ?paket=N —
    // одразу підставляємо цей пакет у форму
    var packageSelect = form.elements.namedItem('package');
    var paketParam = new URLSearchParams(window.location.search).get('paket');
    var paketExists = packageSelect && Array.prototype.some.call(packageSelect.options, function (o) {
      return o.value === paketParam;
    });
    if (paketParam && paketExists) packageSelect.value = paketParam;

    function fieldWrap(input) {
      return input.closest('.field');
    }

    function validateField(input) {
      var name = input.name;
      var ok = validators[name] ? validators[name](input.value) : input.checkValidity();
      var wrap = fieldWrap(input);
      wrap.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      return ok;
    }

    // Валідація на blur, а не на кожен символ
    Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea'), function (input) {
      input.addEventListener('blur', function () {
        if (input.value !== '') validateField(input);
      });

      // Знімаємо помилку, щойно користувач виправляє
      input.addEventListener('input', function () {
        var wrap = fieldWrap(input);
        if (wrap.classList.contains('is-invalid')) validateField(input);
      });

      input.addEventListener('change', function () {
        if (input.tagName === 'SELECT') validateField(input);
      });
    });

    function showStatus(state, message) {
      statusEl.setAttribute('data-state', state);
      statusEl.innerHTML =
        (state === 'ok'
          ? '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>'
          : '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>') +
        '<span>' + message + '</span>';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var inputs = Array.prototype.slice.call(form.querySelectorAll('input, select, textarea'));
      var firstInvalid = null;

      inputs.forEach(function (input) {
        if (!validateField(input) && !firstInvalid) firstInvalid = input;
      });

      if (firstInvalid) {
        statusEl.removeAttribute('data-state');
        firstInvalid.focus();
        return;
      }

      // ── Точка інтеграції з бекендом ──────────────────────────────
      // Тут підставляється реальний ендпоінт: сервіс аудиту, CRM,
      // Google Sheets, Telegram-бот. Зараз — імітація відповіді,
      // щоб фронтенд можна було демонструвати автономно.
      //
      //   fetch('/api/contact', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(Object.fromEntries(new FormData(form)))
      //   }).then(...)
      // ─────────────────────────────────────────────────────────────

      // Зчитуємо до form.reset() — інакше значення вже стерте
      var packageValue = packageSelect ? packageSelect.value : '';

      submitBtn.classList.add('is-loading');
      submitBtn.setAttribute('aria-disabled', 'true');
      statusEl.removeAttribute('data-state');

      window.setTimeout(function () {
        submitBtn.classList.remove('is-loading');
        submitBtn.removeAttribute('aria-disabled');

        // ⚠️ РЕЖИМ МАКЕТА: заявка нікуди не надсилається, це імітація.
        // Після підключення бекенду замінити на:
        // 'Дякуємо! Передзвонимо протягом робочого дня.'
        showStatus('ok', 'Так виглядатиме підтвердження. Це макет — заявка нікуди не надіслана.');
        form.reset();

        Array.prototype.forEach.call(form.querySelectorAll('.field'), function (f) {
          f.classList.remove('is-invalid');
        });

        // Події для аналітики. dataLayer — для GTM, CustomEvent — для
        // analytics.js, який перекидає це в GA4 і Meta як конверсію.
        if (window.dataLayer) window.dataLayer.push({ event: 'contact_form_submit' });
        window.dispatchEvent(new CustomEvent('agency:lead', {
          detail: { form: 'contact', package: packageValue }
        }));
      }, 900);
    });
  }

  /* ---------- 10. Підсвітка активного пункту меню ---------- */
  var sections = Array.prototype.slice.call(
    document.querySelectorAll('section[id]')
  ).filter(function (s) {
    return document.querySelector('.nav__link[href="#' + s.id + '"]');
  });

  if (sections.length && 'IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = document.querySelector('.nav__link[href="#' + entry.target.id + '"]');
        if (!link) return;
        if (entry.isIntersecting) {
          document.querySelectorAll('.nav__link[aria-current]').forEach(function (l) {
            l.removeAttribute('aria-current');
          });
          link.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { navObserver.observe(s); });
  }

  toggleCallback();
})();
