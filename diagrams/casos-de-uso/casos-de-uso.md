# Documento de Casos de Uso — Reproductor de Música

---

## Datos del Proyecto

| Campo | Valor |
|---|---|
| **Nombre del proyecto** | Reproductor de Música Multi-Fuente |
| **Materia** | Desarrollo de Software I |
| **Semestre** | Cuarto Semestre — Tegnologo en desarrollo de software |
| **Fecha** | Mayo 2026 |
| **Lenguajes usados** | JavaScript (Node.js + React), Python, SQL |
| **Base de datos** | MySQL 8.0 |

---

## Introducción

Este documento describe los casos de uso del proyecto "Reproductor de Música".  
Básicamente, es una aplicación web que permite buscar canciones desde **varias fuentes diferentes** (como Spotify, YouTube, Deezer, etc.), escuchar fragmentos de las canciones, guardar las que más te gustan en favoritos y armar tus propias playlists.

El sistema tiene dos tipos de usuarios: los **usuarios reales** (que se registran con email y contraseña) y los **invitados** (que entran sin crearse una cuenta pero no pueden guardar nada).

A continuación voy a explicar cada caso de uso con su diagrama, los pasos que se siguen y cómo reacciona el sistema si algo sale mal.

---

## 1. Diagrama General de Casos de Uso

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA REPRODUCTOR                          │
│                                                                 │
│                        ┌─────────────────────┐                  │
│                        │   REGISTRARSE       │                  │
│                        │   (UC-01)           │                  │
│                        └──────────┬──────────┘                  │
│                                   │                             │
│                        ┌──────────▼──────────┐                  │
│                   ┌────│   INICIAR SESIÓN     │────┐           │
│                   │    │   (UC-02)            │    │           │
│                   │    └──────────────────────┘    │           │
│                   │                                │           │
│    ┌──────────────┴───┐              ┌─────────────┴──────┐   │
│    │  INVITADO         │              │  USUARIO REAL      │   │
│    │  (UC-03)          │              │                    │   │
│    └──────────┬────────┘              └──────────┬─────────┘   │
│               │                                  │             │
│               ▼                                  ▼             │
│    ┌──────────────────────┐       ┌──────────────────────────┐ │
│    │  BUSCAR CANCIONES    │◄──────│  BUSCAR CANCIONES         │ │
│    │  (UC-04)             │       │  (UC-04)                  │ │
│    └──────────┬───────────┘       └────────────┬─────────────┘ │
│               │                                │               │
│               ▼                                ▼               │
│    ┌──────────────────────┐       ┌──────────────────────────┐ │
│    │  REPRODUCIR          │       │  REPRODUCIR               │ │
│    │  CANCIÓN (UC-05)     │       │  CANCIÓN (UC-05)          │ │
│    └──────────────────────┘       └──────────────────────────┘ │
│                                          │                     │
│                                          ▼                     │
│                               ┌──────────────────────────┐     │
│                               │  GESTIONAR FAVORITOS      │     │
│                               │  (UC-06)                  │     │
│                               └────────────┬─────────────┘     │
│                                            │                   │
│                                            ▼                   │
│                               ┌──────────────────────────┐     │
│                               │  GESTIONAR PLAYLISTS      │     │
│                               │  (UC-07)                  │     │
│                               └────────────┬─────────────┘     │
│                                            │                   │
│                                            ▼                   │
│                               ┌──────────────────────────┐     │
│                               │  VER PERFIL (UC-08)       │     │
│                               └──────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Descripción de los Actores

### Actor 1: Usuario No Autenticado
- Es la persona que llega a la página y todavía no ha iniciado sesión ni se ha registrado.
- Solo puede ver las pantallas de Login y Register.
- Si quiere entrar rapido sin crearse cuenta, puede usar el modo invitado.

### Actor 2: Usuario Invitado
- Entró con el botón "Explorar como invitado".
- **Puede hacer:** buscar canciones y reproducir previews.
- **NO puede hacer:** guardar favoritos, crear playlists, ni editar nada.
- Su sesión dura 24 horas (el token JWT expira).

### Actor 3: Usuario Real (Registrado)
- Se creó una cuenta con email y contraseña.
- **Puede hacer TODO:** buscar, reproducir, guardar favoritos, crear/editar/eliminar playlists, ver su perfil con estadísticas.
- Su sesión también dura 24 horas.

---

## 3. Casos de Uso Detallados

---

