# Internet Archive como fuente de audio completo — 10 Junio 2026

## Resumen

Hasta ahora el proyecto dependía de YouTube (con API key sin configurar, cayendo a scraping inestable) y Deezer/FMA (solo 30 segundos de preview) para reproducir música. Internet Archive estaba registrado como plugin pero tenía varias limitaciones que lo hacían poco útil. En esta sesión lo dejamos funcional como fuente confiable de canciones completas.

## Problema original

Cuando el usuario buscaba "Slipknot", los resultados de Deezer y FMA solo reproducían 30 segundos. YouTube intentaba scraping pero a veces fallaba. Internet Archive sí devolvía archivos MP3/OGG completos, pero:

- El query de búsqueda no se sanitizaba, podía romperse con caracteres especiales
- El título del track se extraía directamente del nombre del archivo sin limpiarlo (ej: `01 - Song Name.mp3` quedaba como `01 - Song Name`)
- El artista siempre era el `creator` del item, sin filtrar ruido como "www.archive.org"
- El plugin no verificaba si Internet Archive estaba alcanzable antes de intentar buscar
- En el frontend no existía un botón de filtro para Internet Archive ni un color de badge para la fuente

## Cambios realizados

### Backend — `internetarchive.services.js`

1. **Sanitización del query**: se escapan caracteres especiales de la sintaxis de búsqueda avanzada (`!`, `"`, `(`, `)`, `*`, `:`) para evitar errores 400
2. **Mejora en parsing de títulos**: se limpian prefijos como `Disc 1 - 01 -`, `Track 01 -`, y separadores como `_` o `-` para que el nombre sea legible
3. **Filtro de artistas**: se excluyen creadores genéricos con URLs o nombres de plataformas
4. **Licencias**: se extrae `licenseurl` del metadata cuando está disponible
5. **Límites aumentados**: de 20 a 30 resultados máximos, de 3 a 5 archivos de audio por item
6. **Health check**: nueva función `isInternetArchiveReachable()` para verificar conectividad

### Backend — `internetarchive.plugin.js`

1. **`isAvailable()` asíncrono**: verifica que archive.org responda antes de marcar el plugin como disponible. El resultado se cachea en memoria para no repetir el ping en cada búsqueda.

### Frontend — `SearchResults.jsx`

1. Se agregó el botón de filtro "Internet Archive" en la barra de fuentes

### Frontend — `SearchResults.css`

1. Se agregó la clase `.source-internetarchive` con color púrpura para el badge

### Frontend — `pluginStorage.js`

1. `internetarchive` se agregó a la lista `ALWAYS_ENABLED` para que siempre se consulte sin necesidad de configuración del usuario

### Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `BackEnd/src/services/internetarchive.services.js` | Reescrito con sanitización, mejor parsing, licencias, health check |
| `BackEnd/src/services/plugins/internetarchive.plugin.js` | `isAvailable()` asíncrono con health check |
| `FrontEnd/mi-app/src/components/SearchResults.jsx` | Botón de filtro Internet Archive |
| `FrontEnd/mi-app/src/components/SearchResults.css` | Badge `.source-internetarchive` |
| `FrontEnd/mi-app/src/utils/pluginStorage.js` | IA en `ALWAYS_ENABLED` |

## Cómo se comporta ahora

1. El usuario busca un artista/canción
2. El backend consulta Internet Archive junto con las demás fuentes
3. Internet Archive devuelve tracks con `previewUrl` apuntando a archivos MP3/OGG completos en `archive.org/download/...`
4. El frontend reproduce el archivo con el elemento `<audio>` nativo del navegador — sin límite de duración
5. El badge de la fuente se muestra en púrpura, y se puede filtrar exclusivamente por Internet Archive

## Limitaciones conocidas

- Internet Archive tiene música predominantemente de dominio público, Creative Commons, y grabaciones históricas. Artistas comerciales modernos como Slipknot rara vez están disponibles.
- Los títulos de los tracks dependen de cómo el subidor nombró los archivos; a veces son confusos.
- Si archive.org está caído, el plugin se desactiva automáticamente sin afectar las demás fuentes.
