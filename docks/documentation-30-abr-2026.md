# Documentación - 30 de Abril de 2026

## Resumen del Día

Durante esta jornada se realizó una revisión general del proyecto, se reorganizó documentación del frontend, se ajustó el backend para facilitar el arranque en entorno de desarrollo y se reinició por completo la interfaz visual del frontend para construir una nueva base más limpia.

---

## Objetivo Principal

Dejar el proyecto en un estado más fácil de iterar, especialmente en frontend, eliminando estilos no deseados y creando una nueva estructura visual básica sobre la cual continuar el diseño.

---

## Cambios Realizados

### 1. Revisión de documentación existente

- Se revisaron los archivos `README` del proyecto.
- Se confirmó que los README propios del repositorio eran únicamente:
  - `README.MD`
  - `FrontEnd/mi-app/README.md`
- Se identificó que la mayoría de los demás `README` pertenecían a dependencias dentro de `node_modules`.

### 2. Reubicación de documentación de apoyo del frontend

- Se revisó el archivo `prompt-interfaz-react.md`.
- Se determinó que su función era servir como guía o prompt de referencia para el desarrollo de la interfaz.
- Se movió a una ubicación más coherente dentro del frontend:

```text
FrontEnd/mi-app/docs/prompt-interfaz-react.md
```

### 3. Ajuste del backend para desarrollo local

- Se modificó `BackEnd/src/app.js`.
- Antes, el servidor se detenía por completo si no existían credenciales de Spotify en `.env`.
- Ahora, el backend puede iniciar aunque falten `SPOTIFY_CLIENT_ID` y `SPOTIFY_CLIENT_SECRET`.
- En este escenario, el proyecto puede seguir funcionando parcialmente con `MusicBrainz`, permitiendo probar el frontend sin bloquear el arranque del servidor.

### 4. Reinicio visual completo del frontend

Se tomó la decisión de eliminar el estilo anterior del frontend porque no representaba la dirección visual esperada.

#### Acciones realizadas:

- Se eliminó la UI previa que se había construido.
- Se dejó el frontend temporalmente en blanco para partir desde una base limpia.
- Se simplificó `FrontEnd/mi-app/index.html` al mínimo.
- Se vaciaron los estilos globales y locales para quitar la dirección visual anterior.

### 5. Limpieza de assets del frontend

Se eliminaron recursos gráficos y archivos generados que ya no eran necesarios:

- `FrontEnd/mi-app/src/assets`
- `FrontEnd/mi-app/public`
- `FrontEnd/mi-app/dist`

Esto dejó el frontend sin imágenes, iconos ni restos visuales previos.

### 6. Construcción de una nueva base de interfaz

Después de limpiar completamente el frontend, se creó una nueva estructura inicial en `FrontEnd/mi-app/src/App.jsx` con tres áreas principales:

1. **Reproductor**
   - Ubicado en la primera sección.
   - Pensado para mostrar la canción actual del usuario.

2. **Home**
   - Ubicado al centro.
   - Se diseñó como el espacio más grande.
   - Servirá para playlists creadas o vistas anteriormente.

3. **Perfil**
   - Ubicado en la tercera sección.
   - Más pequeño que `Home` y que `Reproductor`.
   - Muestra únicamente la información básica del usuario.

### 7. Nueva base de estilos

Se creó una nueva capa visual sencilla en:

- `FrontEnd/mi-app/src/App.css`
- `FrontEnd/mi-app/src/index.css`

Características de esta base:

- Tipografía `Arial`
- Fondo gris claro, no demasiado oscuro
- Tarjetas y bloques neutros
- Jerarquía visual clara entre `Home`, `Reproductor` y `Perfil`

La intención fue dejar una interfaz sobria y fácil de modificar en siguientes iteraciones.

---

## Estado Final del Proyecto

Al cierre del día, el proyecto quedó así:

- El backend puede iniciar en desarrollo sin bloquearse por falta de credenciales de Spotify.
- El frontend fue limpiado por completo y reconstruido con una nueva base visual.
- La nueva interfaz ya está organizada en tres zonas funcionales:
  - reproductor
  - home
  - perfil
- El proyecto quedó preparado para continuar el trabajo de diseño sin depender de estilos anteriores.

---

## Verificaciones Realizadas

Se comprobó que:

- `npm run build` en el frontend funciona correctamente.
- `npm run lint` en el frontend no presenta errores.

---

## Próximo Paso Recomendado

La siguiente fase recomendada es refinar visualmente cada una de las tres áreas del frontend, empezando por `Home`, ya que será la sección con más contenido y mayor peso dentro de la interfaz.
