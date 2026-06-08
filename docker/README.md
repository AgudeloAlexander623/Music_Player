# Docker Configuration

## Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| PostgreSQL | 5432 | Base de datos |
| Backend | 4000 | API REST (Node.js + Express) |
| Frontend | 80 / 5173 | UI (React + Vite, servido por Nginx en prod) |
| Python Service | 8000 | Recomendaciones (FastAPI) |

## Inicio rápido (desarrollo)

```bash
# 1. Copiar variables de entorno
cp .env.example ../../.env

# 2. Editar .env con tus credenciales reales
nano ../../.env

# 3. Levantar todos los servicios con hot-reload
docker compose -f docker-compose.dev.yml up -d --build

# 4. Ver logs
docker compose -f docker-compose.dev.yml logs -f

# 5. Detener
docker compose -f docker-compose.dev.yml down
```

## Producción

```bash
docker compose -f docker-compose.yml up -d --build
```

## Comandos útiles

```bash
# Estado de servicios
docker compose ps

# Acceder a la BD
docker exec -it reproductor-postgres psql -U reproductor_user -d reproductor_db

# Logs de un servicio específico
docker compose logs -f backend

# Reconstruir un servicio
docker compose up -d --build backend

# Limpiar todo (incluyendo volúmenes)
docker compose down -v
```

## Notas

- El schema de PostgreSQL se inicializa automáticamente desde `BackEnd/src/db/DataBases.sql`
- Los datos persisten en el volumen `postgres_data`
- El frontend proxy `/api/*` al backend automáticamente vía Nginx
- El backend se conecta al Python service vía red interna Docker
