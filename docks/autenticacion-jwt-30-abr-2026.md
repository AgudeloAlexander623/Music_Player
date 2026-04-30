. Autenticación JWT - 30 de Abril de 2026

## 🎯 Resumen de la Implementación

Se implementó un sistema completo de autenticación JWT con:
- ✅ Registro de usuarios con contraseñas hasheadas
- ✅ Login con generación de tokens JWT
- ✅ Middleware de protección para rutas autenticadas
- ✅ Verificación de tokens
- ✅ Schema de base de datos para usuarios

---

## 📁 Archivos Creados

### Backend
1. **`BackEnd/src/services/auth.service.js`**
   - Funciones core: hashPassword, comparePassword, generateToken, verifyToken
   - Manejo de errores personalizado
   - Comentarios detallados de cada función

2. **`BackEnd/src/controllers/auth.controller.js`**
   - Endpoints: register, login, verify
   - Validación de entrada
   - Integración con auth.service.js
   - (Preparado para conectar a BD cuando esté lista)

3. **`BackEnd/src/routes/auth.routes.js`**
   - Define rutas REST para autenticación
   - POST /api/auth/register
   - POST /api/auth/login
   - POST /api/auth/verify

4. **`BackEnd/src/middleware/verifyToken.js`**
   - Middleware para proteger rutas
   - Validación de token en Authorization header
   - Agrega `req.user` con datos del usuario

5. **`BackEnd/src/db/DataBases.sql` (actualizado)**
   - Nueva tabla `users` con email único
   - Tabla `favorite_tracks` para favoritos
   - Tabla `search_history` para historial
   - Tabla `playlists` y `playlist_tracks`

---

## 🚀 Cómo Usar la Autenticación

### 1. Environmental Setup

Ver en `.env.example` que tienes estas variables:

```env
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=reproductor_db
```

Para generar un JWT_SECRET seguro:
```bash
openssl rand -base64 32
```

### 2. Endpoints Disponibles

#### 📍 POST `/api/auth/register`
Crear nueva cuenta

**Request:**
```json
{
  "email": "usuario@example.com",
  "password": "password123"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": 1,
    "email": "usuario@example.com"
  }
}
```

**Errores:**
- `400 Bad Request` - Email/contraseña faltante o inválida
- `409 Conflict` - Email ya registrado (cuando BD esté conectada)

#### 📍 POST `/api/auth/login`
Iniciar sesión

**Request:**
```json
{
  "email": "usuario@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": 1,
    "email": "usuario@example.com"
  }
}
```

**Errores:**
- `400 Bad Request` - Email/contraseña faltante
- `401 Unauthorized` - Credenciales incorrectas

#### 📍 POST `/api/auth/verify`
Verificar que un token es válido

**Request:**
```
Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token is valid",
  "user": {
    "userId": 1,
    "email": "usuario@example.com"
  }
}
```

**Errores:**
- `401 Unauthorized` - Token faltante, inválido o expirado

---

## 🛡️ Proteger Rutas con JWT

Cuando quieras que una ruta requiera autenticación, usa el middleware:

```javascript
import { verifyTokenMiddleware } from '../middleware/verifyToken.js';

// Ruta protegida
router.post('/favoritos', verifyTokenMiddleware, agregarFavorito);

// En el controller, tienes acceso a req.user:
export const agregarFavorito = async (req, res) => {
  const userId = req.user.userId;  // ✅ Obtener userId autenticado
  const email = req.user.email;    // ✅ Obtener email
  
  // ... resto de la lógica
};
```

---

## 🔄 Estructura del Token JWT

Los tokens JWT contienen:

**Header:**
```json
{ "alg": "HS256", "typ": "JWT" }
```

**Payload:**
```json
{
  "userId": 1,
  "email": "usuario@example.com",
  "iat": 1704067200,  // issued at
  "exp": 1704153600   // expires at (24 horas)
}
```

**Signature:**
```
HMACSHA256(header + payload, JWT_SECRET)
```

---

## ⚠️ Consideraciones de Seguridad

### ✅ Lo Que Está Implementado
- Contraseñas hasheadas con bcryptjs (10 rounds)
- Tokens JWT con expiración (24 horas)
- Validación de entrada (email format, password length)
- Hash secreto con JWT_SECRET

### 🔄 Lo Que Necesita Hacer el Frontend
1. **Guardar token**: Cuando el usuario hace login, guardar el token en localStorage
   ```javascript
   localStorage.setItem('auth_token', response.token);
   ```

2. **Enviar token en requests**: Agregar Authorization header en requests a rutas protegidas
   ```javascript
   fetch('/api/favoritos', {
     headers: {
       'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
     }
   });
   ```

3. **Manejar expiración**: El token expira en 24h. Implementar renovación de token o pedir re-login

### 🚨 Lo Que Falta Implementar
- [ ] Refresh tokens (renovar sin pedir login de nuevo)
- [ ] Rate limiting en endpoints de auth (prevenir brute force)
- [ ] HTTPS en producción (no enviar tokens por HTTP simple)
- [ ] Session revoking (logout: agregar token a blacklist)
- [ ] 2FA (autenticación de dos factores)

---

## 🧪 Testing Manual con cURL

### Registrar usuario
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Verificar token
```bash
curl -X POST http://localhost:4000/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔗 Integración con Base de Datos

**PRÓXIMO PASO**: Conectar los controladores a la BD

En `auth.controller.js`, busca `TODO: Cuando BD esté conectada:` para ver dónde agregar:

1. Búsqueda de usuario por email
2. Inserción de nuevo usuario
3. Validación de email duplicado

Ejemplo de lo que se agregará:
```javascript
// En auth.controller.js register()
const existingUser = await db.query(
  'SELECT id FROM users WHERE email = ?',
  [email]
);

if (existingUser.length > 0) {
  return res.status(409).json({ error: 'Email already registered' });
}

const result = await db.query(
  'INSERT INTO users (email, password_hash) VALUES (?, ?)',
  [email, hashedPassword]
);

const userId = result.insertId;
```

---

## 📊 Próximas Tareas en Orden

1. **Conectar BD MySQL** - Para hacer persistencia real
2. **Agregar endpoint de favoritos** - POST /api/favorites (protegido)
3. **Agregar endpoint de playlists** - CRUD operations (protegido)
4. **Frontend JWT**: Guardar token, enviar en headers, manejar expiración
5. **Refresh tokens** - Para renovar sin re-login

---

## 📚 Archivos de Referencia

- [JWT.io](https://jwt.io) - Verificar/decodificar tokens
- [bcryptjs Docs](https://www.npmjs.com/package/bcryptjs)
- [Express Middleware](https://expressjs.com/en/guide/using-middleware.html)

