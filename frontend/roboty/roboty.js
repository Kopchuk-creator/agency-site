/* ==========================================================================
   Сторінка «Роботи та ціни»: фільтр робіт за нішею.
   Посилання виду roboty/?nisha=spa#roboty одразу відкриває потрібну нішу.
   ========================================================================== */
(function () {
  'use strict';

  var filters = document.getElementById('worksFilters');
  var list = document.getElementById('worksList');
  var countEl = document.getElementById('worksCount');
  if (!filters || !list) return;

  var buttons = Array.prototype.slice.call(filters.querySelectorAll('[data-filter]'));
  var works = Array.prototype.slice.call(list.querySelectorAll('.work'));

  // Як правильно сказати «N робіт» українською
  function plural(n) {
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'робота';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'роботи';
    return 'робіт';
  }

  function applyFilter(niche) {
    var shown = 0;

    works.forEach(function (work) {
      var match = niche === 'all' || work.getAttribute('data-niche') === niche;
      work.hidden = !match;
      if (match) shown++;
    });

    buttons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-filter') === niche));
    });

    // Текст для скрінрідера (aria-live) і для тих, хто бачить
    countEl.textContent = shown
      ? 'Показано ' + shown + ' ' + plural(shown) + ' з ' + works.length
      : 'У цій ніші робіт поки немає — але зробимо першу для вас.';
  }

  // Один обробник на всю групу замість окремого на кожну кнопку
  filters.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-filter]');
    if (btn) applyFilter(btn.getAttribute('data-filter'));
  });

  // Скрипт працює — показуємо кнопки
  filters.hidden = false;

  var fromUrl = new URLSearchParams(window.location.search).get('nisha');
  var known = buttons.some(function (btn) { return btn.getAttribute('data-filter') === fromUrl; });
  applyFilter(known ? fromUrl : 'all');
})();
