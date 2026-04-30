# 🗄️ Conexión a Base de Datos MySQL - Resumen de Implementación

## ✅ Tareas Completadas

```
[✓] 1. Crear pool de conexiones MySQL
[✓] 2. Crear funciones helper para BD
[✓] 3. Integrar BD en auth.controller.js
[✓] 4. Integrar BD en search.controller.js
[✓] 5. Crear archivo de inicialización de BD
[✓] 6. Documentar conexión a BD
```

---

## 📁 Archivos Nuevos/Modificados

### Nuevos

| Archivo | Descripción |
|---------|------------|
| `BackEnd/src/db/database.js` | Pool conexiones + helpers |
| `BackEnd/src/db/verify-connection.js` | Verificador de conexión |
| `setup-database.sh` | Script de setup automático |
| `docks/conexion-bd-mysql-30-abr-2026.md` | Documentación completa |

### Modificados

| Archivo | Cambios |
|---------|---------|
| `BackEnd/src/app.js` | Inicializa BD, validación de variables |
| `BackEnd/src/controllers/auth.controller.js` | Queries reales a BD (register, login) |
| `BackEnd/src/controllers/search.controller.js` | Guarda historial en BD |
| `BackEnd/package.json` | Agregó script `db:verify` |

---

## 🚀 Función Principal: Pool de Conexiones

```javascript
// database.js
export async function initializeDatabase()     // Crear pool
export async function executeQuery()           // Ejecutar query
export async function getConnection()          // Conexión directa
export async function closeDatabase()          // Cerrar pool
export async function insert()                 // Helper INSERT
export async function update()                 // Helper UPDATE
export async function remove()                 // Helper DELETE
export async function findById()               // Helper SELECT by ID
export async function findOne()                // Helper SELECT one
export async function findMany()               // Helper SELECT many
```

---

## 🔄 Flujo de Autenticación Con BD

### Register
```
1. Validar email/password
2. findOne('users', { email }) → Verificar no existe
3. hashPassword(password)
4. insert('users', { email, password_hash })
5. generateToken(userId, email)
6. Respuesta: { token, user }
```

### Login
```
1. Validar email/password
2. findOne('users', { email })
3. comparePassword(password, storedHash)
4. generateToken(userId, email)
5. Respuesta: { token, user }
```

### Verify
```
1. Extraer token del header Authorization
2. verifyToken(token)
3. Respuesta: { user }
```

---

## 📊 Flujo de Búsqueda Con BD

```
1. Usuario hace búsqueda en /api/search?q=...
2. searchController busca en Spotify + MusicBrainz
3. if req.user (autenticado):
     insert('search_history', { user_id, query, results_count })
4. Retorna resultados
```

---

## 🔧 Configuración Rápida

### 1. Crear .env
```bash
cp .env.example .env
```

### 2. Instalar y Configurar MySQL

**Opción A: Manual**
```bash
# Linux/Mac
brew install mysql
mysql.server start

# Windows
# Descargar desde: https://dev.mysql.com/downloads/mysql/
```

**Opción B: Docker**
```bash
docker run --name mysql -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=reproductor_db -p 3306:3306 -d mysql:8.0
```

### 3. Ejecutar Setup (RECOMENDADO)
```bash
chmod +x setup-database.sh
bash setup-database.sh
# Ingresará credenciales y configurará todo automáticamente
```

### 4. Verificar Conexión
```bash
cd BackEnd
npm run db:verify
# Deberías ver: ✅ TODAS LAS VERIFICACIONES PASARON
```

### 5. Iniciar Servidor
```bash
npm run dev
# Deberías ver: ✅ Base de datos conectada exitosamente
```

---

## 📋 Variables de Entorno Necesarias

```env
# Database (CRÍTICO)
DB_HOST=localhost
DB_USER=reproductor_user
DB_PASSWORD=secure_password_here
DB_NAME=reproductor_db
DB_POOL_LIMIT=10

# JWT (CRÍTICO)
JWT_SECRET=your_secret_key_here

# Spotify (Opcional)
SPOTIFY_CLIENT_ID=your_id
SPOTIFY_CLIENT_SECRET=your_secret

# Server
PORT=4000
```

---

## 🧪 Testing Manual

### Test 1: Verificar Conexión
```bash
npm run db:verify
```

### Test 2: Registrar Usuario
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test 3: Verificar en BD
```bash
mysql -u reproductor_user -p reproductor_db
> SELECT * FROM users;
```

### Test 4: Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test 5: Búsqueda (Guarda historial si autenticado)
```bash
curl -X GET "http://localhost:4000/api/search?q=test" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## ⚠️ Problemas y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| "ER_ACCESS_DENIED_FOR_USER" | Contraseña incorrecta | Verificar DB_USER, DB_PASSWORD en .env |
| "ER_BAD_DB_ERROR" | BD no existe | Ejecutar: `bash setup-database.sh` |
| "Pool not initialized" | initializeDatabase() no se llamó | Verificar app.js startServer() |
| "connect ECONNREFUSED" | MySQL no está corriendo | `mysql.server start` o `docker start mysql` |
| Queries muy lentas | Índices faltantes | Agregar índices en columnas de búsqueda |

---

## 🔐 Seguridad Implementada

✅ **Prepared Statements** - Previene SQL injection  
✅ **Contraseñas Hasheadas** - bcryptjs con 10 rounds  
✅ **Pool de Conexiones** - Evita connection exhaustion  
✅ **UTF8MB4** - Soporte completo de Unicode  
✅ **Foreign Keys** - Integridad referencial  

❌ **NO Implementado Aún**
- [ ] Rate limiting de queries
- [ ] Audit logging
- [ ] Backup automático
- [ ] Encriptación de datos

---

## 📈 Performance

### Pool Settings
```javascript
connectionLimit: 10         // Máximo 10 conexiones simultáneas
queueLimit: 0              // Sin límite de requests en queue
enableKeepAlive: true      // Mantiene vivas las conexiones
keepAliveInitialDelayMs: 30000  // Ping cada 30 segundos
```

### Índices Creados
```sql
-- Búsquedas rápidas
INDEX idx_email ON users(email)
INDEX idx_user_id ON search_history(user_id)
UNIQUE unique_email ON users(email)
```

---

## 🎯 Funciones Disponibles

### Query Directa
```javascript
const results = await executeQuery(sql, values);
```

### Insertar
```javascript
const result = await insert('users', {
  email: 'test@example.com',
  password_hash: 'hashed'
});
// Retorna: { insertId, affectedRows }
```

### Buscar Uno
```javascript
const user = await findOne('users', { email: 'test@example.com' });
// Retorna: { id, email, password_hash, ... } o null
```

### Buscar Muchos
```javascript
const searches = await findMany('search_history', { user_id: 1 }, 10);
// Retorna: array de objetos
```

### Actualizar
```javascript
await update('users',
  { password_hash: 'new_hash' },
  { id: 1 }
);
```

### Eliminar
```javascript
await remove('favorite_tracks', { id: 5 });
```

---

## 📚 Documentación

- **[conexion-bd-mysql-30-abr-2026.md](../docks/conexion-bd-mysql-30-abr-2026.md)** - Guía completa
- **[autenticacion-jwt-30-abr-2026.md](../docks/autenticacion-jwt-30-abr-2026.md)** - JWT reference
- **[BackEnd/src/db/database.js](../BackEnd/src/db/database.js)** - Código comentado

---

## 🔗 Próximos Pasos

1. **✅ BD Conectada** ← COMPLETADO
2. **→ Implementar Favoritos** (POST/GET/DELETE)
3. **→ Implementar Playlists** (CRUD)
4. **→ Conectar Frontend con JWT**
5. **→ Testing completo**

