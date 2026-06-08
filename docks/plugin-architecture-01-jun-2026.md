# Plugin Architecture + Database Fixes — 1 Junio 2026

## Resumen

En esta sesión hice dos trabajos importantes: organicé las APIs de búsqueda como plugins para que sea más fácil agregar o quitar fuentes de música sin tocar el código principal, y limpié un archivo de base de datos que había quedado con código pegado por accidente.

---

## 1. Sistema de Plugins para Búsqueda

### Cómo funcionaba antes

El controlador de búsqueda (`search.controller.js`) importaba cada servicio manualmente y tenía una lista fija de fuentes:

```js
import { searchSpotify } from '../services/spotify.services.js';
import { searchYouTube } from '../services/youtube.services.js';
// ...etc
const sources = [
  { name: 'Spotify', fn: () => searchSpotify(query, limit) },
  { name: 'Deezer', fn: () => searchDeezer(query, limit) },
  // ...etc
];
```

Cada vez que quería agregar una nueva API (como hice con Deezer y YouTube Music), tenía que modificar este archivo. Y si una fuente no tenía credenciales, igual se intentaba ejecutar y tiraba error.

### Cómo funciona ahora

Creé un **registro de plugins** que hace tres cosas:

1. **Cada API se registra por separado** como un plugin con su propio nombre, las variables de entorno que necesita, y su función de búsqueda.
2. **El registro verifica automáticamente** si las credenciales existen en `.env`. Si faltan, el plugin se deshabilita solo — no molesta, no tira error.
3. **El controlador de búsqueda ya no sabe qué APIs existen**. Solo le pregunta al registro: "dame los plugins disponibles y busca en todos".

### Archivos nuevos

| Archivo | Qué hace |
|---------|----------|
| `BackEnd/src/services/plugins/registry.js` | La clase `PluginRegistry` que guarda los plugins, chequea credenciales y ejecuta búsquedas |
| `BackEnd/src/services/plugins/index.js` | Crea el registro y registra los 6 plugins |
| `BackEnd/src/services/plugins/spotify.plugin.js` | Envuelve `searchSpotify` |
| `BackEnd/src/services/plugins/deezer.plugin.js` | Envuelve `searchDeezer` — no necesita credenciales |
| `BackEnd/src/services/plugins/youtube.plugin.js` | Envuelve `searchYouTube` |
| `BackEnd/src/services/plugins/youtube_music.plugin.js` | Envuelve `searchYouTubeMusic` |
| `BackEnd/src/services/plugins/musicbrainz.plugin.js` | Envuelve `searchMusicBrainz` — no necesita credenciales |
| `BackEnd/src/services/plugins/fma.plugin.js` | Envuelve `searchFMA` |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `BackEnd/src/controllers/search.controller.js` | Ahora usa `pluginRegistry.searchAll()` en vez de importar servicios uno por uno |
| `BackEnd/src/utils/mergeResults.js` | Ahora acepta un mapa `{ spotify: [...], deezer: [...], ... }` en vez de parámetros fijos, pero sigue haciendo el emparejamiento especial entre Spotify y MusicBrainz |

### Cómo se ve un plugin

Cada plugin es un archivo pequeño que solo conecta el nombre con la función:

```js
// spotify.plugin.js
import { searchSpotify } from '../spotify.services.js';

export default {
  name: 'spotify',
  requiredEnv: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
  search(query, { limit = 10, page = 1 } = {}) {
    return searchSpotify(query, limit, page);
  },
};
```

Si quisiera agregar una nueva API, solo creo su plugin y lo registro en `index.js`. No toco el controlador.

### Lo que pasa cuando faltan credenciales

Al iniciar el servidor, el registro revisa cada plugin:

```
info: Plugin registrado: spotify
info: Plugin registrado: deezer
warn: Plugin deshabilitado: youtube (faltan env vars)
warn: Plugin deshabilitado: youtube_music (faltan env vars)
info: Plugin registrado: musicbrainz
warn: Plugin deshabilitado: fma (faltan env vars)
```

Los plugins sin credenciales simplemente no se ejecutan. El resto funciona normal.

---

## 2. Limpieza y Correcciones en database.js

### El problema

El archivo `database.js` tenía código pegado por accidente:

- **Importaciones innecesarias**: `dotenv`, `async`, `fs`, `path`, `fileURLToPath`, `axios` — librerías que no se usaban en ese archivo.
- **Código de YouTube duplicado**: Una función `fetchYouTubeVideos` y `formatDuration` completas, pegadas al final del archivo. Tenían un error de sintaxis (`params: {;`) y usaban `axios` que ya no estaba importado (porque lo borré al inicio sin darme cuenta).

### Qué hice

1. **Borré las importaciones que sobraban** — dejé solo `pg` y `logger`.
2. **Borré las funciones de YouTube pegadas** — ya existen en `youtube.services.js`, no tenían sentido ahí.
3. **Arreglé `closeDatabase()`** — ahora pone `pool = null` después de cerrar, así si alguien intenta usar la base de datos después del cierre, recibe un mensaje claro en vez de un error raro de PostgreSQL.
4. **Arreglé `findMany()`** — Antes usaba `if (limit)` y `parseInt(limit)`. Si pasabas `limit = 0` no lo tomaba, y si pasabas cualquier cosa que no fuera número, `parseInt` devolvía `NaN` y la consulta SQL fallaba. Ahora valida que sea un número entero válido antes de usarlo. También agregué un parámetro opcional `orderBy` para ordenar resultados (antes no se podía).

### Archivos afectados

Solo `BackEnd/src/db/database.js` — los cambios no rompen nada porque las funciones mantienen su misma firma hacia afuera.

---

## 3. Pruebas

Los 31 tests del backend pasan sin problemas:

```
ℹ tests 31
ℹ suites 6
ℹ pass 31
ℹ fail 0
```
