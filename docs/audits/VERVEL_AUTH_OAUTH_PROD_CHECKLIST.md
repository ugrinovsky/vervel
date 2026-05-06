# Vervel — Auth/OAuth production checklist

Дата: 2026-05-06  
Цель: чтобы cookie-based auth и OAuth стабильно работали в production (включая VK Mini App), и чтобы конфиг не “случайно” открыл лишнее.

Связано с кодом:
- API cookie: `apps/api/app/utils/auth_cookie.ts`
- OAuth: `apps/api/app/controllers/oauth_controller.ts`
- CORS: `apps/api/config/cors.ts`
- Web axios: `apps/web/src/api/http/baseApi.ts` (`withCredentials: true`)

---

## 1) Домены и схема (самое важное)

- **API обязан быть на HTTPS** в production.
- `APP_URL` — **web** адрес (например `https://vervel.ru`), **без trailing slash**.
- OAuth redirect URIs у провайдеров должны указывать на API callback:
  - `VK_REDIRECT_URI = https://<api-domain>/oauth/vk/callback`
  - `YANDEX_REDIRECT_URI = https://<api-domain>/oauth/yandex/callback`

---

## 2) CORS (браузер ↔ API)

### Production
- `CORS_ALLOWED_ORIGINS` **обязательно заполнить** (через запятую):  
  пример: `https://vervel.ru,https://www.vervel.ru`
- Если пусто, то в production CORS для браузера выключен (`origin=false`) и web не сможет ходить в API с cookie.

### VK Mini App (iframe)
- Добавить origins VK:
  - `https://vk.com`
  - `https://m.vk.com`
  - при необходимости `https://web.vk.me`

---

## 3) Cookies и SameSite

### Обычный web (web и API на ваших доменах)
- Оставить `AUTH_COOKIE_SAME_SITE` пустым (дефолт `lax`) — обычно это правильный баланс.

### VK Mini App (third-party cookie контекст)
- Установить: `AUTH_COOKIE_SAME_SITE=none`
- Это заставит `auth_token` cookie стать `SameSite=None; Secure`, иначе браузер не будет прикреплять cookie внутри iframe.

Важно: в режиме `none` обязательно **HTTPS** и корректные CORS origins.

---

## 4) OAuth безопасность (что должно быть включено)

- OAuth `state` включён и проверяется (защита от CSRF) — реализовано в `OAuthController`.
- `POST /oauth/set-role` должен быть **только для авторизованного пользователя** и запрещать менять чужой `userId` — реализовано.

---

## 5) Быстрый smoke test (перед релизом)

- Web → API: логин email/password → `GET /profile` успешен, cookie выставилась.
- OAuth VK/Yandex redirect → callback → редирект на `${APP_URL}/auth/callback` → пользователь попадает в app.
- Новый OAuth user без роли → `${APP_URL}/select-role?userId=...` → setRole → переход в `/onboarding`.
- В prod: открыть DevTools → убедиться, что `auth_token` cookie `HttpOnly`, `Secure`, `SameSite` соответствует окружению.

---

## 6) Примечание про TTL токенов (security debt)

Сейчас API выпускает access tokens с **явным TTL 30 дней** (см. `DbAccessTokensProvider.forModel(User, { expiresIn: '30 days' })`).  
Cookie `auth_token` тоже живёт **30 дней** (см. `COOKIE_TTL`).

Если нужен более строгий security-профиль:
- ввести явный TTL access tokens и ротацию (и синхронизировать с cookie TTL),
- добавить принудительный logout всех сессий при смене пароля/подозрении на компрометацию.

