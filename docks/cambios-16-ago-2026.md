# Cambios — 16 de agosto de 2026

## Corrección: fuentes (`source`) de las APIs incompatibles con favoritos/playlists

**Severidad:** ALTA (rompía funcionalidad principal)

**Problema:** Agregar a favoritos o a una playlist un track de **YouTube Music, Audius o Internet Archive** fallaba con `400 Invalid source`. La causa era una triple inconsistencia entre las capas que definen qué valores de `source` son válidos:

| Capa | Valor que aceptaba | Qué producen los plugins |
|---|---|---|
| Schema Zod (`utils/validation.js`) | `['spotify','musicbrainz','fma','youtube','youtube-music','deezer']` | `deezer`, `youtube`, `youtube_music`, `musicbrainz`, `fma`, `internetarchive`, `audius` |
| `CHECK` en `favorite_tracks` (`DataBases.sql`) | Ídem | Ídem |
| `CHECK` en `playlist_tracks` (`DataBases.sql`) | Ídem | Ídem |

Había **dos fallos concretos**:

1. **`youtube-music` (con guion) nunca existió como fuente real.** El plugin `youtube_music.plugin.js` marca sus resultados con `source: 'youtube_music'` (guion bajo) en `youtube.services.js:475`, y el frontend ya filtrabas y reproducía con `youtube_music` (`SearchResults.jsx`, `Player.jsx`). El guion solo vivía en la validación y en la BD, así que **guardar cualquier track de YouTube Music siempre daba 400** — era la fuente más usada de la app, ya que YouTube/YouTube Music son los únicos plugins que producen audio completo.
2. **Faltaban dos fuentes que sí existen desde hace tiempo:** `internetarchive` (plugin sin API key) y `audius` (respaldo de FMA). Guardarlos también daba 400.

**Solución implementada (punto único de verdad):**

1. **`utils/validation.js`** — `validSources` ahora es la lista real de las 8 fuentes que producen los plugins:
   ```
   ['spotify', 'deezer', 'youtube', 'youtube_music', 'musicbrainz', 'fma', 'internetarchive', 'audius']
   ```
   Se eliminó la entrada fantasma `youtube-music` (nada la generaba) y se añadieron `internetarchive` y `audius`. Esto también corrige `addTrackToPlaylistSchema`, que comparte la misma constante.

2. **`DataBases.sql`** — se actualizaron los dos `CHECK` (`favorite_tracks` y `playlist_tracks`) a la misma lista, para que BD nuevas ya nazcan con el constraint correcto.

3. **`db/migrations/001_fix_sources.sql` — nuevo.** Para **BD existentes** (el `CREATE TABLE IF NOT EXISTS` de `DataBases.sql` no modifica constraints ya creados, así que una BD desplegada no se corregiría sola). La migración:
   - Normaliza filas heredadas que pudieran tener `youtube-music` → `youtube_music`.
   - Dropea los `CHECK` auto-generados (`<tabla>_source_check`) y los re-crea con la lista completa.
   - Corre dentro de `BEGIN/COMMIT` para ser atómica.

**Tests (`__tests__/validation.test.js`):**
- Acepta las **8 fuentes reales** de los plugins.
- Rechaza la fuente legacy `youtube-music` (guion), para fijar que el contrato es el guion bajo.

**Archivos modificados:**
- `BackEnd/src/utils/validation.js` — `validSources` sincronizado con los plugins
- `BackEnd/src/db/DataBases.sql` — `CHECK` de `favorite_tracks` y `playlist_tracks`
- `BackEnd/src/db/migrations/001_fix_sources.sql` — **nuevo**: migración para BD existentes
- `BackEnd/src/__tests__/validation.test.js` — 2 tests nuevos

**Verificación:** `npm test` → **178/178 pass** (176 previos + 2 nuevos). No requirió cambios en frontend (`Player.jsx` y `SearchResults.jsx` ya usaban `youtube_music`).

**Cómo aplicar en una BD existente (obligatorio si ya hay datos):**
```bash
psql -U reproductor_user -d reproductor_db -h localhost \
     -f BackEnd/src/db/migrations/001_fix_sources.sql
```

**Nota para despliegues futuros:** mantener una **única fuente de verdad** para la lista de fuentes. Hoy la lista vive duplicada en `validation.js` (JS) y en el SQL (`DataBases.sql` + migración). Si se añade un plugin nuevo, hay que actualizar las tres en el mismo commit; el patrón recomendado es agregar un test que itere sobre los plugins registrados (`pluginRegistry.getAll()`) y verifique que cada `source` producido esté en `validSources`, para que el CI detecte la deriva automáticamente.

**Siguientes pendientes relacionados** (no incluidos en este cambio):
- La deduplicación entre `fma` y `audius` (mismo endpoint) sigue pendiente en `mergeResults.js`.