### UC-01: Registrarse

**Actor:** Usuario No Autenticado  
**Disparador:** El usuario quiere crear una cuenta para guardar sus canciones favoritas.

**Flujo Normal:**

```
Usuario                    Frontend                      Backend                     MySQL
  │                          │                            │                          │
  │  Llena formulario        │                            │                          │
  │  (email + contraseña)    │                            │                          │
  │─────────────────────────►│                            │                          │
  │                          │                            │                          │
  │                          │  POST /api/auth/register   │                          │
  │                          │  { email, password }        │                          │
  │                          │───────────────────────────►│                          │
  │                          │                            │                          │
  │                          │                            │  Validar email formato    │
  │                          │                            │  Validar password ≥ 6     │
  │                          │                            │                          │
  │                          │                            │  SELECT email FROM users  │
  │                          │                            │─────────────────────────►│
  │                          │                            │◄─────────────────────────│
  │                          │                            │                          │
  │                          │                            │  Si email existe → 409   │
  │                          │                            │                          │
  │                          │                            │  hashPassword(password)  │
  │                          │                            │  (bcryptjs, 10 rounds)    │
  │                          │                            │                          │
  │                          │                            │  INSERT INTO users       │
  │                          │                            │─────────────────────────►│
  │                          │                            │◄─────────────────────────│
  │                          │                            │                          │
  │                          │                            │  generateToken(userId,   │
  │                          │                            │    email, created_at)    │
  │                          │                            │                          │
  │                          │  201 { token, user }       │                          │
  │                          │◄───────────────────────────│                          │
  │                          │                            │                          │
  │   Redirige a Dashboard   │                            │                          │
  │◄─────────────────────────│                            │                          │
```

**Flujos Alternativos:**

| # | ¿Qué pasa si...? | Respuesta del Sistema |
|---|---|---|
| 1 | El email no tiene formato válido (falta @, etc.) | 400 — "Invalid email format" |
| 2 | La contraseña es muy corta (menos de 6 caracteres) | 400 — "Password must be at least 6 characters" |
| 3 | El email ya está registrado | 409 — "Email already registered" |
| 4 | El servidor de BD está caído | 500 — Error interno con mensaje |

**Reglas de Negocio:**
- El email se guarda siempre en **minúsculas** para evitar duplicados raros (ej: "Alex@Gmail.com" = "alex@gmail.com").
- La contraseña **NUNCA** se guarda como texto plano, siempre se hashea con bcryptjs.
- Se usan 10 rounds de salt (es lo recomendado por seguridad).

---

### UC-02: Iniciar Sesión

**Actor:** Usuario No Autenticado  
**Disparador:** El usuario ya tiene una cuenta y quiere acceder.

**Flujo Normal:**

```
Usuario                    Frontend                      Backend                     MySQL
  │                          │                            │                          │
  │  Email + contraseña      │                            │                          │
  │─────────────────────────►│                            │                          │
  │                          │  POST /api/auth/login      │                          │
  │                          │───────────────────────────►│                          │
  │                          │                            │                          │
  │                          │                            │  SELECT * FROM users     │
  │                          │                            │  WHERE email = ?         │
  │                          │                            │─────────────────────────►│
  │                          │                            │◄─────────────────────────│
  │                          │                            │                          │
  │                          │                            │  Si no existe → 401     │
  │                          │                            │                          │
  │                          │                            │  comparePassword(pass,   │
  │                          │                            │    hash)                 │
  │                          │                            │                          │
  │                          │                            │  Si incorrecta → 401    │
  │                          │                            │                          │
  │                          │                            │  generateToken(userId,   │
  │                          │                            │    email, created_at)    │
  │                          │                            │                          │
  │                          │  200 { token, user }       │                          │
  │                          │◄───────────────────────────│                          │
  │                          │                            │                          │
  │   Guarda token en        │                            │                          │
  │   localStorage           │                            │                          │
  │   Redirige a Dashboard   │                            │                          │
```

**Buena práctica:** Fijate que cuando el email no existe o la contraseña es incorrecta, el mensaje de error es el mismo ("Invalid credentials"). Esto es para que un hacker no pueda saber si el email existe o no (seguridad por oscuridad básica).

---

### UC-03: Acceder como Invitado

**Actor:** Usuario No Autenticado  
**Disparador:** El usuario quiere probar la app sin registrarse.

**Flujo Normal:**

```
Usuario                    Frontend                      Backend
  │                          │                            │
  │  Click "Explorar como    │                            │
  │  invitado"               │                            │
  │─────────────────────────►│                            │
  │                          │  POST /api/auth/guest      │
  │                          │───────────────────────────►│
  │                          │                            │
  │                          │                            │  generateGuestToken()
  │                          │                            │  (guest: true, exp: 24h)
  │                          │                            │
  │                          │  200 { token,              │
  │                          │        user:{guest:true} } │
  │                          │◄───────────────────────────│
  │                          │                            │
  │   Guarda token + guest   │                            │
  │   en localStorage        │                            │
  │   Redirige a Dashboard   │                            │
```

**Características del modo invitado:**
- No necesita base de datos (es un token firmado, no hay registro en MySQL).
- El frontend sabe que es invitado por el campo `guest: true` en el JWT.
- Los botones de "Guardar en favoritos" y "Crear playlist" se deshabilitan solos solitos, y si el usuario insiste, el backend responde con 403.

---

### UC-04: Buscar Canciones

**Actores:** Usuario Invitado, Usuario Real  
**Disparador:** El usuario escribe algo en la barra de búsqueda.

**Precondiciones:** El usuario debe estar autenticado (real o invitado).

**Flujo Normal:**

```
Usuario                    Frontend                      Backend
  │                          │                            │
  │  Escribe "queen"         │                            │
  │─────────────────────────►│                            │
  │                          │                            │
  │                          │  GET /api/search?q=queen   │
  │                          │  &limit=10                 │
  │                          │───────────────────────────►│
  │                          │                            │
  │                          │        ┌───────────────────┴──────┐
  │                          │        │  Llamadas en PARALELO:    │
  │                          │        │                          │
  │                          │        │  ┌────────────────────┐  │
  │                          │        │  │ Spotify            │  │
  │                          │        │  │ → searchSpotify()   │  │
  │                          │        │  └─────────┬──────────┘  │
  │                          │        │            │             │
  │                          │        │  ┌─────────▼──────────┐  │
  │                          │        │  │ YouTube            │  │
  │                          │        │  │ → searchYouTube()   │  │
  │                          │        │  └─────────┬──────────┘  │
  │                          │        │            │             │
  │                          │        │  ┌─────────▼──────────┐  │
  │                          │        │  │ YouTube Music      │  │
  │                          │        │  │ → searchYouTubeMusic│  │
  │                          │        │  └─────────┬──────────┘  │
  │                          │        │            │             │
  │                          │        │  ┌─────────▼──────────┐  │
  │                          │        │  │ Deezer             │  │
  │                          │        │  │ → searchDeezer()    │  │
  │                          │        │  └─────────┬──────────┘  │
  │                          │        │            │             │
  │                          │        │  ┌─────────▼──────────┐  │
  │                          │        │  │ MusicBrainz        │  │
  │                          │        │  │ → searchMusicBrainz│  │
  │                          │        │  └─────────┬──────────┘  │
  │                          │        │            │             │
  │                          │        │  ┌─────────▼──────────┐  │
  │                          │        │  │ FMA (Free Music    │  │
  │                          │        │  │ Archive)           │  │
  │                          │        │  │ → searchFMA()      │  │
  │                          │        │  └─────────┬──────────┘  │
  │                          │        └────────────┼────────────┘
  │                          │                     │
  │                          │        ┌────────────▼────────────┐
  │                          │        │  mergeResults()         │
  │                          │        │  (deduplica y combina)  │
  │                          │        └────────────┬────────────┘
  │                          │                     │
  │                          │        Si user autenticado:
  │                          │        INSERT search_history
  │                          │                     │
  │                          │  200 { tracks: [...],│
  │                          │        sources: {...}│
  │                          │        warnings: [] } │
  │                          │◄────────────────────│
  │                          │                     │
  │   Muestra resultados     │                     │
  │   en cards animados      │                     │
  │◄─────────────────────────│                     │
```

**Flujos Alternativos:**

| # | ¿Qué pasa si...? | Respuesta del Sistema |
|---|---|---|
| 1 | El query tiene menos de 2 caracteres | 400 — "Query too short" |
| 2 | **TODAS** las APIs fallan | 500 — "All search services failed" |
| 3 | Solamente algunas APIs fallan | 206 — Resultados parciales con `warnings` |
| 4 | YouTube no tiene API Key configurada | Se omite YouTube, los demas servicios siguen funcionando |
| 5 | Deezer está caído | Se ignora, los otros siguen |

**Buena práctica:** Cada API se llama con su propio `try/catch`. Esto es lo que se llama **graceful degradation** (degradación suave). Si una API falla, las otras siguen trabajando y el usuario ni se entera (solo ve un warning chiquito). También todas las APIs tienen **timeout de 8 segundos** para que si una está muy lenta, no se trabe todo.

---

### UC-05: Reproducir Canción

**Actores:** Usuario Invitado, Usuario Real  
**Disparador:** El usuario hace click en el botón ▶ de una canción.

**Precondiciones:** La canción debe tener un `previewUrl` (no todas las fuentes tienen preview).

**Flujo Normal:**

```
Usuario                    Frontend
  │                          │
  │  Click ▶ en "Bohemian    │
  │  Rhapsody"               │
  │─────────────────────────►│
  │                          │
  │                          │  onPlay(track):
  │                          │  → Agrega TODOS los resultados
  │                          │    a la cola (queue)
  │                          │  → currentTrack = "Bohemian Rhapsody"
  │                          │
  │                          │  useEffect():
  │                          │  → Crea new Audio(previewUrl)
  │                          │  → audio.play()
  │                          │
  │                          │  Se muestra el Player abajo
  │                          │  con: portada, nombre, artista,
  │                          │  barra de progreso, volumen
  │                          │
  │  Escucha la canción      │
  │◄─────────────────────────│
```

**Funcionalidades del Player:**

| Característica | Cómo funciona |
|---|---|
| Play / Pause | Alterna entre audio.play() y audio.pause() |
| Siguiente | Avanza al siguiente track en la cola (queue) |
| Anterior | Vuelve al track anterior |
| Barra de progreso | Se actualiza con audio.currentTime / audio.duration |
| Volumen | control range 0-1, se guarda en localStorage |
| Mute | Silencia/activa el volumen anterior |
| Shuffle | Aleatoriza el orden de la cola |
| Repeat | 3 modos: off → all → one |
| Auto-siguiente | Cuando termina un track, pasa al siguiente automáticamente |

**Flujos Alternativos:**

| # | ¿Qué pasa si...? | Respuesta del Sistema |
|---|---|---|
| 1 | La canción no tiene previewUrl | El botón ▶ aparece deshabilitado con 🔇 |
| 2 | El previewUrl está roto (404) | El Player muestra "Error al cargar audio" |
| 3 | El usuario apreta Space | Atajo de teclado: play/pause |
| 4 | No hay más canciones en la cola | Se detiene la reproducción |

---

### UC-06: Gestionar Favoritos

**Actor:** Usuario Real (los invitados NO pueden)  
**Disparador:** El usuario quiere guardar una canción que le gustó.

**Precondiciones:** El usuario debe estar logueado con una cuenta real.

**Flujo Normal — Agregar Favorito:**

```
Usuario                    Frontend                      Backend                     MySQL
  │                          │                            │                          │
  │  Click ❤️ en canción    │                            │                          │
  │─────────────────────────►│                            │                          │
  │                          │  POST /api/favorites       │                          │
  │                          │  { external_track_id,      │                          │
  │                          │    source, track_title,    │                          │
  │                          │    artist, album,          │                          │
  │                          │    preview_url }           │                          │
  │                          │───────────────────────────►│                          │
  │                          │                            │                          │
  │                          │                            │  Validar source (enum)   │
  │                          │                            │  Validar userId (JWT)    │
  │                          │                            │                          │
  │                          │                            │  Ver si ya existe        │
  │                          │                            │  (user_id, track_id,     │
  │                          │                            │   source)                │
  │                          │                            │─────────────────────────►│
  │                          │                            │◄─────────────────────────│
  │                          │                            │                          │
  │                          │                            │  Si ya existe → 409     │
  │                          │                            │                          │
  │                          │                            │  INSERT INTO             │
  │                          │                            │  favorite_tracks         │
  │                          │                            │─────────────────────────►│
  │                          │                            │◄─────────────────────────│
  │                          │                            │                          │
  │                          │  201 { success, favorite } │                          │
  │                          │◄───────────────────────────│                          │
  │                          │                            │                          │
  │   Toast "Agregado a     │                            │                          │
  │   favoritos"             │                            │                          │
  │◄─────────────────────────│                            │                          │
```

**Flujo Normal — Eliminar Favorito:**

El usuario clickea el botón 🗑️ y el frontend hace `DELETE /api/favorites/:id`.  
El backend verifica que el favorito existe y que **es del usuario** (no de otro), y si todo bien, lo borra con `ON DELETE CASCADE`.

**Flujo Normal — Ver Favoritos:**

El usuario va a la página de Favoritos y el frontend hace `GET /api/favorites`.  
El backend busca todos los favorites donde `user_id = req.user.userId`.

**Flujos Alternativos:**

| # | ¿Qué pasa si...? | Respuesta del Sistema |
|---|---|---|
| 1 | Un invitado intenta guardar | El frontend muestra un toast "Regístrate para guardar favoritos" |
| 2 | Un invitado fuerza el POST | Backend responde 403 Forbidden (middleware requireRealUser) |
| 3 | La canción ya está en favoritos | 409 — "Track already in favorites" |
| 4 | El ID del favorito no existe al eliminar | 404 — "Favorite not found" |
| 5 | Un usuario intenta eliminar el favorito de otro | 403 — "Forbidden: Favorite belongs to another user" |

---

### UC-07: Gestionar Playlists

**Actor:** Usuario Real (los invitados NO pueden)  
**Disparador:** El usuario quiere organizar sus canciones en listas.

**Sub-casos:**

| # | Acción | Ruta |
|---|---|---|
| 7.1 | Crear playlist | `POST /api/playlists` |
| 7.2 | Listar playlists | `GET /api/playlists` |
| 7.3 | Editar playlist (nombre/desc) | `PUT /api/playlists/:id` |
| 7.4 | Eliminar playlist | `DELETE /api/playlists/:id` |
| 7.5 | Agregar track a playlist | `POST /api/playlists/:id/tracks` |
| 7.6 | Ver tracks de playlist | `GET /api/playlists/:id/tracks` |
| 7.7 | Quitar track de playlist | `DELETE /api/playlists/:id/tracks/:trackId` |

**Flujo Normal — Crear Playlist:**

```
Usuario                          Frontend
  │                                │
  │  Escribe nombre y descripción │
  │  Click "Crear"                 │
  │──────────────────────────────►│
  │                                │
  │                                │  POST /api/playlists
  │                                │  { name, description }
  │                                │──────────────────────► Backend
  │                                │                          │
  │                                │                          │  Validar nombre (no vacío)
  │                                │                          │  user_id del JWT
  │                                │                          │
  │                                │                          │  INSERT playlists
  │                                │                          │──────────────────► MySQL
  │                                │◄─────────────────────────│
  │                                │                          │
  │   Toast "Playlist creada"     │                          │
  │   Se refresca la lista         │                          │
  │◄──────────────────────────────│                          │
```

**Flujo Normal — Agregar Track a Playlist:**

```
  Viene de la pantalla de búsqueda
  o del dashboard

  Usuario                          Frontend
    │                                │
    │  Click 📋 en canción           │
    │──────────────────────────────►│
    │                                │
    │                                │  Se abre dropdown con las
    │                                │  playlists del usuario
    │                                │
    │  Click en "Rock Favoritas"     │
    │──────────────────────────────►│
    │                                │
    │                                │  POST /playlists/:id/tracks
    │                                │  { external_track_id, source,
    │                                │    track_title, artist, ... }
    │                                │──────────────────────► Backend
```

**Reglas de negocio importantes:**
- Las playlists son **privadas** de cada usuario. Nadie más puede verlas ni modificarlas.
- Cuando se elimina una playlist, los tracks adentro se borran solos gracias a `ON DELETE CASCADE`.
- No se pueden crear playlists sin nombre.
- Se valida el `source` del track (spotify, youtube, deezer, etc.) antes de insertarlo.

---

### UC-08: Ver Perfil

**Actor:** Usuario Real  
**Disparador:** El usuario clickea en su perfil.

**Flujo Normal:**

```
Usuario                          Frontend                      Backend
  │                                │                            │
  │  Click en "Perfil"             │                            │
  │──────────────────────────────►│                            │
  │                                │                            │
  │                                │  GET /api/favorites        │
  │                                │  GET /api/playlists        │
  │                                │  (en paralelo)             │
  │                                │───────────────────────────►│
  │                                │◄───────────────────────────│
  │                                │                            │
  │   Muestra:                     │                            │
  │   ● Avatar con inicial         │                            │
  │   ● Email del usuario          │                            │
  │   ● Miembro desde (fecha real) │                            │
  │   ● Cantidad de favoritos      │                            │
  │   ● Cantidad de playlists      │                            │
  │   ● Info de la sesión          │                            │
  │◄──────────────────────────────│                            │
```

