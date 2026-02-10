# Cinara.ru (Синара)

Скелет SaaS-платформы для учителей китайского языка: методики, уроки, расписание, ДЗ и коммуникации.

## Локальный запуск

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Переменные окружения

Скопируйте файл `.env.example` в `.env.local` и заполните значения.

```bash
cp .env.example .env.local
```

## Supabase

1. Установите Supabase CLI.
2. Создайте проект и получите URL/ключи.
3. Примените миграции:

```bash
supabase start
supabase db reset
```

### Storage buckets

Создайте приватные buckets:
- `cinara-content`
- `branding-assets`

### Signed URLs

Приватные assets из `cinara-content` и `branding-assets` должны раздаваться через серверный endpoint с проверкой прав (см. `app/api/storage/sign/route.ts`).

## Скрипты

- `npm run dev` — dev-сервер
- `npm run build` — production build
- `npm run start` — запуск production сборки
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript
