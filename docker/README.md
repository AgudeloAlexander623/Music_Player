# Docker Configuration

## Estructura

```
docker/
├── docker-compose.yml       # Orquestación de todos los servicios
├── Dockerfile.backend       # Imagen para Node.js/Express
├── Dockerfile.frontend      # Imagen para React/Vite + Nginx
├── Dockerfile.python        # Imagen para FastAPI
├── nginx.conf               # Configuración de Nginx para frontend
├── .env.example             # Variables de entorno de ejemplo
└── README.md                # Este archivo
```

## Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| MySQL | 3306 | Base de datos |
| Backend | 4000 | API REST (Node.js + Express) |
| Frontend | 5173 | UI (React + Vite servido por Nginx) |
| Python Service | 8000 | Recomendaciones (FastAPI) |

## Inicio rápido

```bash
# 1. Copiar variables de entorno
cp docker/.env.example .env

# 2. Editar .env con tus credenciales reales
nano .env

# 3. Levantar todos los servicios (producción)
docker compose -f docker/docker-compose.yml up -d --build

# O para desarrollo con hot-reload:
docker compose -f docker/docker-compose.dev.yml up -d --build

# 4. Ver logs
docker compose -f docker/docker-compose.yml logs -f

# 5. Detener
docker compose -f docker/docker-compose.yml down
```

## Modos

| Modo | Comando | Características |
|------|---------|-----------------|
| Producción | `docker-compose.yml` | Build optimizado, Nginx, sin volumes |
| Desarrollo | `docker-compose.dev.yml` | Hot-reload, volumes, nodemon |

## Comandos útiles

```bash
# Ver estado de servicios
docker compose -f docker/docker-compose.yml ps

# Acceder a la BD
docker exec -it reproductor-mysql mysql -u reproductor_user -p reproductor_db

# Ver logs de un servicio
docker compose -f docker/docker-compose.yml logs -f backend

# Reconstruir un servicio
docker compose -f docker/docker-compose.yml up -d --build backend

# Limpiar todo (incluyendo volúmenes)
docker compose -f docker/docker-compose.yml down -v
```

## Notas

- El schema de MySQL se inicializa automáticamente desde `BackEnd/src/db/DataBases.sql`
- Los datos de MySQL persisten en el volumen `mysql_data`
- El frontend proxy `/api/*` al backend automáticamente vía Nginx
- El backend se conecta al Python service vía red interna Docker
