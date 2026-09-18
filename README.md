# Распродажа

Магазин распродажи женской и мужской одежды на Next.js.  
Сайт называется **«Распродажа»**.

## Возможности

- Разделы **Женщинам** / **Мужчинам** с подкатегориями (чипы и маршруты `/women/[slug]`, `/men/[slug]`)
- Каталог из `data/products.json` (sale EUR &gt; 50, ~100 товаров)
- Цены в **рублях**: `RUB = priceEur × курс ЦБ EUR × 2.0` (в UI только ₽)
- Фиксированная доставка **2990 ₽** (корзина, checkout, письмо/API)
- Зачёркнутая старая цена, если задан `priceEurWas`
- Описание, материал, галерея на странице товара
- Сортировка и фильтры (бренд, размер, материал, диапазон цены)
- Корзина в `localStorage` (размер, количество)
- Оформление заказа → `POST /api/order` → письмо через Resend (если заданы env), иначе soft-fail с логом

## Стек

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Resend (опционально)

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # при необходимости заполните ключи
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

Продакшен-сборка:

```bash
npm run build
npm start
```

## Переменные окружения

| Переменная | Обязательно | Описание |
|---|---|---|
| `RESEND_API_KEY` | нет | API-ключ Resend для писем о заказах |
| `ORDER_TO_EMAIL` | нет* | Email получателя заказов (*нужен вместе с ключом) |
| `ORDER_FROM_EMAIL` | нет | Отправитель (по умолчанию `onboarding@resend.dev`) |

Если ключи не заданы, заказ всё равно принимается: данные пишутся в лог сервера.

## Цены и доставка

- Коэффициент пересчёта: **× 2.0** к курсу ЦБ EUR
- Доставка: **2990 ₽** фиксированно, добавляется к сумме товаров
- В интерфейсе покупателя **не** показываются EUR, курс и формула — только рубли

## Структура

```
data/products.json          # каталог
data/category_sources.json  # источники подкатегорий About You
data/SCRAPE_STATS.json      # статистика скрапинга
scripts/scrape_aboutyou.py  # обновление каталога
src/app/                    # страницы и API
src/components/             # UI
src/lib/                    # товары, ЦБ, цены, корзина
```

Страницы: `/`, `/women`, `/women/[slug]`, `/men`, `/men/[slug]`, `/product/[id]`, `/cart`, `/checkout`, `/checkout/success`.

## Схема товара (`products.json`)

```json
{
  "id": "10261840",
  "titleRu": "…",
  "brand": "…",
  "category": "women",
  "categorySlug": "saty",
  "categoryNameRu": "Платья",
  "priceEur": 79.99,
  "priceEurWas": 129.99,
  "sizes": ["S", "M", "L"],
  "imageUrls": ["https://…"],
  "imageUrl": "https://…",
  "descriptionRu": "…",
  "material": "хлопок",
  "materials": ["хлопок"],
  "inStock": true
}
```

## Обновление каталога

```bash
python3 -m venv .venv && .venv/bin/pip install deep-translator
.venv/bin/python scripts/scrape_aboutyou.py
```

Только товары с sale `priceEur > 50`, цель ~50 женщин / ~50 мужчин по подкатегориям из `category_sources.json`.

## TODO

- [ ] Обновление каталога по расписанию
- [ ] Реальная логистика и оплата
- [ ] Админка заказов
