/* ==========================================================================
   Cloudflare Worker: заявка з форми сайту → Telegram-бот.

   Токен і chat_id тут НЕ пишемо — вони лежать у секретах Worker-а:
     TELEGRAM_TOKEN    — токен бота від @BotFather          (Secret)
     TELEGRAM_CHAT_ID  — куди слати заявки                   (Secret)
     ALLOWED_ORIGINS   — з яких сайтів приймати запити, через кому (Text):
                         https://kopchuk-creator.github.io,http://localhost:4321
   ========================================================================== */

// Сайт надсилає тільки номер пакета — назву й ціну підставляємо тут,
// щоб через форму не можна було прислати довільний текст.
const PACKAGES = {
  '1': 'Лендинг із записом — 15 000 ₴',
  '2': 'Сайт закладу — 25 000 ₴',
  '3': 'Сайт із замовленнями — 40 000 ₴',
  '0': 'Ще не знаю — порадьте'
};

const MAX_LENGTH = { name: 100, phone: 30, message: 1000, page: 300 };

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const originOk = allowed.includes(origin);

    const cors = {
      'Access-Control-Allow-Origin': originOk ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };

    const reply = (status, body) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
      });

    // Браузер перед POST з JSON питає дозволу (preflight) — відповідаємо
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: originOk ? 204 : 403, headers: cors });
    }
    if (request.method !== 'POST') return reply(405, { ok: false, error: 'method' });
    if (!originOk) return reply(403, { ok: false, error: 'origin' });

    let data;
    try {
      data = await request.json();
    } catch {
      return reply(400, { ok: false, error: 'json' });
    }

    // Пастка для ботів: людина це поле не заповнює.
    // Відповідаємо «успіхом», щоб бот не здогадався, але нічого не шлемо.
    if (data.website) return reply(200, { ok: true });

    const clean = (value, max) => String(value ?? '').trim().slice(0, max);
    const name = clean(data.name, MAX_LENGTH.name);
    const phone = clean(data.phone, MAX_LENGTH.phone);
    const message = clean(data.message, MAX_LENGTH.message);
    const page = clean(data.page, MAX_LENGTH.page);
    const packageName = PACKAGES[String(data.package)];

    // Та сама перевірка, що й у браузері: її можна обійти, а тут — ні
    const digits = phone.replace(/\D/g, '');
    if (name.length < 2 || digits.length < 9 || digits.length > 15 || !packageName) {
      return reply(422, { ok: false, error: 'validation' });
    }

    if (!env.TELEGRAM_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return reply(500, { ok: false, error: 'config' });
    }

    const lines = [
      '🔔 Нова заявка з сайту',
      '',
      `Ім'я: ${name}`,
      `Телефон: ${phone}`,
      `Пакет: ${packageName}`
    ];
    if (message) lines.push(`Коментар: ${message}`);
    if (page) lines.push('', `Сторінка: ${page}`);

    // Без parse_mode: текст іде як є, HTML чи Markdown у полях нічого не зламають
    const tg = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: lines.join('\n') })
    });
    const tgData = await tg.json().catch(() => ({}));

    if (!tg.ok || !tgData.ok) return reply(502, { ok: false, error: 'telegram' });
    return reply(200, { ok: true });
  }
};
