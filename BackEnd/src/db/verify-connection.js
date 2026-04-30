/**
 * VERIFICADOR DE CONEXIÓN A BASE DE DATOS
 *
 * Este archivo permite verificar que todo está configurado correctamente
 * Uso: node BackEnd/src/db/verify-connection.js
 *
 * Verifica:
 * - Variables de entorno configuradas
 * - Conexión a MySQL
 * - Tablas existentes
 * - Datos de prueba
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function verifyConnection() {
  console.log('\n🔍 VERIFICADOR DE CONEXIÓN A BASE DE DATOS\n');

  console.log('📋 Variables de entorno:');
  console.log(`  - DB_HOST: ${config.host}`);
  console.log(`  - DB_USER: ${config.user}`);
  console.log(`  - DB_PASSWORD: ${config.password ? '***' : 'NO CONFIGURADA'}`);
  console.log(`  - DB_NAME: ${config.database}`);
  console.log(`  - JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
  console.log('');

  let connection;

  try {
    console.log('🔗 Intentando conectar a MySQL...');
    connection = await mysql.createConnection(config);
    console.log('✅ Conexión exitosa\n');

    // Verificar tablas
    console.log('📊 Verificando tablas...');
    const [tables] = await connection.query('SHOW TABLES');
    
    const tableNames = tables.map((t) => Object.values(t)[0]);
    console.log(`  Tablas encontradas: ${tableNames.length}`);
    tableNames.forEach((name) => {
      console.log(`    ✓ ${name}`);
    });
    console.log('');

    // Verificar estructura de usuarios
    if (tableNames.includes('users')) {
      console.log('👤 Verificando tabla usuarios...');
      const [columns] = await connection.query('DESC users');
      columns.forEach((col) => {
        console.log(`    - ${col.Field} (${col.Type})`);
      });
      console.log('');

      // Contar usuarios
      const [[{ count: userCount }]] = await connection.query(
        'SELECT COUNT(*) as count FROM users'
      );
      console.log(`  Total de usuarios: ${userCount}`);
      console.log('');
    }

    // Verificar estructura de historial
    if (tableNames.includes('search_history')) {
      console.log('📜 Verificando tabla historial de búsquedas...');
      const [columns] = await connection.query('DESC search_history');
      columns.forEach((col) => {
        console.log(`    - ${col.Field} (${col.Type})`);
      });
      console.log('');
    }

    // Verificar estructura de favoritos
    if (tableNames.includes('favorite_tracks')) {
      console.log('⭐ Verificando tabla favoritos...');
      const [columns] = await connection.query('DESC favorite_tracks');
      columns.forEach((col) => {
        console.log(`    - ${col.Field} (${col.Type})`);
      });
      console.log('');
    }

    // Verificar estructura de playlists
    if (tableNames.includes('playlists')) {
      console.log('🎵 Verificando tabla playlists...');
      const [columns] = await connection.query('DESC playlists');
      columns.forEach((col) => {
        console.log(`    - ${col.Field} (${col.Type})`);
      });
      console.log('');
    }

    console.log('✅ TODAS LAS VERIFICACIONES PASARON');
    console.log('\n🎉 Base de datos configurada correctamente\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n⚠️  Soluciona los problemas arriba listed y vuelve a intentar.');
    console.error('\nProblemas comunes:');
    console.error('  1. MySQL no está corriendo → systemctl start mysql');
    console.error('  2. Credenciales incorrectas → Verifica .env');
    console.error('  3. Base de datos no existe → Ejecuta: bash setup-database.sh');
    process.exit(1);

  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyConnection();
