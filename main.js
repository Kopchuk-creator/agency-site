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

  /* ---------- 4. Поява блоків при скролі (fade-in-up) ---------- */
  // Що анімуємо. Перший екран (.about) сюди не входить —
  // у нього своя CSS-анімація при завантаженні.
  var REVEAL_SELECTORS = [
    '.section__head',
    '.pain', '.step',                       // «Знайомо?», «Як працюємо»
    '.faq-layout > *',
    '.filters', '.work', '.pack',           // «Роботи та ціни»
    '.term', '.terms__more', '.case-cta',
    '.booking', '.owner',                   // «Запис і контакти»
    '.contacts__list', '.formcard',
    '.final-cta__box',                      // фінальний заклик на головній
    '[data-reveal]'
  ].join(',');
  var STAGGER_MS = 90;     // крок затримки між сусідніми картками
  var STAGGER_MAX = 4;     // не більше 4 кроків — остання картка не «запізнюється»

  if (!reduceMotion && 'IntersectionObserver' in window) {
    var revealEls = Array.prototype.filter.call(
      document.querySelectorAll(REVEAL_SELECTORS),
      function (el) {
        // Те, що вже видно при завантаженні, не ховаємо — інакше воно «блимне»
        return el.getBoundingClientRect().top > window.innerHeight;
      }
    );

    revealEls.forEach(function (el) {
      el.setAttribute('data-reveal', '');

      // Stagger: номер елемента серед «братів», які теж з'являються
      var siblings = Array.prototype.filter.call(el.parentElement.children, function (child) {
        return revealEls.indexOf(child) !== -1;
      });
      var index = siblings.indexOf(el);
      el.style.setProperty('--reveal-delay', Math.min(index, STAGGER_MAX) * STAGGER_MS + 'ms');
    });

    // Тепер CSS має право ховати блоки до появи
    document.documentElement.classList.add('reveal-on');

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('is-in');
        revealObserver.unobserve(el);   // кожен блок з'являється один раз

        // Після появи прибираємо атрибут: картки повертаються до своїх
        // коротких переходів (hover), а не до повільних 800 мс появи
        el.addEventListener('transitionend', function done(e) {
          if (e.target !== el || e.propertyName !== 'transform') return;
          el.removeAttribute('data-reveal');
          el.classList.remove('is-in');
          el.style.removeProperty('--reveal-delay');
          el.removeEventListener('transitionend', done);
        });
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
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
    // Ховаємо, коли видно фінальний заклик або футер — там уже є свої кнопки
    var end = document.querySelector('.final-cta') || document.querySelector('.footer');
    var atEnd = end ? end.getBoundingClientRect().top < window.innerHeight : false;
    callback.classList.toggle('is-visible', pastHero && !atEnd);
  }

  /* ---------- 9. Форма зв'язку → Cloudflare Worker → Telegram ---------- */
  // Токена бота тут немає: він у секретах Worker-а (див. worker/contact-worker.js).
  // Сюди — тільки адреса Worker-а, її бачити не страшно.
  var CONTACT_ENDPOINT = '';  // [АДРЕСА WORKER-А], напр. https://agency-form.<ваш-акаунт>.workers.dev
  var REQUEST_TIMEOUT = 10000; // 10 с: якщо Worker не відповів — показуємо помилку, а не вічний спінер

  var form = document.getElementById('contactForm');

  if (form) {
    var statusEl = document.getElementById('formStatus');
    var submitBtn = document.getElementById('submitBtn');
    var packageSelect = form.elements.namedItem('package');
    // Поля, які перевіряємо. Приховану пастку для ботів (website) — ні.
    var FIELDS = 'input:not([name="website"]), select, textarea';

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
    Array.prototype.forEach.call(form.querySelectorAll(FIELDS), function (input) {
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

    // Стан «завантаження»: спінер на кнопці, повторний клік ігнорується,
    // aria-busy підказує скрінрідеру, що форма зайнята
    function setLoading(on) {
      submitBtn.classList.toggle('is-loading', on);
      form.setAttribute('aria-busy', String(on));
      if (on) submitBtn.setAttribute('aria-disabled', 'true');
      else submitBtn.removeAttribute('aria-disabled');
    }

    // Збираємо поля форми в об'єкт. Текст повідомлення для Telegram
    // складає Worker — так через форму не можна надіслати довільний текст.
    function collectData() {
      var get = function (name) {
        var field = form.elements.namedItem(name);
        return field ? field.value.trim() : '';
      };
      return {
        name: get('name'),
        phone: get('phone'),
        package: get('package'),
        message: get('message'),
        website: get('website'),          // пастка для ботів, Worker теж її перевіряє
        page: window.location.href
      };
    }

    function sendLead(data) {
      if (!CONTACT_ENDPOINT) {
        return Promise.reject(new Error('Не вказано адресу Worker-а (CONTACT_ENDPOINT) у main.js'));
      }

      // AbortController обриває запит, якщо Worker завис
      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT);

      return fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal
      })
        .then(function (res) {
          return res.json()
            .catch(function () { return {}; })
            .then(function (body) {
              if (!res.ok || !body.ok) {
                var err = new Error('Worker: ' + (body.error || 'HTTP ' + res.status));
                err.code = body.error;       // 'validation', 'telegram', 'origin'…
                throw err;
              }
              return body;
            });
        })
        .finally(function () { clearTimeout(timer); });
    }

    // Текст помилки для людини залежно від причини
    function errorMessage(err) {
      if (err && err.code === 'validation') return "Перевірте ім'я, телефон і пакет — щось заповнено неправильно.";
      if (err && err.name === 'AbortError') return 'Сервер не відповідає. Спробуйте ще раз або зателефонуйте нам.';
      return 'Не вдалося надіслати заявку. Зателефонуйте або напишіть нам у месенджер — контакти поруч.';
    }

    function onSuccess(packageValue) {
      showStatus('ok', 'Дякуємо, заявку отримано. Скоро зв\'яжемося.');
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
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitBtn.classList.contains('is-loading')) return; // захист від подвійного кліку

      var firstInvalid = null;
      Array.prototype.forEach.call(form.querySelectorAll(FIELDS), function (input) {
        if (!validateField(input) && !firstInvalid) firstInvalid = input;
      });

      if (firstInvalid) {
        statusEl.removeAttribute('data-state');
        // Якщо select замінений кастомним списком — фокусуємо видиме поле
        var visible = document.querySelector('[data-cselect-for="' + firstInvalid.id + '"]');
        (visible || firstInvalid).focus();
        return;
      }

      // Пастка для спам-ботів: людина це поле не бачить і не заповнює.
      // Якщо воно не порожнє — вдаємо успіх і нічого не надсилаємо.
      var trap = form.elements.namedItem('website');
      if (trap && trap.value) {
        onSuccess('');
        return;
      }

      var packageValue = packageSelect.value;   // зчитуємо до form.reset()
      setLoading(true);
      statusEl.removeAttribute('data-state');

      sendLead(collectData())
        .then(function () {
          onSuccess(packageValue);
        })
        .catch(function (err) {
          console.warn('[contactForm]', err);
          showStatus('err', errorMessage(err));
        })
        .then(function () {
          setLoading(false);
        });
    });
  }

  toggleCallback();
})();
