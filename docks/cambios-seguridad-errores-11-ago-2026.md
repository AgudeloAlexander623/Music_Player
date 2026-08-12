# Cambios — 11 de agosto de 2026

## Corrección: fuga de información interna en respuestas HTTP 500

**Severidad:** ALTA (seguridad)

**Problema:** Los errores inesperados (HTTP 500) devolvían al cliente el `error.message` interno en el campo `details`. Ese mensaje puede contener información sensible: rutas del disco (`/home/...`), consultas SQL, nombres de tablas, IPs internas de bases de datos (`connection refused at 172.17.0.2:5432`) o mensajes de librerías (jsonwebtoken, pg, etc.). Un atacante puede usarlo para mapear la arquitectura del backend y planear ataques.

La fuga estaba en **más de 30 puntos**:

| Archivo | Dónde | Qué filtraba |
|---|---|---|
| `middleware/verifyToken.js` | catch de 500 | `error.message` |
| `app.js` | error handler global | `err.message` |
| `controllers/auth.controller.js` | 5 catch blocks | `error.message` |
| `controllers/favorites.controller.js` | 3 catch blocks | `error.message` |
| `controllers/playlists.controller.js` | 7 catch blocks | `error.message` |
| `controllers/search.controller.js` | catch de 500 | `error.message` |
| `controllers/recommendations.controller.js` | 2 catch blocks | `error.message` |

**Solución implementada:**

1. **Punto único de verdad en `utils/errors.js`:** se reescribió `formatErrorResponse` con una política explícita:
   - Errores **4xx** (AppError): el mensaje es intencional y seguro, se expone tal cual en `error`.
   - Errores **5xx** (inesperados): se responde `{ error: 'Internal server error' }`. En **producción** el detalle es genérico (`'Ocurrió un error inesperado'`); en **desarrollo** se muestra el detalle real para depurar.
   - Se agregó el helper `sendErrorResponse(res, error)` para que los controllers no repitan la lógica.

2. **`app.js`:** el error handler global ahora usa `formatErrorResponse`; el detalle real (con stack) solo va al log.

3. **`middleware/verifyToken.js`:** los errores que no son 401 ya no responden 500 localmente; se delegan al handler global con `next(error)`.

4. **Controllers:** todos los catch blocks se unificaron a `logger.error(...) + sendErrorResponse(res, error)`. El contrato del frontend se mantiene: para errores 4xx, `data.error` sigue siendo el mensaje legible (lo usan `Login.jsx` y `Register.jsx`).

5. **Tests (`__tests__/errors.test.js`):** se actualizaron al nuevo contrato, incluyendo casos para producción (oculta detalle) y desarrollo (expone detalle).

**Archivos modificados:**
- `BackEnd/src/utils/errors.js` — `formatErrorResponse` saneado por entorno + helper `sendErrorResponse`
- `BackEnd/src/app.js` — handler global centralizado
- `BackEnd/src/middleware/verifyToken.js` — delega no-401 a `next(error)`
- `BackEnd/src/controllers/auth.controller.js`
- `BackEnd/src/controllers/favorites.controller.js`
- `BackEnd/src/controllers/playlists.controller.js`
- `BackEnd/src/controllers/search.controller.js`
- `BackEnd/src/controllers/recommendations.controller.js`
- `BackEnd/src/__tests__/errors.test.js` — tests actualizados

**Verificación:** `npm test` → 173/173 pass. `npm run lint` → sin errores en archivos modificados (los 4 errores restantes son pre-existentes en `__tests__/sqli.test.js`).

**Cómo verificar manualmente:**
```bash
# Desarrollo: muestra el detalle real
NODE_ENV=development npm run dev
curl http://localhost:4000/api/favorites  # sin token válido → 500 con detalle

# Producción: oculta el detalle
NODE_ENV=production npm start
curl http://localhost:4000/api/favorites  # → { error: 'Internal server error', details: 'Ocurrió un error inesperado' }
```

---

## Corrección: errores sin statusCode 401 se respondían como 500

**Severidad:** MEDIA-ALTA (clasificación incorrecta de errores de autenticación)

**Problema:** En `middleware/verifyToken.js` la clasificación de errores era binaria y frágil:

```js
if (error.statusCode === 401) { ... }  // problema del cliente
return next(error);                    // todo lo demás → 500
```

El mapeo 401/500 lo hacía `auth.service.js:verifyToken()` comparando **nombres de error hardcodeados** de `jsonwebtoken` (`TokenExpiredError`, `JsonWebTokenError`). Cualquier error de la librería fuera de esos nombres — por ejemplo `NotBeforeError` (token usado antes de su fecha `nbf`) — caía en el 500. Resultado: problemas **del cliente** (token inválido) se reportaban como **Internal server error**, confundiendo al frontend y disparando alertas de monitoreo por fallos que no eran del servidor.

**Solución implementada (1 + 2):**

1. **`auth.service.js` — el servicio es la única fuente de verdad:** se reemplazó la comparación por nombre con `error instanceof jwt.JsonWebTokenError`, que cubre todas las subclases (`TokenExpiredError`, `NotBeforeError`, etc.) → siempre `401` para problemas del token. Solo lo genuinamente inesperado (o `JWT_SECRET` ausente) es `500`.

2. **`middleware/verifyToken.js` — deja de clasificar:** el `catch` ahora solo loguea y delega con `next(error)`. El handler global de `app.js` responde con `formatErrorResponse`: 401 con el mensaje seguro del servicio, 500 genérico.

**Tests agregados (`__tests__/security.test.js`):**
- Token con `nbf` futuro → `statusCode 401`
- Token expirado → `statusCode 401`
- `JWT_SECRET` ausente → `statusCode 500` (caso que NO debe romperse)

**Archivos modificados:**
- `BackEnd/src/services/auth.service.js` — mapeo robusto con `instanceof jwt.JsonWebTokenError`
- `BackEnd/src/middleware/verifyToken.js` — middleware simplificado, delega al handler global
- `BackEnd/src/__tests__/security.test.js` — tests de clasificación 401/500

**Verificación:** `npm test` → 176/176 pass (3 nuevos). `npm run lint` → sin errores en archivos modificados.
