# Чеклист запуску сайту

Порядок важливий: спершу Worker, потім живий тест форми, і лише після цього — SEO.

---

## 1. Деплой Worker-а (Cloudflare)

> Назви кнопок у панелі Cloudflare можуть трохи відрізнятись.

- [ ] **Бот і chat_id**
  - У @BotFather: `/newbot` → скопіювати токен.
  - Написати своєму боту будь-що (інакше він не зможе вам писати).
  - Відкрити `https://api.telegram.org/bot<ТОКЕН>/getUpdates` → chat_id — число в `"chat":{"id": …}`.

- [ ] **Створити Worker**
  - Workers & Pages → Create → Worker → назва, напр. `agency-form` → Deploy.
  - Edit code → видалити стандартний код → вставити весь `worker/contact-worker.js` → Deploy.

- [ ] **Секрети та змінні:** Worker → Settings → Variables and Secrets → Add

  | Назва | Тип | Значення |
  |---|---|---|
  | `TELEGRAM_TOKEN` | **Secret** | токен бота |
  | `TELEGRAM_CHAT_ID` | **Secret** | ваш chat_id |
  | `ALLOWED_ORIGINS` | Text | `https://kopchuk-creator.github.io` |

  ⚠️ У `ALLOWED_ORIGINS` — тільки домен, **без** `/agency-site` і без `/` в кінці.
  Для локальних тестів можна додати через кому `http://localhost:4321`.

- [ ] **Адреса для `CONTACT_ENDPOINT`** — на сторінці Worker-а (Overview або Domains & Routes):
  `https://agency-form.<ваш-акаунт>.workers.dev`

- [ ] **Перевірити Worker до того, як чіпати сайт:**

  ```bash
  curl -i -X POST "https://agency-form.ВАШ-АКАУНТ.workers.dev" -H "Origin: https://kopchuk-creator.github.io" -H "Content-Type: application/json" -d "{\"name\":\"Тест\",\"phone\":\"0670000000\",\"package\":\"1\"}"
  ```

  Очікується `200 {"ok":true}` і заявка в Telegram.

---

## 2. Живий тест форми

- [ ] У `main.js` вписати адресу Worker-а:

  ```js
  var CONTACT_ENDPOINT = 'https://agency-form.ВАШ-АКАУНТ.workers.dev';
  ```

- [ ] Закомітити й відправити на GitHub, почекати 1–10 хв.
- [ ] Відкрити https://kopchuk-creator.github.io/agency-site/zapys/#kontakty (Ctrl+F5) → надіслати заявку.
- [ ] На сайті «Дякуємо!», у Telegram — заявка.
- [ ] Перевірити кнопку «Замовити» на «Роботи та ціни» — пакет має підставитись у форму.

**Якщо помилка** — F12 → Console → рядок `[contactForm] Worker: …`

| У консолі | Причина | Що зробити |
|---|---|---|
| `origin` | неправильний `ALLOWED_ORIGINS` | тільки `https://kopchuk-creator.github.io` |
| `config` | секрети не збережені | додати секрети, ще раз Deploy |
| `telegram` | неправильний токен / chat_id або не писали ботові | пункт «Бот і chat_id» |
| `Failed to fetch` | неправильна адреса або Worker не задеплоєний | перевірити `CONTACT_ENDPOINT` і curl вище |
| `AbortError` | Worker не відповів за 10 с | логи Worker-а в Cloudflare |

---

## 3. SEO-запуск (тільки після успішного тесту форми)

- [ ] **Прибрати `noindex`**

  | Файл | Зараз | Дія |
  |---|---|---|
  | `index.html` | `noindex, nofollow` | **видалити** (разом із коментарем «РЕЖИМ МАКЕТА» над ним) |
  | `roboty/index.html` | `noindex, nofollow` | **видалити** |
  | `zapys/index.html` | `noindex, nofollow` | **видалити** |
  | `polityka-konfidentsiynosti/index.html` | `noindex, follow` | можна залишити |
  | `publichna-oferta/index.html` | `noindex, follow` | можна залишити |

  Рядок, який видаляємо:

  ```html
  <meta name="robots" content="noindex, nofollow">
  ```

- [ ] **Canonical** у `<head>` кожної основної сторінки (у `index.html` замінити закоментований рядок з `ВАШ-ДОМЕН.ua`):

  ```html
  <link rel="canonical" href="https://kopchuk-creator.github.io/agency-site/">
  <link rel="canonical" href="https://kopchuk-creator.github.io/agency-site/roboty/">
  <link rel="canonical" href="https://kopchuk-creator.github.io/agency-site/zapys/">
  ```

- [ ] **Title і description**
  - Замінити тимчасову назву «Агенція» на справжню: у `<title>` («… | Агенція»), у JSON-LD («Веб-агенція»), у логотипі.
  - Title — до ~60 символів, description — до ~155. Title головної зараз задовгий, напр.:
    «Сайти з онлайн-записом для барбершопів і салонів | [НАЗВА]».

- [ ] **Плейсхолдери** — знайти й замінити в усіх HTML: `[ТВІЙ ТЕЛЕФОН]`, `[ТВІЙ EMAIL]`, `[ТВІЙ TELEGRAM]`, `[ТВІЙ INSTAGRAM]`, `[РЕКВІЗИТИ ФОП]`.
  У `tel:` і `viber://` — тільки цифри: `+380XXXXXXXXX`.

- [ ] **`og:image`** — у `index.html` закоментований, файлу `og.jpg` немає. Без нього посилання в соцмережах буде без картинки (потрібна 1200×630).

- [ ] **robots.txt і sitemap.xml**
  - На `github.io/agency-site/` пошуковики шукають `robots.txt` лише в корені домену, тож файл у цій папці нічого не дасть.
  - `sitemap.xml` з трьома сторінками можна покласти в проєкт і подати вручну в Google Search Console.

- [ ] **Google Search Console** — додати сайт, подати sitemap, попросити проіндексувати головну.

- [ ] **Фінальний коміт і push.**
