# FashionPlanner

Мини-CRM для специалистов бьюти-индустрии. Личный кабинет специалиста (записи,
услуги, график) + публичная страница онлайн-записи для клиентов.

**Стек:** React + Vite, Firebase (Auth + Firestore), хостинг на GitHub Pages.

## Роли

- **Специалист** — входит по email/паролю, ведёт услуги (название, цена, длительность),
  настраивает график работы, получает публичную ссылку, видит и создаёт записи.
- **Клиент** — открывает публичную ссылку (`#/b/<slug>`), выбирает услугу, видит
  свободные слоты, бронирует время. Аккаунт не нужен.

## Модель данных (Firestore)

```
specialists/{uid}                 профиль (публичное чтение)
specialists/{uid}/services/{id}   услуги (публичное чтение)
specialists/{uid}/slots/{id}      занятые интервалы без ПД (публичное чтение)
specialists/{uid}/bookings/{id}   записи с контактами (только владелец)
```

При записи клиент создаёт пару `slot` (публичный, без персональных данных) +
`booking` (с именем/телефоном, читает только специалист). Так свободное время
считается публично, а контакты клиентов не утекают наружу.

## Настройка Firebase

1. Создайте проект на <https://console.firebase.google.com>.
2. **Authentication** → Sign-in method → включите **Email/Password**.
3. **Firestore Database** → Create database (production mode).
4. Скопируйте правила из [`firestore.rules`](firestore.rules) во вкладку Rules → Publish.
5. **Project settings → Your apps → Web** → возьмите конфиг.

## Локальный запуск

```bash
npm install
cp .env.example .env   # вставьте ключи Firebase
npm run dev
```

## Деплой на GitHub Pages

1. В репозитории: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions** → добавьте секреты:
   `VITE_FB_API_KEY`, `VITE_FB_AUTH_DOMAIN`, `VITE_FB_PROJECT_ID`,
   `VITE_FB_STORAGE_BUCKET`, `VITE_FB_SENDER_ID`, `VITE_FB_APP_ID`.
3. Push в `main` — workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
   соберёт и опубликует сайт.
4. В Firebase **Authentication → Settings → Authorized domains** добавьте домен
   `<username>.github.io`.

Роутинг на `HashRouter` (`#/...`), поэтому отдельная настройка SPA-редиректов для
Pages не нужна.

## Ограничения MVP (что улучшить дальше)

- Защита от двойной записи — мягкая (повторная проверка перед записью), без транзакций.
- Один часовой пояс (локальный для браузера).
- Нет уведомлений (email/SMS) и статусов записей (подтверждена/отменена) в UI.
- Slug проверяется на уникальность мягко, без резервирования.
