/* ==========================================================================
   Демо онлайн-запису: послуга → майстер → дата й час → успіх.
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
  var doneEl = document.getElementById('bookingDone');
  var summaryEl = document.getElementById('doneSummary');
  var tgBody = document.getElementById('tgBody');
  var restartBtn = document.getElementById('restartBtn');

  var HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  var DAYS_AHEAD = 7;
  var ERRORS = ['Оберіть послугу', 'Оберіть майстра', 'Оберіть вільний час'];
  var TG_EMPTY = tgBody.innerHTML;     // запам'ятовуємо, щоб повернути при «Пройти ще раз»

  var current = 0;                     // індекс поточного кроку: 0, 1, 2

  /* ---------- Допоміжне ---------- */
  function checked(name) {
    return form.querySelector('input[name="' + name + '"]:checked');
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  // Дата через offset днів від сьогодні
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

  // «19 жовтня (понеділок)» — день тижня в дужках, щоб не відмінювати його
  function dateText(offset) {
    var d = dayDate(offset);
    return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' }) +
      ' (' + d.toLocaleDateString('uk-UA', { weekday: 'long' }) + ')';
  }

  // Імітація зайнятих годин. Результат стабільний для того самого дня,
  // майстра й години — розклад не «перемішується» при поверненні на крок.
  function isBusy(offset, master, hour) {
    var seed = offset * 31 + hour * 7;
    for (var i = 0; i < master.length; i++) seed += master.charCodeAt(i);
    return seed % (master === 'Будь-який майстер' ? 5 : 3) === 0;
  }

  // Чип = прихована радіокнопка + підпис: <label><input><span>…</span></label>
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
    if (daysEl.children.length) return;          // дні малюємо один раз
    for (var i = 0; i < DAYS_AHEAD; i++) {
      daysEl.appendChild(makeChip('day', String(i), dayLabel(i), false));
    }
    daysEl.querySelector('input').checked = true; // за замовчуванням — сьогодні
  }

  function renderSlots() {
    var day = checked('day');
    var master = checked('master');
    if (!day || !master) return;

    var offset = Number(day.value);
    var nowHour = new Date().getHours();
    var picked = checked('time');                // зберігаємо вибір, якщо час досі вільний
    var pickedValue = picked ? picked.value : '';
    slotsEl.textContent = '';

    HOURS.forEach(function (hour) {
      var time = pad(hour) + ':00';
      var busy = (offset === 0 && hour <= nowHour) || isBusy(offset, master.value, hour);
      var chip = makeChip('time', time, time, busy);
      if (!busy && time === pickedValue) chip.querySelector('input').checked = true;
      slotsEl.appendChild(chip);
    });

    if (!slotsEl.querySelector('input:not(:disabled)')) {
      var empty = document.createElement('p');
      empty.className = 'booking__hint';
      empty.textContent = 'На цей день вільного часу немає — оберіть інший.';
      slotsEl.appendChild(empty);
    }
  }

  /* ---------- Делегування: один обробник на всю форму ----------
     Подія change спливає від будь-якої радіокнопки — картки послуги,
     майстра, чипа дня чи години. Тому не вішаємо обробник на кожну. */
  form.addEventListener('change', function (e) {
    errorEl.textContent = '';
    if (e.target.name === 'day') {
      var time = checked('time');
      if (time) time.checked = false;            // інший день — інший розклад
      renderSlots();
    }
  });

  /* ---------- Перемикання кроків через hidden ---------- */
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

    // Фокус на заголовок кроку — скрінрідер одразу зачитає, де ми
    steps[index].querySelector('.bstep__title').focus();
  }

  // «Далі» — це submit: так працює і клік, і Enter з клавіатури
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var required = ['service', 'master', 'time'][current];
    if (!checked(required)) {
      errorEl.textContent = ERRORS[current];
      return;
    }
    if (current < steps.length - 1) showStep(current + 1);
    else finish();
  });

  backBtn.addEventListener('click', function () {
    if (current > 0) showStep(current - 1);
  });

  /* ---------- Крок 4: успішний запис ---------- */
  function addRow(list, label, value) {
    var dt = document.createElement('dt');
    dt.textContent = label;
    var dd = document.createElement('dd');
    dd.textContent = value;
    list.appendChild(dt);
    list.appendChild(dd);
  }

  function finish() {
    var service = checked('service');
    var rows = [
      ['Послуга', service.value + ' — ' + service.getAttribute('data-price') + ' ₴'],
      ['Майстер', checked('master').value],
      ['Дата', dateText(Number(checked('day').value))],
      ['Час', checked('time').value]
    ];

    // Підсумок для клієнта
    summaryEl.textContent = '';
    rows.forEach(function (row) { addRow(summaryEl, row[0], row[1]); });

    // «Сповіщення» для власника в макеті Telegram
    var msg = document.createElement('div');
    msg.className = 'tg__msg';
    var title = document.createElement('p');
    title.className = 'tg__title';
    title.textContent = '🔔 Новий запис';
    msg.appendChild(title);
    rows.forEach(function (row) {
      var p = document.createElement('p');
      var b = document.createElement('b');
      b.textContent = row[0] + ': ';
      p.appendChild(b);
      p.appendChild(document.createTextNode(row[1]));
      msg.appendChild(p);
    });
    var stamp = document.createElement('span');
    stamp.className = 'tg__time';
    var now = new Date();
    stamp.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
    msg.appendChild(stamp);
    tgBody.textContent = '';
    tgBody.appendChild(msg);

    // Ховаємо форму, показуємо екран успіху
    form.hidden = true;
    dots.forEach(function (dot) {
      dot.classList.add('is-done');
      dot.removeAttribute('aria-current');
    });
    doneEl.hidden = false;
    doneEl.focus();
  }

  restartBtn.addEventListener('click', function () {
    form.reset();
    daysEl.textContent = '';
    slotsEl.textContent = '';
    tgBody.innerHTML = TG_EMPTY;
    doneEl.hidden = true;
    form.hidden = false;
    showStep(0);
  });
})();
