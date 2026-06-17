# Cambios — 17 de junio de 2026

## Refactorización de búsqueda: ruta independiente `/search`

**Problema:** Los resultados de búsqueda aparecían brevemente y desaparecían. La causa era que `Dashboard.jsx` manejaba la búsqueda dentro del `Outlet` de `ProtectedLayout`. Cuando el componente `ProtectedLayout` verificaba la sesión y `user` pasaba a `null` momentáneamente, se renderizaba `<Navigate to="/login">`, desmontando el `Outlet` (y con él `Dashboard`). Al volver a montar `Dashboard`, los refs/state se reiniciaban y los resultados se perdían.

**Solución:**
- Se creó `SearchPage.jsx` — componente independiente en su propia ruta `/search?q=...`
- La ruta se registró en `App.jsx` dentro del `ProtectedLayout`
- `Topbar.jsx` ahora tiene su propio estado local para el input de búsqueda y navega a `/search?q=...` al hacer submit
- `Dashboard.jsx` ya no contiene lógica de búsqueda; solo muestra contenido del dashboard
- Se eliminó `searchQuery` del `PlayerContext` por ya no ser necesario a nivel global

**Archivos modificados:**
- `FrontEnd/mi-app/src/App.jsx` — nueva ruta `/search`, se eliminó `searchQuery` del contexto
- `FrontEnd/mi-app/src/components/Topbar.jsx` — input local, navegación a `/search` en submit
- `FrontEnd/mi-app/src/pages/Dashboard.jsx` — se eliminó toda la lógica de búsqueda (efectos, refs, estados)
- `FrontEnd/mi-app/src/pages/SearchPage.jsx` — **nuevo**: componente de búsqueda independiente
- `FrontEnd/mi-app/src/pages/SearchPage.css` — **nuevo**: estilos de la página de búsqueda

---

## Creación de playlists desde resultados de búsqueda

**Nueva funcionalidad:** El dropdown "Agregar a playlist" en los resultados de búsqueda ahora incluye un botón **"+ Crear nueva playlist"** que despliega un formulario inline para crear una playlist y agregar el track automáticamente.

**Archivos modificados:**
- `FrontEnd/mi-app/src/components/SearchResults.jsx` — nuevo estado `showNewPlaylistInput`, función `handleCreateAndAdd`, formulario inline en el dropdown
- `FrontEnd/mi-app/src/components/SearchResults.css` — estilos para `.dropdown-new-playlist`, `.dropdown-new-form`, `.dropdown-new-input`, `.dropdown-new-btn`

---

## Correcciones en CSS de resultados de búsqueda

- Botones de acción redimensionados a 34×34px (antes estaban muy alargados)
- Altura mínima de items de pista aumentada a 48px
- Imágenes de álbum a 40×40px
- Espaciado y padding mejorados
- Eliminación de reglas CSS duplicadas

**Archivo modificado:**
- `FrontEnd/mi-app/src/components/SearchResults.css`

---

## Mejoras en el backend

- Se agregó middleware global de manejo de errores en `app.js` para capturar excepciones no controladas en los controladores
- Se corrigió promesa sin `.catch()` en `internetarchive.plugin.js`
- Se limpió código muerto en `authenticateToken.js`

**Archivos modificados:**
- `BackEnd/src/app.js`
- `BackEnd/src/services/plugins/internetarchive.plugin.js`
- `BackEnd/src/middleware/authenticateToken.js`
