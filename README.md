# Распродажа

Магазин распродажи женской и мужской одежды на Next.js.  
Сайт называется **«Распродажа»**.

## Возможности

- Разделы **Женщинам** / **Мужчинам**
- Каталог из `data/products.json` (поля: `priceEur`, `priceEurWas`, `imageUrls`)
- Цены в **рублях** (пересчёт из EUR по курсу ЦБ с коэффициентом; в UI показывается только ₽)
- Зачёркнутая старая цена, если задан `priceEurWas`
- Галерея фото на странице товара
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

## Структура

```
data/products.json     # каталог
src/app/               # страницы и API
src/components/        # UI
src/lib/               # товары, ЦБ, цены, корзина
```

Страницы: `/`, `/women`, `/men`, `/product/[id]`, `/cart`, `/checkout`, `/checkout/success`.

## Схема товара (`products.json`)

```json
{
  "id": "w-001",
  "titleRu": "…",
  "brand": "…",
  "category": "women",
  "priceEur": 39.99,
  "priceEurWas": 59.99,
  "sizes": ["S", "M", "L"],
  "imageUrls": ["https://…", "https://…"],
  "imageUrl": "https://…",
  "inStock": true
}
```

- `priceEur` — текущая (sale) цена в EUR  
- `priceEurWas` — цена до скидки (опционально)  
- `imageUrls` — все фото; `imageUrl` дублирует первое (для совместимости)

## TODO

- [ ] Обновление каталога по расписанию
- [ ] Реальная логистика и оплата
- [ ] Админка заказов
