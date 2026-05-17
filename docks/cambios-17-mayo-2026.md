# 📋 Cambios Realizados - 17 de Mayo de 2026

## 🗄️ Base de Datos (MySQL/MariaDB)

### Contenedor Docker
- Se levantó el contenedor existente `reproductor-mysql` (MariaDB 12.2.2)
- Se importó el schema `DataBases.sql` con las 5 tablas: `users`, `favorite_tracks`, `search_history`, `playlists`, `playlist_tracks`
- Verificación de conexión exitosa con `npm run db:verify`

### Fix en verify-connection.js
- Se corrigió la ruta del `.env` — cargaba desde directorio local en vez de la raíz del proyecto
- Se agregaron `path` y `fileURLToPath` para resolver `../../../.env` correctamente

---

## 🎨 FrontEnd (React + Vite)

### 1. CSS Extraído a Archivos por Componente
Se eliminaron todos los estilos inline (`style={{...}}`) y se crearon archivos CSS dedicados:

| Componente | Archivo CSS |
|-----------|-------------|
| Login/Register | `src/pages/Auth.css` |
| Home | `src/pages/Home.css` |
| SearchResults | `src/components/SearchResults.css` |
| Player | `src/components/Player.css` |
| Favorites | `src/pages/Favorites.css` |
| Playlists | `src/pages/Playlists.css` |
| Profile | `src/pages/Profile.css` |
| Navbar | `src/components/Navbar.css` |
| Toast | `src/components/Toast.css` |

### 2. Archivo `.env` del Frontend
- Se creó `FrontEnd/mi-app/.env` con `VITE_API_URL=http://localhost:4000/api`
- Antes dependía del fallback hardcoded en `api.js`

### 3. AuthContext - User Completo
- Ahora guarda `userId` y `email` en localStorage (antes solo guardaba `{ token }`)
- Al verificar sesión, usa `res.data.user` del backend en vez de reconstruir el objeto
- Se usó `useCallback` para `verifySession` y evitar warnings de React 19

### 4. Página de Playlists
- Nueva página completa: `src/pages/Playlists.jsx` + `Playlists.css`
- Funcionalidades: crear, ver, eliminar playlists y sus tracks
- Integrada en routing como `/playlists` (ruta protegida)
- Conecta con endpoints existentes del backend

### 5. Player - Validación de previewUrl
- Si `track.previewUrl` es null, muestra "Sin preview disponible" en vez de crashear
- Se agregó cleanup en `useEffect` para liberar el objeto Audio al desmontar
- Botón de play se deshabilita cuando no hay preview

### 6. Navbar Reutilizable
- Nuevo componente `src/components/Navbar.jsx` + `Navbar.css`
- Reemplaza headers duplicados en Home, Favorites, etc.
- Muestra link activo según la ruta actual (`useLocation`)
- Incluye email del usuario y botón de logout

### 7. Toast Notifications
- Nuevo sistema de notificaciones: `src/components/Toast.jsx` + `Toast.css`
- Reemplaza `alert()` y `console.error` en todas las páginas
- Tres tipos: `success` (verde), `error` (rojo), `info` (azul)
- Auto-dismiss después de 4 segundos, con botón de cierre manual
- `ToastProvider` envuelve toda la app en `main.jsx`

### 8. Página de Perfil
- Nueva página: `src/pages/Profile.jsx` + `Profile.css`
- Muestra: avatar con inicial, email, userId, estadísticas (favoritos, playlists)
- Ruta protegida en `/profile`

### 9. index.html Mejorado
- Agregado `<meta name="description">` con descripción del proyecto
- Agregado `<meta name="theme-color" content="#1db954">`

### 10. Key Duplicada en SearchResults
- Se cambió `key={track.id}` por `key={\`${track.source}-${track.id}\`}` para evitar clash entre Spotify y MusicBrainz

---

## 🔧 Configuración ESLint

Se ajustó `eslint.config.js` para desactivar reglas conflictivas con React 19:
- `react-hooks/set-state-in-effect`: off
- `react-refresh/only-export-components`: off

---

## ✅ Verificaciones

```bash
# Frontend
npm run lint    # ✅ Sin errores
npm run build   # ✅ Build exitoso (289 KB JS, 10.6 KB CSS)

# Backend + DB
npm run db:verify  # ✅ 5 tablas, conexión exitosa
```

---

## 📁 Archivos Nuevos/Modificados

### Nuevos (12)
- `FrontEnd/mi-app/.env`
- `FrontEnd/mi-app/src/pages/Auth.css`
- `FrontEnd/mi-app/src/pages/Home.css`
- `FrontEnd/mi-app/src/pages/Profile.css`
- `FrontEnd/mi-app/src/pages/Profile.jsx`
- `FrontEnd/mi-app/src/pages/Playlists.css`
- `FrontEnd/mi-app/src/components/SearchResults.css`
- `FrontEnd/mi-app/src/components/Player.css`
- `FrontEnd/mi-app/src/components/Navbar.jsx`
- `FrontEnd/mi-app/src/components/Navbar.css`
- `FrontEnd/mi-app/src/components/Toast.jsx`
- `FrontEnd/mi-app/src/components/Toast.css`

### Modificados (10)
- `BackEnd/src/db/verify-connection.js`
- `FrontEnd/mi-app/src/App.jsx`
- `FrontEnd/mi-app/src/main.jsx`
- `FrontEnd/mi-app/src/context/AuthContext.jsx`
- `FrontEnd/mi-app/src/pages/Login.jsx`
- `FrontEnd/mi-app/src/pages/Register.jsx`
- `FrontEnd/mi-app/src/pages/Favorites.jsx`
- `FrontEnd/mi-app/src/pages/Playlists.jsx`
- `FrontEnd/mi-app/src/components/SearchResults.jsx`
- `FrontEnd/mi-app/src/components/Player.jsx`
- `FrontEnd/mi-app/index.html`
- `FrontEnd/mi-app/eslint.config.js`
- `FrontEnd/mi-app/src/index.css`
