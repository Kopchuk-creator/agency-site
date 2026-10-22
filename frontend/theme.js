/* ==========================================================================
   ТЕМНА / СВІТЛА ТЕМА
   Початкову тему ставить маленький скрипт у <head> ще до першого малювання
   (інакше темна тема «блимала б» білим). Тут — лише перемикання.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'theme';
  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  var metaColor = document.querySelector('meta[name="theme-color"]');
  var animTimer;

  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }  // приватний режим
  }

  function apply(theme) {
    var dark = theme === 'dark';
    root.setAttribute('data-theme', theme);
    // Колір рядка браузера на телефоні — під фон сторінки
    if (metaColor) metaColor.setAttribute('content', dark ? '#121212' : '#ffffff');

    var label = dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', label);
      btn.title = label;
    });
  }

  // Плавна зміна кольорів лише під час перемикання — щоб не гальмувати hover
  function animate() {
    root.classList.add('theme-anim');
    clearTimeout(animTimer);
    animTimer = setTimeout(function () { root.classList.remove('theme-anim'); }, 350);
  }

  apply(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-theme-toggle]')) return;
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    animate();
    apply(next);
    try { localStorage.setItem(KEY, next); } catch (err) { /* не збереглось — не страшно */ }
  });

  // Користувач не обирав тему вручну — слідуємо за системою
  media.addEventListener('change', function (e) {
    if (saved()) return;
    animate();
    apply(e.matches ? 'dark' : 'light');
  });
})();