**Para el invitado:** La página de perfil muestra un mensaje tipo "Regístrate o inicia sesión para guardar tus canciones" con links directos a esas páginas.

---

## 4. Matriz de Permisos

| Caso de Uso | Invitado | Usuario Real |
|---|---|---|
| UC-01: Registrarse | ❌ (ya está en login) | ❌ (ya registrado) |
| UC-02: Iniciar Sesión | ❌ | ❌ (ya logueado) |
| UC-03: Acceder Invitado | ❌ (ya es invitado) | ❌ |
| UC-04: Buscar Canciones | ✅ | ✅ |
| UC-05: Reproducir Canción | ✅ | ✅ |
| UC-06: Agregar Favorito | ❌ (403) | ✅ |
| UC-06: Ver Favoritos | ❌ (no tiene) | ✅ |
| UC-06: Eliminar Favorito | ❌ | ✅ |
| UC-07: Crear Playlist | ❌ (403) | ✅ |
| UC-07: Ver Playlists | ❌ | ✅ |
| UC-07: Editar Playlist | ❌ | ✅ |
| UC-07: Eliminar Playlist | ❌ | ✅ |
| UC-07: Agregar Track | ❌ | ✅ |
| UC-08: Ver Perfil | ✅ (limitado) | ✅ (completo) |

---

## 5. Buenas Prácticas Implementadas

A lo largo del proyecto traté de seguir buenas prácticas de desarrollo. Aquí van las más importantes:

### 5.1 Seguridad
- **Contraseñas hasheadas** con bcryptjs (10 rounds de salt). Nunca en texto plano.
- **JWT con expiración de 24h** y firma HS256.
- **Prepared statements** en MySQL para evitar SQL injection.
- **Validación de IDs** en los endpoints (no confiar en nada del frontend).
- **Mensajes de error genéricos** en login (no revelar si el email existe o no).

### 5.2 Arquitectura
- **Separación en capas**: Routes → Controllers → Services → Database.
- **Middleware reutilizable**: verifyToken, requireRealUser.
- **Graceful degradation**: Si una API externa falla, las otras siguen.
- **Rate limiting**: 1 request/segundo para MusicBrainz (lo exige su API).

### 5.3 Frontend
- **Context API** para estado global de autenticación (AuthContext).
- **Componentes reutilizables**: ContentSection, Toast, Player, SearchResults.
- **Interceptor de Axios** para manejar 401 y redirigir al login.
- **Optimistic UI** al eliminar favoritos (se borra de la UI antes de esperar respuesta).
- **Error Boundary** para que no se rompa toda la app si un componente falla.

### 5.4 Base de Datos
- **Índices** en las columnas que más se consultan (user_id, email, added_at).
- **Claves foráneas** con `ON DELETE CASCADE` para mantener integridad referencial.
- **Unique keys** para evitar duplicados en favoritos.

### 5.5 Docker
- Contenedores separados para cada servicio (backend, frontend, MySQL, Python).
- Health checks para saber si los servicios están vivos.
- Usuarios no-root en los Dockerfiles (más seguro).

---

## 6. Glosario

| Término | Significado |
|---|---|
| **JWT** | JSON Web Token — un string firmado que prueba que el usuario está autenticado |
| **bcryptjs** | Librería para hashear contraseñas de forma segura |
| **Client Credentials** | Flujo de OAuth2 que usa Spotify para dar acceso sin usuario |
| **Graceful Degradation** | Cuando el sistema sigue funcionando aunque algunos componentes fallen |
| **ENUM** | Tipo de dato en MySQL que solo acepta valores específicos |
| **CASCADE** | Cuando se borra un padre, se borran los hijos automáticamente |
| **Prepared Statement** | Consulta SQL que separa el código de los datos (previene SQL injection) |
| **Toast** | Notificación temporal que aparece y desaparece sola |
| **UUID** | Identificador único universal (MusicBrainz usa estos) |
| **Rate Limit** | Límite de cuántas requests se pueden hacer por segundo |

---

> Este documento fue creado como parte del proyecto final del primer semestre de Ingeniería Informática.  
> Cualquier sugerencia para mejorar es bienvenida.
