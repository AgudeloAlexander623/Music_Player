# Conexión a Base de Datos MySQL - 30 de Abril de 2026

## 🎯 Resumen

Se implementó el pool de conexiones a MySQL con:
- ✅ Pool de conexiones reutilizable
- ✅ Funciones helper para queries (insert, update, delete, find*)
- ✅ Integración en auth.controller.js
- ✅ Integración en search.controller.js
- ✅ Inicialización automática al arrancar servidor
- ✅ Graceful shutdown al detener servidor

---

## 📁 Archivos Creados/Modificados

### Backend
1. **`BackEnd/src/db/database.js`** (NUEVO)
   - Pool de conexiones MySQL
   - Funciones helper para queries
   - Manejo de errores de BD

2. **`BackEnd/src/controllers/auth.controller.js`** (ACTUALIZADO)
   - Register: Busca si email existe, inserta usuario, retorna token
   - Login: Busca usuario, compara contraseña, retorna token
   - Queries verificadas contra BD

3. **`BackEnd/src/controllers/search.controller.js`** (ACTUALIZADO)
   - Guarda búsquedas en tabla `search_history`
   - Solo guarda si usuario está autenticado (opcional)
   - No bloquea si falla el guardado

4. **`BackEnd/src/app.js`** (ACTUALIZADO)
   - Inicializa BD antes de escuchar peticiones
   - Validación de variables de BD obligatorias
   - Graceful shutdown (cierra conexiones correctamente)

---

## 🔧 Configuración Inicial de MySQL

### Opción A: MySQL Local (Linux/Mac)

```bash
# Instalar MySQL
brew install mysql  # Mac
sudo apt-get install mysql-server  # Ubuntu/Debian

# Iniciar servicio
brew services start mysql  # Mac
sudo systemctl start mysql  # Linux

# Acceder a MySQL
mysql -u root
```

### Opción B: Docker (Recomendado para desarrollo)

```bash
# Ejecutar MySQL en container
docker run --name reproductor-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=reproductor_db \
  -p 3306:3306 \
  -d mysql:8.0

# Acceder a MySQL
mysql -h 127.0.0.1 -u root -p
# Password: root
```

---

## 🗄️ Crear Base de Datos y Usuario

```sql
-- Conectar como root
mysql -u root -p

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS reproductor_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear usuario específico (recomendado)
CREATE USER 'reproductor_user'@'localhost' IDENTIFIED BY 'secure_password_here';

-- Asignar permisos
GRANT ALL PRIVILEGES ON reproductor_db.* TO 'reproductor_user'@'localhost';
FLUSH PRIVILEGES;

-- Verificar
SHOW DATABASES;
SHOW GRANTS FOR 'reproductor_user'@'localhost';
```

---

## 📊 Importar Schema

```bash
# Desde la terminal, en el directorio del proyecto
mysql -u reproductor_user -p reproductor_db < BackEnd/src/db/DataBases.sql
# Password: secure_password_here

# Verificar que las tablas se crearon
mysql -u reproductor_user -p reproductor_db
> SHOW TABLES;
> DESC users;
> DESC search_history;
```

---

## 🔑 Configurar .env

Copiar `.env.example` a `.env` y configurar:

```env
# Database
DB_HOST=localhost
DB_USER=reproductor_user
DB_PASSWORD=secure_password_here
DB_NAME=reproductor_db
DB_POOL_LIMIT=10

# JWT
JWT_SECRET=$(openssl rand -base64 32)

# Spotify (opcional)
SPOTIFY_CLIENT_ID=tu_id
SPOTIFY_CLIENT_SECRET=tu_secret

# Server
PORT=4000
```

---

## 🚀 Usar la BD en Controllers

### Ejecutar una Query Directa

```javascript
import { executeQuery } from '../db/database.js';

const users = await executeQuery(
  'SELECT * FROM users WHERE email = ?',
  [email]
);
```

### Usar Helpers

```javascript
import { 
  findOne, 
  findMany, 
  insert, 
  update, 
  remove 
} from '../db/database.js';

// Buscar uno
const user = await findOne('users', { email: 'test@example.com' });

// Buscar muchos
const searches = await findMany('search_history', { user_id: 1 }, 10);

// Insertar
const result = await insert('users', {
  email: 'new@example.com',
  password_hash: 'hashed_pwd'
});

// Actualizar
await update('users', 
  { password_hash: 'new_hash' },
  { id: 1 }
);

// Eliminar
await remove('favorite_tracks', { id: 5 });
```

