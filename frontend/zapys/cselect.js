/* ==========================================================================
   Кастомний випадаючий список поверх звичайного <select data-cselect>.
   Оригінальний <select> лишається у формі (прихований): саме він
   відправляється й валідується в main.js. Доступність — за патерном
   WAI-ARIA «select-only combobox»: Tab, стрілки, Home/End, Enter, Escape.
   ========================================================================== */
(function () {
  'use strict';

  var uid = 0;

  function enhance(select) {
    var id = select.id || ('cselect-' + (++uid));
    var label = document.querySelector('label[for="' + id + '"]');
    var options = Array.prototype.filter.call(select.options, function (o) { return !o.disabled; });

    /* ---------- Розмітка ---------- */
    var wrap = document.createElement('div');
    wrap.className = 'cselect';

    // Кнопка-поле: фокус весь час тут, пункти підсвічуються через aria-activedescendant
    var control = document.createElement('div');
    control.className = 'cselect__control';
    control.id = id + '-control';
    control.tabIndex = 0;
    control.setAttribute('role', 'combobox');
    control.setAttribute('aria-haspopup', 'listbox');
    control.setAttribute('aria-expanded', 'false');
    control.setAttribute('aria-controls', id + '-list');
    control.setAttribute('data-cselect-for', id);   // main.js фокусує це поле при помилці
    if (select.required) control.setAttribute('aria-required', 'true');

    var valueEl = document.createElement('span');
    valueEl.className = 'cselect__value';
    control.appendChild(valueEl);

    var list = document.createElement('ul');
    list.className = 'cselect__list';
    list.id = id + '-list';
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;
    list.hidden = true;

    options.forEach(function (opt, i) {
      var li = document.createElement('li');
      li.className = 'cselect__option';
      li.id = id + '-opt-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('data-value', opt.value);
      li.textContent = opt.textContent;
      list.appendChild(li);
    });
    var items = Array.prototype.slice.call(list.children);

    if (label) {
      label.id = label.id || id + '-label';
      control.setAttribute('aria-labelledby', label.id);
      list.setAttribute('aria-labelledby', label.id);
      label.removeAttribute('for');               // інакше клік фокусував би прихований select
      label.addEventListener('click', function () { control.focus(); });
    }

    wrap.appendChild(control);
    wrap.appendChild(list);
    select.parentNode.insertBefore(wrap, select.nextSibling);

    // Оригінал ховаємо від очей, клавіатури й скрінрідера, але лишаємо у формі
    select.classList.add('cselect__native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    /* ---------- Стан ---------- */
    var active = -1;   // підсвічений пункт (клавіатура або миша)

    function isOpen() { return control.getAttribute('aria-expanded') === 'true'; }

    // З <select> → у кастомний вигляд (після вибору, ?paket=, reset форми)
    function sync() {
      var opt = select.options[select.selectedIndex];
      var hasValue = select.value !== '';
      valueEl.textContent = opt ? opt.textContent : '';
      control.classList.toggle('is-placeholder', !hasValue);
      items.forEach(function (li) {
        li.setAttribute('aria-selected', String(hasValue && li.getAttribute('data-value') === select.value));
      });
    }

    function setActive(i) {
      active = i;
      items.forEach(function (li, k) { li.classList.toggle('is-active', k === i); });
      if (i >= 0) {
        control.setAttribute('aria-activedescendant', items[i].id);
        items[i].scrollIntoView({ block: 'nearest' });
      } else {
        control.removeAttribute('aria-activedescendant');
      }
    }

    function selectedIndex() {
      for (var i = 0; i < items.length; i++) {
        if (items[i].getAttribute('aria-selected') === 'true') return i;
      }
      return -1;
    }

    function open() {
      if (isOpen()) return;
      list.hidden = false;
      wrap.classList.add('is-open');
      control.setAttribute('aria-expanded', 'true');
      setActive(Math.max(selectedIndex(), 0));
    }

    function close() {
      if (!isOpen()) return;
      list.hidden = true;
      wrap.classList.remove('is-open');
      control.setAttribute('aria-expanded', 'false');
      setActive(-1);
    }

    // Вибір пункту: пишемо в справжній <select> і кажемо про це формі
    function choose(i) {
      var value = items[i].getAttribute('data-value');
      if (select.value !== value) {
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));   // main.js перевірить поле
      }
      sync();
      close();
      control.focus();
    }

    /* ---------- Миша й дотик ---------- */
    control.addEventListener('click', function () {
      if (isOpen()) close(); else open();
    });

    // mousedown не забирає фокус у поля — інакше спрацював би blur і список закрився б
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });

    // Делегування: один обробник на весь список
    list.addEventListener('click', function (e) {
      var li = e.target.closest('.cselect__option');
      if (li) choose(items.indexOf(li));
    });

    list.addEventListener('mousemove', function (e) {
      var li = e.target.closest('.cselect__option');
      if (li && items.indexOf(li) !== active) setActive(items.indexOf(li));
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target) && !(label && label.contains(e.target))) close();
    });

    /* ---------- Клавіатура ---------- */
    control.addEventListener('keydown', function (e) {
      var key = e.key;

      if (!isOpen()) {
        if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') {
          e.preventDefault();
          open();
        }
        return;
      }

      if (key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(active + 1, items.length - 1)); }
      else if (key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(active - 1, 0)); }
      else if (key === 'Home') { e.preventDefault(); setActive(0); }
      else if (key === 'End') { e.preventDefault(); setActive(items.length - 1); }
      else if (key === 'Enter' || key === ' ') { e.preventDefault(); if (active >= 0) choose(active); }
      else if (key === 'Escape') { e.preventDefault(); close(); }
      else if (key === 'Tab') { close(); }
    });

    control.addEventListener('blur', function () {
      setTimeout(function () {
        if (!wrap.contains(document.activeElement)) close();
      }, 0);
    });

    /* ---------- Зв'язок із формою ---------- */
    select.addEventListener('change', sync);
    if (select.form) {
      select.form.addEventListener('reset', function () { setTimeout(sync, 0); });
    }

    // main.js ставить aria-invalid на select — дублюємо на видиме поле для скрінрідера
    new MutationObserver(function () {
      control.setAttribute('aria-invalid', select.getAttribute('aria-invalid') || 'false');
    }).observe(select, { attributes: true, attributeFilter: ['aria-invalid'] });

    sync();
  }

  Array.prototype.forEach.call(document.querySelectorAll('select[data-cselect]'), enhance);
})();
