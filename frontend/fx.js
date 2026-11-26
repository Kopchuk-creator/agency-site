/* ==========================================================================
   Starix — ефекти «Темного преміуму»
   Лише transform і opacity. Якщо в системі вимкнено анімації — нічого не
   вмикаємо, сторінка лишається статичною й повністю робочою.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;

  /* ---------- 1. Шари підсвітки та промінь (декор, видно й без руху) ---------- */
  var SPOT_CARDS = '.pain, .pack, .work, .term, .support-plan, .faq-cta';

  if (finePointer) {
    document.querySelectorAll(SPOT_CARDS).forEach(function (card) {
      var spot = document.createElement('span');
      spot.className = 'spot';
      spot.setAttribute('aria-hidden', 'true');
      card.classList.add('has-spot');
      card.insertBefore(spot, card.firstChild);
    });

    // Один обробник на всю сторінку: пляма світла йде за курсором у межах картки.
    // Координати оновлюємо раз на кадр — не частіше, ніж браузер малює.
    var pending = null;
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('.has-spot');
      if (!card) return;
      if (pending) { pending.e = e; pending.card = card; return; }
      pending = { e: e, card: card };
      requestAnimationFrame(function () {
        var r = pending.card.getBoundingClientRect();
        var spot = pending.card.querySelector('.spot');
        spot.style.setProperty('--mx', (pending.e.clientX - r.left) + 'px');
        spot.style.setProperty('--my', (pending.e.clientY - r.top) + 'px');
        pending = null;
      });
    }, { passive: true });
  }

  document.querySelectorAll('.pack--featured').forEach(function (card) {
    var beam = document.createElement('span');
    beam.className = 'beam';
    beam.setAttribute('aria-hidden', 'true');
    card.appendChild(beam);
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('[data-to-top]')) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  if (reduceMotion) return;

  root.classList.add('fx-on');

  /* ---------- Відблиск на синіх і білих кнопках (крім шапки) ---------- */
  if (finePointer) {
    document.querySelectorAll('.btn--primary, .btn--ghost').forEach(function (btn) {
      if (btn.closest('.header')) return;
      var shine = document.createElement('span');
      shine.className = 'btn__shine';
      shine.setAttribute('aria-hidden', 'true');
      btn.insertBefore(shine, btn.firstChild);
    });
  }

  /* ---------- 2. Смужка прогресу читання ---------- */
  var progress = document.createElement('div');
  progress.className = 'progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  /* ---------- 3. Заголовок першого екрана: слова по черзі ----------
     Ділимо лише текстові вузли; вкладений <em> лишається цілим «словом»,
     щоб не зламати градієнт. Пробіли зберігаємо — текст для скрінрідера той самий. */
  var title = document.querySelector('.about__title');
  if (title) {
    var index = 0;
    var wrap = function (node) {
      var w = document.createElement('span');
      var inner = document.createElement('span');
      w.className = 'w';
      inner.style.setProperty('--i', index++);
      inner.appendChild(node);
      w.appendChild(inner);
      return w;
    };
    Array.prototype.slice.call(title.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
          else frag.appendChild(wrap(document.createTextNode(part)));
        });
        title.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        title.replaceChild(wrap(node.cloneNode(true)), node);
      }
    });
    title.classList.add('is-split');
  }

  /* ---------- 4. Нахил скріншота за курсором ---------- */
  var visual = document.querySelector('.about__visual');
  var frame = visual && visual.querySelector('.about__frame');
  if (frame && finePointer) {
    var MAX_TILT = 6; // градусів
    visual.addEventListener('pointermove', function (e) {
      var r = visual.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;   // −0.5 … 0.5
      var y = (e.clientY - r.top) / r.height - 0.5;
      frame.style.transform = 'perspective(1100px) rotateY(' + (x * MAX_TILT) + 'deg) rotateX(' + (-y * MAX_TILT) + 'deg)';
    });
    visual.addEventListener('pointerleave', function () { frame.style.transform = ''; });
  }

  /* ---------- 5. Лінія етапів «малюється», а назва у футері виринає, коли блок на екрані ---------- */
  var steps = document.querySelector('.steps');
  var wordmark = document.querySelector('.footer__wordmark');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-inview');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    if (steps) io.observe(steps);
    if (wordmark) io.observe(wordmark);
  } else {
    if (steps) steps.classList.add('is-inview');
    if (wordmark) wordmark.classList.add('is-inview');
  }
})();
