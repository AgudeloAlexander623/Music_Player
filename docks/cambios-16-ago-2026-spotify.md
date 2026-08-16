# Cambios — 16 de agosto de 2026 (II): Spotify como catálogo + login social

## Objetivo

Hacer que **Spotify** deje de ser código muerto y pase a ser parte funcional del proyecto en dos frentes:

1. **Fuente de catálogo en segundo plano** (como Deezer): el plugin `spotify` se activa cuando hay credenciales válidas y sus resultados se mezclan con el resto de fuentes.
2. **Login/registro social con Spotify (OAuth Authorization Code, server-side)**: "Continuar con Spotify" en Login y Register.

**Decisión de producto** (confirmada con el usuario): Spotify y Deezer son solo catálogo de búsqueda (con previews de 30s); el único login social es Spotify.

---

## 1. Activación del plugin de Spotify como fuente de búsqueda

**Problema:** El plugin `services/plugins/spotify.plugin.js` estaba deshabilitado a propósito: `isAvailable()` devolvía siempre `false` y `search()` un array vacío. Además `routes/spotify.routes.js` (status/configure) nunca se montaba en `app.js`, así que la configuración de credenciales desde la UI no era accesible. El schema `configureSpotifySchema` de `validation.js` tampoco se usaba.

**Solución implementada:**

1. **`services/spotify.services.js`**:
   - `getClientId()` / `getClientSecret()` ahora son `export` (antes internas) para que el plugin y las rutas puedan consultar credenciales.
   - Nuevo `getSpotifyRedirectUri()` (lee `SPOTIFY_REDIRECT_URI` o default `http://localhost:4000/api/auth/spotify/callback`).
   - Nuevo `buildSpotifyAuthUrl(state)` → URL de `https://accounts.spotify.com/authorize` con `response_type=code`, scope `user-read-email user-read-private` y `state`.
   - Nuevos `exchangeSpotifyCode(code)` (token exchange `grant_type=authorization_code` con Basic auth) y `getSpotifyProfile(accessToken)` (GET `/v1/me`).
2. **`services/plugins/spotify.plugin.js`** — reescrito: `isAvailable()` = hay `clientId` y `clientSecret` reales (ignora placeholders `your_`); `search()` delega en `searchSpotify(query, limit, page)`.
3. **`app.js`** — se monta `app.use("/api/spotify", spotifyRoutes)`.
4. **`routes/spotify.routes.js`** — `POST /configure` usa ahora `validate(configureSpotifySchema, ...)` (elimina la validación manual duplicada y el código muerto del schema).

## 2. Login social con Spotify (OAuth Authorization Code)

**Flujo (todo server-side, sin PKCE):**

```
Frontend (Login/Register)                      Backend
        │  click "Continuar con Spotify"              │
        └─► window.location = /api/auth/spotify/login ─► genera state (Map en memoria, TTL 10min)
                                                        └─► 302 → accounts.spotify.com/authorize
        ┌─► redirect_uri=/api/auth/spotify/callback ──► valida state (anti-CSRF, uso único)
        │                                              ├─► exchange code → access_token
        │                                              ├─► GET /v1/me → profile
        │                                              ├─► upsertSpotifyUser (crea/vincula/actualiza)
        │                                              ├─► emite JWT + refresh token
        │                                              └─► 302 → FRONTEND_URL/auth/callback?token=...&user=...
        └─► SpotifyCallback.jsx guarda sesión en localStorage y navega a /
```

**Detalles de implementación:**

- **Estado OAuth** en memoria en `auth.service.js` (`Map` state → timestamp, TTL 10 min, limpieza perezosa). `consumeSpotifyState()` solo retorna `true` una vez por estado → protege contra CSRF y replay.
- **`upsertSpotifyUser(profile)`** — estrategia de 3 pasos:
  1. Ya existe usuario con `spotify_id` → login (actualiza `avatar_url` si cambió).
  2. No, pero existe usuario con el mismo `email` (cuenta email/password) → **accounts linking**: se le setea `spotify_id`.
  3. No existe → se crea cuenta nueva con `password_hash` aleatorio (el login por password le fallará siempre; solo entra por OAuth), `username` único derivado de `display_name`, y email fallback `${spotify_id}@spotify.local` si Spotify no entrega email.
- **BD**: columna `users.spotify_id VARCHAR(255)` + índice único parcial (`WHERE spotify_id IS NOT NULL`, permite múltiples NULL) + `users.avatar_url TEXT`.
- **Endpoints** (`auth.routes.js`, GET, dentro del router de auth):
  - `/api/auth/spotify/login` → `res.redirect(createSpotifyLoginUrl())`.
  - `/api/auth/spotify/callback` → valida state, intercambia code, obtiene perfil, upsert, emite JWT+refresh (se persiste en `refresh_tokens`), redirige al frontend. Errores → redirect a `/login?error=...`.
- **Frontend**:
  - `AuthContext.jsx`: nuevo `completeSocialLogin({ token, refreshToken, user })`.
  - Nueva página `pages/SpotifyCallback.jsx` + ruta `/auth/callback` en `App.jsx` (fuera de rutas protegidas).
  - Botón verde **"Continuar con Spotify"** en `Login.jsx` y `Register.jsx`.
  - Estilos `.auth-button-spotify` (verde `#1db954`) en `Auth.css`.
