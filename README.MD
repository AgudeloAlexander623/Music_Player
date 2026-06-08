# Reproductor de Música

Aplicación web fullstack inspirada en Spotify, construida con Node.js, React y PostgreSQL. Integra múltiples APIs públicas para buscar y reproducir música.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19+-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Tecnologías

**Frontend:** React 19, Vite 8, React Router 7, Axios
**Backend:** Node.js, Express 5, JWT, Winston, bcryptjs
**Base de datos:** PostgreSQL 15+ con `pg` (pool de conexiones)
**APIs externas:** Spotify, Deezer, YouTube, YouTube Music, MusicBrainz, Free Music Archive
**Infraestructura:** Docker, Docker Compose, Nginx

---

## Requisitos

### Obligatorios

| Requisito | Versión | Para qué sirve |
|-----------|---------|---------------|
| **Node.js** | 18+ | Ejecutar backend y frontend |
| **PostgreSQL** | 15+ | Guardar usuarios, playlists, favoritos |
| **npm** | 9+ | Gestión de dependencias |
| **Git** | — | Clonar el repositorio |

### Opcionales

| Requisito | APIs que habilita |
|-----------|------------------|
| **Client ID + Secret de Spotify** | Búsqueda en Spotify (previews de 30 s) |
| **API Key de YouTube Data API v3** | Búsqueda en YouTube y YouTube Music (audio completo) |
| **API Key de Free Music Archive** | Búsqueda en FMA (canciones completas libres) |
| **Docker** | Levantar PostgreSQL sin instalarlo manualmente |

> Sin credenciales de alguna API, esa fuente simplemente no aparece en resultados. Deezer y MusicBrainz no necesitan autenticación.

---

## Instalación

### 1. Clonar el proyecto

```bash
git clone <url-del-repositorio>
cd Reproductor
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus datos. Lo mínimo indispensable:

```env
DB_HOST=localhost
DB_USER=reproductor_user
DB_PASSWORD=tu_contraseña_segura
DB_NAME=reproductor_db
JWT_SECRET=openssl rand -base64 32
```

### 3. Inicializar base de datos

#### Opción A — Docker (recomendada)

```bash
docker compose -f docker/docker-compose.dev.yml up -d postgres
```

#### Opción B — PostgreSQL local

```bash
sudo -u postgres psql
CREATE DATABASE reproductor_db;
CREATE USER reproductor_user WITH PASSWORD 'tu_contraseña_segura';
GRANT ALL PRIVILEGES ON DATABASE reproductor_db TO reproductor_user;
\q
```

Luego crear las tablas:

```bash
psql -U reproductor_user -d reproductor_db -h localhost < BackEnd/src/db/DataBases.sql
```

### 4. Instalar dependencias

```bash
# Backend
cd BackEnd && npm install && cd ..

# Frontend
cd FrontEnd/mi-app && npm install && cd ../..
```

### 5. Iniciar la aplicación

**Terminal 1 — Backend (http://localhost:4000)**

```bash
cd BackEnd
npm run dev
```

**Terminal 2 — Frontend (http://localhost:5173)**

```bash
cd FrontEnd/mi-app
npm run dev
```

### 6. Verificar

```bash
curl http://localhost:4000/api/health
# {"status":"ok","service":"backend"}

curl http://localhost:4000/api/search?q=queen
```

---

## Despliegue con Docker (producción)

```bash
# 1. Configurar variables
cp docker/.env.example .env

# 2. Construir y levantar todo
docker compose -f docker/docker-compose.yml up -d --build

# 3. Ver logs
docker compose -f docker/docker-compose.yml logs -f

# 4. Detener
docker compose -f docker/docker-compose.yml down
```

---

## APIs de búsqueda

| API | Autenticación | Límite | Contenido |
|-----|--------------|--------|-----------|
| **Spotify** | Client ID + Secret | 1000 req/hora | Previews 30 s |
| **Deezer** | No requiere | ~50 req/5 s | Previews 30 s |
| **YouTube** | API Key | 10,000 cuotas/día | Audio vía IFrame API |
| **YouTube Music** | API Key (misma YouTube) | 10,000 cuotas/día | Audio vía IFrame API |
| **MusicBrainz** | No requiere | 1 req/s | Metadata |
| **Free Music Archive** | API Key | Variable | Canciones completas |

Cada API es un plugin independiente. Si no configuras sus credenciales, no aparece en resultados.

---

## Estructura del proyecto

```
Reproductor/
├── BackEnd/
│   ├── src/
│   │   ├── app.js                    # Servidor Express
│   │   ├── controllers/              # Lógica de rutas
│   │   ├── db/                       # Conexión PostgreSQL + schema
│   │   ├── middleware/               # Auth, rate limiting
│   │   ├── routes/                   # Definición de rutas
│   │   ├── services/                 # APIs externas (Spotify, Deezer, etc.)
│   │   ├── utils/                    # Logger, validación, merge
│   │   └── __tests__/
│   └── package.json
├── FrontEnd/
│   └── mi-app/
│       ├── src/
│       │   ├── components/           # Topbar, Sidebar, Player, PlaylistPanel...
│       │   ├── pages/                # Dashboard, Favorites, Playlists, Profile, Auth
│       │   ├── context/              # AuthContext, PlayerContext
│       │   ├── services/             # api.js (axios), navigate.js
│       │   └── __tests__/
│       ├── index.html
│       └── package.json
├── python-services/                  # Microservicio FastAPI (recomendaciones)
├── docker/
│   ├── docker-compose.yml            # Producción
│   ├── docker-compose.dev.yml        # Desarrollo con hot-reload
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── Dockerfile.python
├── docks/                            # Documentación de cambios
├── .env.example
└── README.MD
```

---

## Pruebas

```bash
# Backend
cd BackEnd && npm test

# Frontend
cd FrontEnd/mi-app && npx vitest run
```

---

## Comandos útiles

### Backend (`BackEnd/`)

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor con recarga automática |
| `npm test` | Ejecuta pruebas |
| `npm run lint` | ESLint |

### Frontend (`FrontEnd/mi-app/`)

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Build para producción |
| `npx vitest run` | Pruebas del frontend |

---

## Consideraciones legales

- **Spotify**: solo previews de 30 segundos
- **Deezer**: solo previews de 30 segundos
- **YouTube**: reproducción vía embed oficial de YouTube
- **FMA**: música Creative Commons (cuando está configurado)
- **MusicBrainz**: solo metadata pública

No se descarga, almacena ni distribuye música protegida por derechos de autor.

---

## Licencia

MIT — ver [LICENSE](LICENSE) para más detalles.
