import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
};

async function verifyConnection() {
  console.log('\n🔍 VERIFICADOR DE CONEXIÓN A BASE DE DATOS\n');
  console.log('📋 Variables de entorno:');
  console.log(`  - DB_HOST: ${config.host}`);
  console.log(`  - DB_PORT: ${config.port}`);
  console.log(`  - DB_USER: ${config.user}`);
  console.log(`  - DB_PASSWORD: ${config.password ? '***' : 'NO CONFIGURADA'}`);
  console.log(`  - DB_NAME: ${config.database}`);
  console.log(`  - JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Configurado' : '❌ NO CONFIGURADO'}`);
  console.log('');

  let client;

  try {
    console.log('🔗 Intentando conectar a PostgreSQL...');
    const pool = new pg.Pool(config);
    client = await pool.connect();
    console.log('✅ Conexión exitosa\n');

    console.log('📊 Verificando tablas...');
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);

    const tableNames = tablesResult.rows.map(r => r.table_name);
    console.log(`  Tablas encontradas: ${tableNames.length}`);
    tableNames.forEach((name) => {
      console.log(`    ✓ ${name}`);
    });
    console.log('');

    if (tableNames.includes('users')) {
      console.log('👤 Verificando tabla usuarios...');
      const columns = await client.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
        ORDER BY ordinal_position
      `);
      columns.rows.forEach((col) => {
        console.log(`    - ${col.column_name} (${col.data_type})`);
      });
      console.log('');

      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`  Total de usuarios: ${userCount.rows[0].count}`);
      console.log('');
    }

    if (tableNames.includes('search_history')) {
      console.log('📜 Verificando tabla historial de búsquedas...');
      const columns = await client.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'search_history'
        ORDER BY ordinal_position
      `);
      columns.rows.forEach((col) => {
        console.log(`    - ${col.column_name} (${col.data_type})`);
      });
      console.log('');
    }

    if (tableNames.includes('favorite_tracks')) {
      console.log('⭐ Verificando tabla favoritos...');
      const columns = await client.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'favorite_tracks'
        ORDER BY ordinal_position
      `);
      columns.rows.forEach((col) => {
        console.log(`    - ${col.column_name} (${col.data_type})`);
      });
      console.log('');
    }

    if (tableNames.includes('playlists')) {
      console.log('🎵 Verificando tabla playlists...');
      const columns = await client.query(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'playlists'
        ORDER BY ordinal_position
      `);
      columns.rows.forEach((col) => {
        console.log(`    - ${col.column_name} (${col.data_type})`);
      });
      console.log('');
    }

    console.log('✅ TODAS LAS VERIFICACIONES PASARON');
    console.log('\n🎉 Base de datos configurada correctamente\n');

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n⚠️  Soluciona los problemas arriba listados y vuelve a intentar.');
    console.error('\nProblemas comunes:');
    console.error('  1. PostgreSQL no está corriendo → sudo systemctl start postgresql');
    console.error('  2. Credenciales incorrectas → Verifica .env');
    console.error('  3. Base de datos no existe → Crea la BD manualmente');
    process.exit(1);

  } finally {
    if (client) {
      client.release();
    }
  }
}

verifyConnection();
