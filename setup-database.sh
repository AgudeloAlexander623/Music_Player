#!/bin/bash

# =====================================================
# SCRIPT DE SETUP DE BASE DE DATOS PARA REPRODUCTOR
# =====================================================
# Este script configura PostgreSQL para el proyecto
# Uso: bash setup-database.sh

set -e

echo "================================================"
echo "🗄️  CONFIGURACIÓN DE BASE DE DATOS - REPRODUCTOR"
echo "================================================"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql no está instalado${NC}"
    echo "Instala PostgreSQL: sudo apt-get install postgresql postgresql-contrib (Linux)"
    exit 1
fi

echo ""
echo "📋 Por favor, proporciona los siguientes datos:"
echo ""

read -p "Usuario administrador de PostgreSQL (default: postgres): " PG_ROOT_USER
PG_ROOT_USER=${PG_ROOT_USER:-postgres}

echo "Se usará autenticación por peer/socket para el usuario $PG_ROOT_USER"
echo "Si tienes contraseña, asegúrate de que pg_hba.conf acepte md5/peer"
echo ""

DB_NAME="reproductor_db"
DB_USER="reproductor_user"
read -sp "Contraseña para el usuario $DB_USER: " DB_PASSWORD
echo ""

echo ""
echo -e "${YELLOW}⏳ Configurando base de datos...${NC}"

sudo -u "$PG_ROOT_USER" psql <<EOF
-- Crear usuario
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Crear base de datos
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Asignar permisos
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Base de datos creada exitosamente${NC}"
else
    echo -e "${RED}❌ Error creando base de datos${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⏳ Importando schema...${NC}"

if [ -f "BackEnd/src/db/DataBases.sql" ]; then
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -f BackEnd/src/db/DataBases.sql

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

echo ""
echo "Generando JWT_SECRET seguro..."
JWT_SECRET=$(openssl rand -base64 32)

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Archivo .env creado desde .env.example${NC}"
fi

sed -i.bak "
s/^DB_HOST=.*/DB_HOST=localhost/
s/^DB_PORT=.*/DB_PORT=5432/
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
echo "  psql -h localhost -U $DB_USER -d $DB_NAME"
echo "  \\dt"
echo ""
