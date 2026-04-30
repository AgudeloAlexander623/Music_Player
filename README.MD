# 🎵 REPRODUCTOR DE MÚSICA

> **Spotify-Inspired Music App (Proyecto Legal & Educativo)**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19+-blue.svg)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)](https://mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📋 Descripción

Este proyecto es una **aplicación web fullstack** inspirada en Spotify, desarrollada con fines educativos, que demuestra cómo construir una plataforma musical moderna utilizando APIs públicas y datos abiertos.

**🎯 Objetivos principales:**
- ✅ Aprender arquitectura fullstack moderna
- ✅ Integrar múltiples APIs musicales de forma legal
- ✅ Implementar autenticación JWT segura
- ✅ Manejar datos musicales reales
- ✅ Crear un proyecto sólido para portafolio

**⚠️ Importante:** Este proyecto respeta completamente las limitaciones legales relacionadas con derechos de autor. NO busca reemplazar Spotify ni distribuir contenido protegido.

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- ⚛️ **React 19** - Framework SPA moderno
- ⚡ **Vite** - Build tool ultrarrápido
- 🎨 **CSS3** - Estilos responsive nativos
- 🌐 **Axios** - Cliente HTTP para APIs

### Backend
- 🟢 **Node.js 18+** - Runtime JavaScript
- 🚀 **Express.js 5** - Framework web minimalista
- 🔐 **JWT** - Autenticación de tokens
- 📡 **Axios** - Cliente HTTP para APIs externas

### Base de Datos
- 🐬 **MySQL 8.0+** - Base de datos relacional
- 🔄 **mysql2** - Driver nativo de MySQL para Node.js

### APIs Externas
- 🎵 **Spotify Web API** - Búsqueda y metadata musical
- 🎶 **MusicBrainz API** - Base de datos abierta de metadata
- 🎼 **Free Music Archive (FMA)** - Música 100% legal (planeado)

### Desarrollo
- 📦 **npm** - Gestor de dependencias
- 🔄 **nodemon** - Recarga automática en desarrollo
- 📝 **ESLint** - Linting de código

---

## 🚀 Guía de Instalación y Setup

### 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js 18+** - [Descargar](https://nodejs.org/)
- **MySQL 8.0+** - [Descargar](https://dev.mysql.com/downloads/mysql/)
- **Git** - [Descargar](https://git-scm.com/)
- **Cuenta de Spotify Developer** - [Crear](https://developer.spotify.com/dashboard)

### 🔧 Paso 1: Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd Reproductor
```

### 🔧 Paso 2: Instalar Dependencias

#### Backend
```bash
cd BackEnd
npm install
```

#### Frontend
```bash
cd ../FrontEnd/mi-app
npm install
```

#### Volver a la raíz
```bash
cd ../..
```

### 🔧 Paso 3: Configurar Variables de Entorno

#### 3.1 Crear archivo .env
```bash
# Copia el archivo de ejemplo
cp .env.example .env
```

#### 3.2 Configurar credenciales de Spotify

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Crea una nueva aplicación
3. Ve a **Settings > Basic Information**
4. Copia el **Client ID** y **Client Secret**

#### 3.3 Editar .env

Abre `.env` y configura:

```env
# Credenciales de Spotify (OBLIGATORIAS)
SPOTIFY_CLIENT_ID=tu_client_id_aqui
SPOTIFY_CLIENT_SECRET=tu_client_secret_aqui

# Puerto del servidor (opcional, default: 4000)
PORT=4000

# Base de datos MySQL (OBLIGATORIAS)
DB_HOST=localhost
DB_USER=reproductor_user
DB_PASSWORD=tu_password_mysql_segura
DB_NAME=reproductor_db
DB_POOL_LIMIT=10

# JWT Secret (cambia esto en producción)
JWT_SECRET=genera_uno_con_openssl_rand_-base64_32
```

### 🔧 Paso 4: Configurar Base de Datos MySQL

**⚠️ IMPORTANTE: La BD es OBLIGATORIA para que funcione la autenticación**

#### Opción A: Setup Automático (RECOMENDADO)

```bash
# Hacer el script ejecutable
chmod +x setup-database.sh

# Ejecutar el setup
bash setup-database.sh
# Te pedirá:
# - Usuario root de MySQL
# - Contraseña root
# - Contraseña para reproductor_user
# Y configurará todo automáticamente
```

#### Opción B: Setup Manual

**Requisito previo: MySQL debe estar instalado y corriendo**

```bash
# Linux
sudo apt-get install mysql-server
sudo systemctl start mysql

# Mac
brew install mysql
brew services start mysql

# Windows
# Descargar desde: https://dev.mysql.com/downloads/mysql/
```

**Crear BD y usuario:**

```bash
# Conectar a MySQL
mysql -u root -p

# Dentro de MySQL, ejecutar:
CREATE DATABASE reproductor_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'reproductor_user'@'localhost' IDENTIFIED BY 'tu_password_aqui';
GRANT ALL PRIVILEGES ON reproductor_db.* TO 'reproductor_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Importar schema:**

```bash
mysql -u reproductor_user -p reproductor_db < BackEnd/src/db/DataBases.sql
# Ingresa tu password cuando te lo pida
```

#### Opción C: Docker

```bash
# Ejecutar MySQL en container
docker run --name reproductor-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=reproductor_db \
  -p 3306:3306 \
  -d mysql:8.0

# Luego sigue con "Importar schema" (Opción B)
```

**Verificar conexión:**

```bash
# En BackEnd/
npm run db:verify
# Deberías ver: ✅ TODAS LAS VERIFICACIONES PASARON
```

### 🔧 Paso 5: Ejecutar la Aplicación

#### Opción A: Ejecutar por separado (Recomendado para desarrollo)

**Terminal 1 - Backend:**
```bash
cd BackEnd
npm run dev
# Servidor corriendo en http://localhost:4000
```

**Terminal 2 - Frontend:**
```bash
cd FrontEnd/mi-app
npm run dev
# Aplicación corriendo en http://localhost:5173
```

#### Opción B: Script unificado (Próximamente)
```bash
# TODO: Crear script para ejecutar ambos simultáneamente
npm run start
```

### 🔧 Paso 6: Verificar Instalación

1. **Backend:** Visita `http://localhost:4000/api/search?q=queen`
2. **Frontend:** Visita `http://localhost:5173`
3. **Buscar música:** Prueba buscar "Queen" o cualquier artista

---

## 📁 Estructura del Proyecto

```
Reproductor/
├── 📁 BackEnd/                    # API REST
│   ├── 📁 src/
│   │   ├── app.js                # Servidor principal
│   │   ├── 📁 config/            # Configuraciones
│   │   ├── 📁 controllers/       # Controladores de rutas
│   │   ├── 📁 db/               # Scripts de BD
│   │   ├── 📁 routes/           # Definición de rutas
│   │   ├── 📁 services/         # Lógica de negocio
│   │   └── 📁 utils/            # Utilidades
│   └── package.json
├── 📁 FrontEnd/                  # Aplicación React
│   └── 📁 mi-app/
│       ├── 📁 src/
│       │   ├── App.jsx          # Componente principal
│       │   ├── main.jsx         # Punto de entrada
│       │   └── 📁 assets/       # Recursos estáticos
│       ├── index.html
│       └── package.json
├── 📁 docks/                     # Documentación
├── .env.example                  # Variables de entorno (ejemplo)
├── .gitignore                    # Archivos ignorados por Git
└── README.MD                     # Esta documentación
```

---

## 🔌 APIs Utilizadas

### 🎵 Spotify Web API
- **Uso:** Búsqueda de canciones, artistas y álbumes
- **Autenticación:** Client Credentials Flow
- **Límite:** 1000 requests/hora por defecto
- **Documentación:** [Spotify Web API](https://developer.spotify.com/documentation/web-api/)

### 🎶 MusicBrainz API
- **Uso:** Metadata musical adicional
- **Autenticación:** No requerida
- **Límite:** 1 request/segundo
- **Documentación:** [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API)

### 🎼 Free Music Archive (Planeado)
- **Uso:** Reproducción completa de música libre
- **Licencia:** Creative Commons
- **Estado:** Pendiente de implementación

---

## 🧪 Testing y Desarrollo

### Ejecutar Tests
```bash
# Backend
cd BackEnd
npm test

# Frontend
cd ../FrontEnd/mi-app
npm test
```

### Desarrollo con Hot Reload
```bash
# Backend (con nodemon)
cd BackEnd
npm run dev

# Frontend (con Vite)
cd FrontEnd/mi-app
npm run dev
```

### Linting
```bash
# Backend
cd BackEnd
npm run lint

# Frontend
cd FrontEnd/mi-app
npm run lint
```

---

## 🚀 Deployment

### Variables de Producción
Para producción, configura estas variables adicionales:

```env
NODE_ENV=production
JWT_SECRET=clave_muy_segura_para_produccion
DB_HOST=tu_servidor_mysql_produccion
```

### Build para Producción
```bash
# Frontend
cd FrontEnd/mi-app
npm run build

# Backend (si es necesario)
cd ../../BackEnd
npm run build
```

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 📞 Soporte

Si tienes problemas:

1. Revisa la [documentación de troubleshooting](docks/)
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que MySQL esté corriendo
4. Revisa los logs del backend para errores específicos

---

## 🎯 Roadmap

- [ ] ✅ Búsqueda básica funcional
- [ ] 🔄 Autenticación de usuarios
- [ ] 📱 Interfaz móvil responsive
- [ ] 🎵 Reproducción completa con FMA
- [ ] 📋 Sistema de playlists
- [ ] 🔍 Búsqueda avanzada con filtros
- [ ] 🌐 Internacionalización (i18n)
- [ ] 📊 Dashboard de estadísticas
- [ ] 🔧 Configuración Docker
- [ ] 🚀 CI/CD Pipeline

---

**⭐ Si te gusta este proyecto, dale una estrella en GitHub!**
🧱 Arquitectura del proyecto
Frontend (React)
   ↓
Backend (Node.js API)
   ↓
----------------------------------
| Spotify API                    |
| Free Music Archive API        |
| MusicBrainz API               |
----------------------------------
   ↓
Base de Datos (MySQL)
🚀 Funcionalidades principales
🔍 Búsqueda de canciones y artistas
🎧 Reproducción de previews (Spotify)
🎵 Reproducción completa (música libre - FMA)
📀 Visualización de álbumes
👤 Autenticación de usuarios
📂 Gestión de playlists
📊 Recomendaciones musicales
❤️ Favoritos (opcional)
⚠️ Limitaciones legales

Este proyecto respeta las políticas de uso de cada API:

❌ No se descargan canciones protegidas
❌ No se distribuye música con copyright
❌ No se accede a contenido privado sin autorización

✔ Solo se usan:

Previews de Spotify (30 segundos)
Música libre y abierta (FMA)
Metadata pública (MusicBrainz)
🎓 Enfoque educativo

Este proyecto está diseñado para:

Estudiantes de desarrollo de software
Desarrolladores junior/intermedios
Personas interesadas en arquitectura fullstack
💡 Inspiración

Se espera que este proyecto:

Inspire a otros a construir aplicaciones reales
Promueva el uso de APIs de forma ética
Fomente el aprendizaje práctico
🛠️ Instalación (próximamente)

Se documentará paso a paso:

Configuración del entorno
Variables de entorno
Ejecución del frontend y backend
Integración de APIs
📌 Estado del proyecto

🚧 En desarrollo

🤝 Contribuciones

Las contribuciones son bienvenidas:

Mejoras de UI/UX
Nuevas funcionalidades
Optimización de código
📜 Licencia

Este proyecto es de uso educativo.
Verifica las licencias de cada API antes de usar en producción.

✨ Autor

Desarrollado como proyecto educativo para demostrar habilidades en desarrollo fullstack moderno.

🚀 Próximos pasos
Implementación del backend
Integración de autenticación
Construcción del reproductor
UI estilo Spotify

“Aprender haciendo es la mejor forma de crecer como desarrollador.”