- **Env**: `.env.example`, `docker/docker-compose.yml`, `docker/docker-compose.dev.yml` y `docker/.env.example` ganan `SPOTIFY_REDIRECT_URI` y `FRONTEND_URL`.

## Tests

**Backend (`node --test`): 195/195 pass** (180 previos + 15 nuevos).

- `__tests__/spotify-auth.test.js` (**12 tests**): URL de autorización y su `redirect_uri`; roundtrip de `state` (uso único); rechazo de estados inválidos; `exchangeSpotifyCode` (éxito con tokens, error 400 sin credenciales, propagación de errores API); `getSpotifyProfile` (llama a `/v1/me` con `Bearer`); `upsertSpotifyUser` rechaza perfiles sin id sin tocar BD.
- `__tests__/spotify.plugin.test.js` (**6 tests**): metadata del plugin; `isAvailable` con credenciales reales / sin credenciales / con placeholders `your_`; `search` delega en `searchSpotify` y normaliza resultados.

**Frontend (`vitest run`): 30/30 pass** (27 previos + 3 nuevos).

- `__tests__/SpotifyCallback.test.jsx`: guarda `token`/`refresh_token`/`user` en localStorage; muestra error si Spotify devuelve `error`; muestra error si la respuesta no trae token.

**Lint:** Backend `npm run lint` **limpio** (se corrigieron los 4 `no-unused-vars` pre-existentes de `sqli.test.js`). Frontend: sin errores nuevos; persisten los 11 errores/4 warnings pre-existentes (`Player.jsx` refs en render + `YT` global, `ErrorBoundary.test.jsx`, `Dashboard.jsx` `handleAddFavorite` sin usar) — fuera del alcance de este cambio.

## Archivos modificados

- `BackEnd/src/services/spotify.services.js` — export de credenciales + helpers OAuth
- `BackEnd/src/services/plugins/spotify.plugin.js` — plugin activo y funcional
- `BackEnd/src/services/auth.service.js` — estado OAuth, `upsertSpotifyUser`, `getFrontendUrl`
- `BackEnd/src/controllers/auth.controller.js` — `spotifyLogin` + `spotifyCallback`
- `BackEnd/src/routes/auth.routes.js` — rutas `/spotify/login` y `/spotify/callback`
- `BackEnd/src/routes/spotify.routes.js` — usa `configureSpotifySchema`
- `BackEnd/src/app.js` — monta `/api/spotify`
- `BackEnd/src/db/DataBases.sql` — columnas `spotify_id`, `avatar_url` + índice único parcial
- `BackEnd/src/db/migrations/003_add_spotify_login.sql` — **nuevo**
- `BackEnd/src/__tests__/spotify-auth.test.js` y `spotify.plugin.test.js` — **nuevos**
- `BackEnd/src/__tests__/sqli.test.js` — imports sin uso eliminados (fix lint)
- `FrontEnd/mi-app/src/context/AuthContext.jsx` — `completeSocialLogin`
- `FrontEnd/mi-app/src/pages/SpotifyCallback.jsx` — **nuevo**
- `FrontEnd/mi-app/src/pages/Login.jsx` / `Register.jsx` — botón Spotify
- `FrontEnd/mi-app/src/pages/Auth.css` — estilos del botón
- `FrontEnd/mi-app/src/App.jsx` — ruta `/auth/callback`
- `FrontEnd/mi-app/src/__tests__/SpotifyCallback.test.jsx` — **nuevo**
- `.env.example`, `docker/docker-compose.yml`, `docker/docker-compose.dev.yml`, `docker/.env.example` — `SPOTIFY_REDIRECT_URI`, `FRONTEND_URL`

## Pasos para activarlo en local (requiere credenciales reales)

1. Crear una app en <https://developer.spotify.com/dashboard> (modo "Web API").
2. En la app, añadir la **Redirect URI**: `http://localhost:4000/api/auth/spotify/callback`.
3. En el `.env` raíz:
   ```bash
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   SPOTIFY_REDIRECT_URI=http://localhost:4000/api/auth/spotify/callback
   FRONTEND_URL=http://localhost:5173
   ```
4. Aplicar la migración de BD (después de 001 y 002):
   ```bash
   psql -U reproductor_user -d reproductor_db -h localhost \
        -f BackEnd/src/db/migrations/003_add_spotify_login.sql
   ```
5. Sin credenciales reales el plugin queda inactivo (no aparece en búsquedas) y el botón de login lleva a un error controlado → el resto de la app funciona igual.

## Limitaciones conocidas

- El estado OAuth vive en **memoria** del backend: en despliegue multi-instancia hay que moverlo a Redis/BD compartida (el flujo de código corto + redirect lo hace poco crítico, pero es un punto de escalabilidad).
- La búsqueda de Spotify usa el token **client credentials** (anónimo); no usa el token de usuario autenticado, por lo que la búsqueda en la app no depende del login social.
- El botón "Continuar con Spotify" redirige a `/api/...` relativo; en dev el proxy de Vite lo resuelve, en docker/nginx el `location /api` ya está cubierto.