---

## 📊 Estructura de Tablas

### users
```
id (INT, PRIMARY KEY, AUTO_INCREMENT)
email (VARCHAR 255, UNIQUE)
password_hash (VARCHAR 255)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### search_history
```
id (INT, PRIMARY KEY, AUTO_INCREMENT)
user_id (INT, FOREIGN KEY → users.id)
query (VARCHAR 255)
results_count (INT)
searched_at (TIMESTAMP)
```

### favorite_tracks
```
id (INT, PRIMARY KEY, AUTO_INCREMENT)
user_id (INT, FOREIGN KEY → users.id)
external_track_id (VARCHAR 255)
source (ENUM: 'spotify', 'musicbrainz')
track_title (VARCHAR 255)
artist (VARCHAR 255)
album (VARCHAR 255)
preview_url (TEXT)
added_at (TIMESTAMP)
```

### playlists
```
id (INT, PRIMARY KEY, AUTO_INCREMENT)
user_id (INT, FOREIGN KEY → users.id)
name (VARCHAR 255)
description (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### playlist_tracks
```
id (INT, PRIMARY KEY, AUTO_INCREMENT)
playlist_id (INT, FOREIGN KEY → playlists.id)
external_track_id (VARCHAR 255)
source (ENUM: 'spotify', 'musicbrainz')
track_title (VARCHAR 255)
artist (VARCHAR 255)
album (VARCHAR 255)
preview_url (TEXT)
added_at (TIMESTAMP)
```

---

## 🧪 Testing

### Verificar conexión

```bash
# Desde backend
cd BackEnd
npm run dev
# Deberías ver:
# ✅ Base de datos conectada exitosamente
# 📊 Pool: localhost/reproductor_db
# 🔗 Conexiones simultáneas: 10
```

### Probar endpoints

```bash
# Registrar usuario
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Ver en BD
mysql -u reproductor_user -p reproductor_db
> SELECT * FROM users;
```

---

## ⚠️ Problemas Comunes

### "ER_ACCESS_DENIED_FOR_USER"
- **Problema**: Contraseña incorrecta
- **Solución**: Verificar variables en `.env`

### "ER_BAD_DB_ERROR"
- **Problema**: Base de datos no existe
- **Solución**: Ejecutar script de setup: `CREATE DATABASE reproductor_db;`

### "Pool not initialized"
- **Problema**: initializeDatabase() no se llamó
- **Solución**: Verificar que app.js llama startServer()

### Conexiones muy lentas
- **Problema**: Pool limit muy bajo
- **Solución**: Aumentar `DB_POOL_LIMIT` en .env

---

## 🔐 Seguridad

### ✅ Implementado
- Prepared statements (previene SQL injection)
- Contraseñas hasheadas con bcryptjs
- Pool de conexiones (evita connection exhaustion)

### ⚠️ Falta Implementar
- [ ] Rate limiting en BD queries
- [ ] Audit log de cambios
- [ ] Backup automático
- [ ] Encriptación de datos sensibles

---

## 📈 Performance

### Pool Settings
- **connectionLimit**: 10 (default) - Máximo de conexiones simultáneas
- **queueLimit**: 0 (ilimitado) - Requests esperando en queue
- **enableKeepAlive**: true - Mantiene conexiones vivas
- **keepAliveInitialDelayMs**: 30000 - Ping cada 30s

### Recomendaciones
- Para producción: aumentar `connectionLimit` a 20-50 según carga
- Monitorear número de conexiones activas
- Hacer índices en columnas que se usan en WHERE (email, user_id)

---

## 🔗 Próximos Pasos

1. **Implementar Favoritos** - Rutas CRUD para favoritos
2. **Implementar Playlists** - Rutas CRUD para playlists
3. **Agregar caché** - Redis para queries frecuentes
4. **Migrations** - Sistema de versionamiento de schema
5. **Backup automático** - Script de backup diario

---

## 📚 Referencia Rápida

```javascript
// Inicializar (llamado automáticamente en app.js)
import { initializeDatabase } from './db/database.js';
await initializeDatabase();

// Usar en controllers
import { findOne, insert, update, remove } from './db/database.js';

const user = await findOne('users', { email: 'test@example.com' });
const result = await insert('users', { email: 'new@example.com', password_hash: '...' });
await update('users', { name: 'Juan' }, { id: 1 });
await remove('users', { id: 1 });
```