---

## Corrección: tracks de YouTube guardados no se reproducían (falta de `videoId`)

**Severidad:** ALTA (rompía reproducción de la fuente principal)

**Problema:** El `Player` reproduce YouTube/YouTube Music vía IFrame API y exige `track.videoId` (`Player.jsx:89`). Al **guardar** un track de YouTube en favoritos o playlists solo se persistía `preview_url` (`https://www.youtube.com/watch?v=...`) y nunca el `videoId`. Al **rehidratarlo** desde Favoritos/Playlists (`Favorites.jsx`, `Playlists.jsx`), el objeto track llegaba sin `videoId`, el efecto del `Player` nunca cargaba el video y el botón de play quedaba deshabilitado en "Cargando..." para siempre. Irrreproducible.

**Solución implementada (columna explícita + backfill):**

Se decidió **persistir `video_id` como columna dedicada** en vez de parsear el `preview_url` en runtime, porque:
- Desacopla la reproducción del formato de la URL (frágil ante cambios de Google).
- Mantiene el contrato de datos explícito en el modelo.
- Permite backfillar las filas heredadas en una migración.

1. **`db/DataBases.sql`** — nueva columna `video_id VARCHAR(64)` en `favorite_tracks` y `playlist_tracks`.
2. **`db/migrations/002_add_video_id.sql` — nuevo.** Para BD existentes:
   - `ADD COLUMN IF NOT EXISTS video_id VARCHAR(64)` en ambas tablas (idempotente).
   - **Backfill** con regex: extrae el videoId de `preview_url` (`v=([a-zA-Z0-9_-]{11})`) en las filas `youtube`/`youtube_music` que aún no lo tengan → los favoritos/playlists guardados antes del fix se reparan solos.
3. **`utils/validation.js`** — `video_id` opcional/null en `addFavoriteSchema` y `addTrackToPlaylistSchema` (default `null`).
4. **Controllers** — `favorites.controller.js` y `playlists.controller.js` persisten `data.video_id || null`.
5. **Frontend (envío):** `SearchResults.jsx`, `SearchPage.jsx` y `Dashboard.jsx` envían `video_id: track.videoId || null` al guardar.
6. **Frontend (rehidratación):** `Favorites.jsx` (`mapFavoriteToTrack`) y `Playlists.jsx` (`handlePlay`) mapean `videoId: <track>.video_id || null`.

Las fuentes de solo audio (Deezer, FMA, Audius, Internet Archive) envían `video_id: null` y siguen reproduciéndose por `preview_url`; el `Player` solo toma la ruta YouTube cuando `source` es `youtube`/`youtube_music` **y** hay `videoId`.

**Tests (`__tests__/validation.test.js`):**
- `addFavoriteSchema` acepta y conserva `video_id`.
- `video_id` es `null` por defecto si no se envía.

**Archivos modificados:**
- `BackEnd/src/db/DataBases.sql` — columna `video_id` en ambas tablas
- `BackEnd/src/db/migrations/002_add_video_id.sql` — **nuevo**: columna + backfill
- `BackEnd/src/utils/validation.js` — `video_id` en ambos schemas
- `BackEnd/src/controllers/favorites.controller.js` — persiste `video_id`
- `BackEnd/src/controllers/playlists.controller.js` — persiste `video_id`
- `FrontEnd/mi-app/src/components/SearchResults.jsx` — envía `video_id`
- `FrontEnd/mi-app/src/pages/SearchPage.jsx` — envía `video_id`
- `FrontEnd/mi-app/src/pages/Dashboard.jsx` — envía `video_id`
- `FrontEnd/mi-app/src/pages/Favorites.jsx` — rehidrata `videoId`
- `FrontEnd/mi-app/src/pages/Playlists.jsx` — rehidrata `videoId`

**Verificación:** Backend `npm test` → **180/180** (178 previos + 2 nuevos). Frontend `vitest run` → **27/27**. Lint: sin errores nuevos (los 4 de `sqli.test.js` y el `handleAddFavorite` sin usar en `Dashboard.jsx` son pre-existentes).

**Cómo aplicar en una BD existente (obligatorio, después de la 001):**
```bash
psql -U reproductor_user -d reproductor_db -h localhost \
     -f BackEnd/src/db/migrations/001_fix_sources.sql
psql -U reproductor_user -d reproductor_db -h localhost \
     -f BackEnd/src/db/migrations/002_add_video_id.sql
```

**Nota de contexto:** `Dashboard.jsx` define `handleAddFavorite` pero ningún elemento del dashboard lo invoca (los cards no tienen botón de favorito); es código muerto pre-existente, pendiente de limpiar en otra iteración.