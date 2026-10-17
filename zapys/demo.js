/* ==========================================================================
   Демо онлайн-запису: 4 кроки + «сповіщення» власнику.
   Нічого не надсилає — усе відбувається в браузері.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.getElementById('bookingForm');
  if (!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll('.bstep'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('[data-dot]'));
  var backBtn = document.getElementById('backBtn');
  var nextBtn = document.getElementById('nextBtn');
  var errorEl = document.getElementById('bookingError');
  var daysEl = document.getElementById('days');
  var slotsEl = document.getElementById('slots');
  var summaryEl = document.getElementById('summary');
  var doneEl = document.getElementById('bookingDone');
  var doneText = document.getElementById('doneText');
  var tgBody = document.getElementById('tgBody');
  var restartBtn = document.getElementById('restartBtn');

  // form.name — це атрибут самої форми, тому поля беремо через elements
  var nameInput = form.elements.namedItem('name');
  var phoneInput = form.elements.namedItem('phone');
  var current = 0;          // індекс поточного кроку (0–3)
  var HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  var DAYS_AHEAD = 7;

  /* ---------- Допоміжне ---------- */
  function checked(name) {
    return form.querySelector('input[name="' + name + '"]:checked');
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function dayDate(offset) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d;
  }

  function dayLabel(offset) {
    if (offset === 0) return 'Сьогодні';
    if (offset === 1) return 'Завтра';
    return dayDate(offset).toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric' });
  }

  // «18 жовтня»
  function dateText(offset) {
    return dayDate(offset).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
  }

  // «18 жовтня (неділя), 15:00» — день тижня в дужках, щоб не відмінювати його
  function whenText() {
    var offset = Number(checked('day').value);
    var weekday = dayDate(offset).toLocaleDateString('uk-UA', { weekday: 'long' });
    return dateText(offset) + ' (' + weekday + '), ' + checked('time').value;
  }

  // Імітація зайнятих слотів: стабільна для однакових дня, майстра й години,
  // тож при поверненні на крок розклад не «перемішується».
  function isBusy(offset, master, hour) {
    var seed = offset * 31 + hour * 7;
    for (var i = 0; i < master.length; i++) seed += master.charCodeAt(i);
    var anyMaster = master === 'Будь-який майстер';
    return seed % (anyMaster ? 5 : 3) === 0;
  }

  // Радіо-кнопка у вигляді «чипа»: <label><input><span>текст</span></label>
  function makeChip(name, value, text, disabled) {
    var label = document.createElement('label');
    label.className = 'chip';
    var input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.disabled = disabled;
    var span = document.createElement('span');
    span.textContent = text;
    if (disabled) span.setAttribute('aria-label', text + ', зайнято');
    label.appendChild(input);
    label.appendChild(span);
    return label;
  }

  /* ---------- Крок 3: дні й години ---------- */
  function renderDays() {
    if (daysEl.children.length) return;
    for (var i = 0; i < DAYS_AHEAD; i++) {
      daysEl.appendChild(makeChip('day', String(i), dayLabel(i), false));
    }
    daysEl.querySelector('input').checked = true;
  }

  function renderSlots() {
    var day = checked('day');
    var master = checked('master');
    if (!day || !master) return;

    var offset = Number(day.value);
    var nowHour = new Date().getHours();
    var picked = checked('time');            // зберігаємо вибір при поверненні на крок
    var pickedValue = picked ? picked.value : '';
    slotsEl.textContent = '';

    HOURS.forEach(function (hour) {
      var past = offset === 0 && hour <= nowHour;
      var busy = past || isBusy(offset, master.value, hour);
      var chip = makeChip('time', pad(hour) + ':00', pad(hour) + ':00', busy);
      var input = chip.querySelector('input');
      if (!busy && input.value === pickedValue) input.checked = true;
      slotsEl.appendChild(chip);
    });

    if (!slotsEl.querySelector('input:not(:disabled)')) {
      var empty = document.createElement('p');
      empty.className = 'booking__hint';
      empty.textContent = 'На цей день вільного часу немає — оберіть інший.';
      slotsEl.appendChild(empty);
    }
  }

  // Новий день — інший розклад, тому вибраний час скидаємо
  daysEl.addEventListener('change', function () {
    var picked = checked('time');
    if (picked) picked.checked = false;
    renderSlots();
  });

  /* ---------- Крок 4: підсумок ---------- */
  function renderSummary() {
    var service = checked('service');
    var rows = [
      ['Послуга', service.value + ' — ' + service.getAttribute('data-price') + ' ₴'],
      ['Майстер', checked('master').value],
      ['Коли', whenText()]
    ];
    summaryEl.textContent = '';
    rows.forEach(function (row) {
      var dt = document.createElement('dt');
      dt.textContent = row[0];
      var dd = document.createElement('dd');
      dd.textContent = row[1];
      summaryEl.appendChild(dt);
      summaryEl.appendChild(dd);
    });
  }

  /* ---------- Перевірка кроку ---------- */
  function validate(index) {
    if (index === 0 && !checked('service')) return 'Оберіть послугу';
    if (index === 1 && !checked('master')) return 'Оберіть майстра';
    if (index === 2 && !checked('time')) return 'Оберіть вільний час';
    if (index === 3) {
      if (nameInput.value.trim().length < 2) return 'Вкажіть ім\'я';
      if (phoneInput.value.replace(/\D/g, '').length < 10) return 'Вкажіть телефон, наприклад 067 123 45 67';
    }
    return '';
  }

  /* ---------- Перемикання кроків ---------- */
  function showStep(index) {
    current = index;
    steps.forEach(function (step, i) { step.hidden = i !== index; });

    dots.forEach(function (dot, i) {
      dot.classList.toggle('is-done', i < index);
      if (i === index) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });

    backBtn.hidden = index === 0;
    nextBtn.textContent = index === steps.length - 1 ? 'Записатись' : 'Далі';
    errorEl.textContent = '';

    if (index === 2) { renderDays(); renderSlots(); }
    if (index === 3) renderSummary();

    // Фокус на заголовок кроку — скрінрідер одразу зачитає, де ми
    steps[index].querySelector('.bstep__title').focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var error = validate(current);
    if (error) {
      errorEl.textContent = error;
      return;
    }
    if (current < steps.length - 1) showStep(current + 1);
    else finish();
  });

  backBtn.addEventListener('click', function () {
    if (current > 0) showStep(current - 1);
  });

  // Зміна майстра скидає вибраний час: у іншого майстра інший розклад
  form.addEventListener('change', function (e) {
    if (e.target.name === 'master') slotsEl.textContent = '';
    errorEl.textContent = '';
  });

  /* ---------- Фінал: «сповіщення» власнику ---------- */
  function line(label, value) {
    var p = document.createElement('p');
    var b = document.createElement('b');
    b.textContent = label + ': ';
    p.appendChild(b);
    p.appendChild(document.createTextNode(value));
    return p;
  }

  function finish() {
    var service = checked('service');
    var name = nameInput.value.trim();

    var msg = document.createElement('div');
    msg.className = 'tg__msg';
    var title = document.createElement('p');
    title.className = 'tg__title';
    title.textContent = '🔔 Новий запис';
    msg.appendChild(title);
    msg.appendChild(line('Послуга', service.value + ' — ' + service.getAttribute('data-price') + ' ₴'));
    msg.appendChild(line('Майстер', checked('master').value));
    msg.appendChild(line('Коли', whenText()));
    msg.appendChild(line('Клієнт', name + ', ' + phoneInput.value.trim()));
    var time = document.createElement('span');
    time.className = 'tg__time';
    var now = new Date();
    time.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
    msg.appendChild(time);

    tgBody.textContent = '';
    tgBody.appendChild(msg);

    doneText.textContent = name + ', чекаємо вас ' + dateText(Number(checked('day').value)) + ' о ' + checked('time').value + '.';
    form.hidden = true;
    dots.forEach(function (dot) { dot.classList.add('is-done'); dot.removeAttribute('aria-current'); });
    doneEl.hidden = false;
    doneEl.focus();
  }

  restartBtn.addEventListener('click', function () {
    form.reset();
    daysEl.textContent = '';
    slotsEl.textContent = '';
    tgBody.innerHTML = '<p class="tg__empty">Сповіщення з\'явиться тут, щойно ви завершите запис.</p>';
    doneEl.hidden = true;
    form.hidden = false;
    showStep(0);
  });
})();
