#!/bin/bash

# =====================================================
# SCRIPT DE SETUP DE BASE DE DATOS PARA REPRODUCTOR
# =====================================================
# Este script configura MySQL para el proyecto
# Uso: bash setup-database.sh

set -e

echo "================================================"
echo "🗄️  CONFIGURACIÓN DE BASE DE DATOS - REPRODUCTOR"
echo "================================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validar que mysql esté instalado
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}Error: mysql no está instalado${NC}"
    echo "Instala MySQL: brew install mysql (Mac) o sudo apt-get install mysql-server (Linux)"
    exit 1
fi

echo ""
echo "📋 Por favor, proporciona los siguientes datos:"
echo ""

# Solicitar credenciales
read -p "Usuario root de MySQL: " ROOT_USER
read -sp "Contraseña root de MySQL: " ROOT_PASSWORD
echo ""

# Variables de la BD
DB_NAME="reproductor_db"
DB_USER="reproductor_user"
read -sp "¿Contraseña para el usuario $DB_USER?: " DB_PASSWORD
echo ""

echo ""
echo -e "${YELLOW}⏳ Configurando base de datos...${NC}"

# Crear BD y usuario
mysql -u "$ROOT_USER" -p"$ROOT_PASSWORD" <<EOF
-- Crear base de datos
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear usuario
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';

-- Asignar permisos
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;

-- Mostrar confirmación
SELECT CONCAT('✅ BD ', database(), ' creada') AS status;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Base de datos creada exitosamente${NC}"
else
    echo -e "${RED}❌ Error creando base de datos${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⏳ Importando schema...${NC}"

# Importar schema
if [ -f "BackEnd/src/db/DataBases.sql" ]; then
    mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < BackEnd/src/db/DataBases.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Schema importado exitosamente${NC}"
    else
        echo -e "${RED}❌ Error importando schema${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Archivo DataBases.sql no encontrado${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⏳ Creando archivo .env...${NC}"

# Leer JWT_SECRET del usuario o generar uno
echo ""
echo "Generando JWT_SECRET seguro..."
JWT_SECRET=$(openssl rand -base64 32)

# Crear .env si no existe
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Archivo .env creado desde .env.example${NC}"
fi

# Actualizar .env con variables de BD
sed -i.bak "
s/^DB_HOST=.*/DB_HOST=localhost/
s/^DB_USER=.*/DB_USER=$DB_USER/
s/^DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/
s/^DB_NAME=.*/DB_NAME=$DB_NAME/
s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/
" .env

rm -f .env.bak

echo -e "${GREEN}✅ Variables de entorno actualizadas${NC}"

echo ""
echo "================================================"
echo -e "${GREEN}🎉 CONFIGURACIÓN COMPLETADA${NC}"
echo "================================================"
echo ""
echo "📝 Información de conexión guardada en .env"
echo ""
echo "Próximos pasos:"
echo "  1. npm install en BackEnd/"
echo "  2. npm run dev en BackEnd/"
echo ""
echo "Para verificar la conexión:"
echo "  mysql -u $DB_USER -p -h localhost $DB_NAME"
echo "  SHOW TABLES;"
echo ""
