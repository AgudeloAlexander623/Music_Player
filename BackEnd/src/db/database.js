/**
 * POOL DE CONEXIONES A MYSQL
 *
 * Gestiona conexiones reutilizables a la base de datos
 * - Crea un pool de conexiones (evita crear nueva conexión cada query)
 * - Reutiliza conexiones existentes
 * - Maneja timeouts y errores de conexión
 * - Proporciona métodos helper para ejecutar queries
 *
 * VENTAJAS DEL POOL:
 * ✅ Mejor performance (reusar conexiones es más rápido)
 * ✅ Menos carga en servidor MySQL
 * ✅ Manejo automático de reconexiones
 * ✅ Control de número máximo de conexiones simultáneas
 *
 * USO:
 * import { executeQuery, getConnection } from '../db/database.js';
 *
 * const results = await executeQuery(
 *   'SELECT * FROM users WHERE email = ?',
 *   [email]
 * );
 */

import mysql from 'mysql2/promise';

// Pool global de conexiones
let pool = null;

/**
 * INICIALIZAR POOL DE CONEXIONES
 *
 * Se llama una sola vez al iniciar el servidor
 * Crea un pool reutilizable para todas las queries
 *
 * PARÁMETROS DEL POOL:
 * - host: localhost (o IP/dominio del servidor MySQL)
 * - user: usuario de MySQL
 * - password: contraseña de usuario
 * - database: nombre de la BD
 * - waitForConnections: esperar si no hay conexiones disponibles
 * - connectionLimit: máximo de conexiones simultáneas (default: 10)
 * - queueLimit: máximo de requests en queue esperando conexión (default: 0 = ilimitado)
 */
export async function initializeDatabase() {
  try {
    // Validar que todas las variables de entorno necesarias existan
    const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missing = required.filter(v => !process.env[v]);

    if (missing.length > 0) {
      throw new Error(
        `Database configuration incomplete. Missing: ${missing.join(', ')}. Check .env file.`
      );
    }

    // Crear pool con configuración desde .env
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_POOL_LIMIT || '10'),
      queueLimit: 0, // Sin límite de requests en queue
      enableKeepAlive: true,
      keepAliveInitialDelayMs: 30000, // Keepalive cada 30 segundos
    });

    // Probar conexión
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    console.log('✅ Base de datos conectada exitosamente');
    console.log(`📊 Pool: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
    console.log(`🔗 Conexiones simultáneas: ${process.env.DB_POOL_LIMIT || '10'}`);

    return pool;
  } catch (error) {
    console.error('❌ Error conectando a base de datos:', error.message);
    console.error('🔍 Verifica que:');
    console.error('   - MySQL está corriendo');
    console.error('   - Variables DB_* en .env son correctas');
    console.error('   - La base de datos existe');
    throw error;
  }
}

/**
 * EJECUTAR QUERY
 *
 * Ejecuta una query SQL y retorna los resultados
 * Maneja errores automáticamente
 *
 * PARÁMETROS:
 * - sql: string con la query (usar ? para placeholders)
 * - values: array con valores para los placeholders
 *
 * RETORNA:
 * - Si es SELECT: array de filas
 * - Si es INSERT: objeto con insertId y affectedRows
 * - Si es UPDATE/DELETE: objeto con affectedRows
 *
 * EJEMPLO:
 * const user = await executeQuery(
 *   'SELECT * FROM users WHERE id = ?',
 *   [userId]
 * );
 * // Retorna: [{ id: 1, email: '...', ... }]
 */
export async function executeQuery(sql, values = []) {
  try {
    if (!pool) {
      throw new Error('Database pool not initialized. Call initializeDatabase() first.');
    }

    const connection = await pool.getConnection();

    try {
      const [results] = await connection.execute(sql, values);
      return results;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(`[DB Error] ${error.message}`);
    console.error(`[SQL] ${sql}`);
    console.error(`[Values] ${JSON.stringify(values)}`);
    throw error;
  }
}

/**
 * OBTENER CONEXIÓN DIRECTA
 *
 * Para operaciones complejas que requieren múltiples queries
 * o transacciones, obtener una conexión directa
 *
 * IMPORTANTE: Liberar conexión cuando termines
 *
 * EJEMPLO:
 * const connection = await getConnection();
 * try {
 *   await connection.beginTransaction();
 *   await connection.execute('INSERT INTO users ...');
 *   await connection.execute('INSERT INTO logs ...');
 *   await connection.commit();
 * } catch (error) {
 *   await connection.rollback();
 * } finally {
 *   connection.release();
 * }
 */
export async function getConnection() {
  try {
    if (!pool) {
      throw new Error('Database pool not initialized. Call initializeDatabase() first.');
    }

    return await pool.getConnection();
  } catch (error) {
    console.error(`[DB Error] Could not get connection: ${error.message}`);
    throw error;
  }
}

/**
 * CERRAR POOL
 *
 * Se llama al apagar el servidor para cerrar todas las conexiones correctamente
 *
 * EJEMPLO:
 * process.on('SIGTERM', async () => {
 *   await closeDatabase();
 *   process.exit(0);
 * });
 */
export async function closeDatabase() {
  try {
    if (pool) {
      await pool.end();
      console.log('✅ Pool de conexiones cerrado');
    }
  } catch (error) {
    console.error(`[DB Error] Error cerrando connexiones: ${error.message}`);
  }
}

/**
 * HELPER: Insertar un registro
 *
 * Shortcut para INSERT
 *
 * RETORNA: { insertId, affectedRows }
 */
export async function insert(table, data) {
  try {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await executeQuery(sql, values);

    return {
      insertId: result.insertId,
      affectedRows: result.affectedRows,
    };
  } catch (error) {
    console.error(`[Insert Error] ${error.message}`);
    throw error;
  }
}

/**
 * HELPER: Actualizar registros
 *
 * Shortcut para UPDATE
 *
 * RETORNA: { affectedRows }
 *
 * EJEMPLO:
 * await update('users', { name: 'Juan' }, { id: 5 });
 * // Genera: UPDATE users SET name = ? WHERE id = ?
 */
export async function update(table, data, where) {
  try {
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    const whereClause = Object.keys(where)
      .map(key => `${key} = ?`)
      .join(' AND ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const values = [...Object.values(data), ...Object.values(where)];

    const result = await executeQuery(sql, values);

    return {
      affectedRows: result.affectedRows,
    };
  } catch (error) {
    console.error(`[Update Error] ${error.message}`);
    throw error;
  }
}

/**
 * HELPER: Eliminar registros
 *
 * Shortcut para DELETE
 *
 * RETORNA: { affectedRows }
 *
 * EJEMPLO:
 * await remove('users', { id: 5 });
 * // Genera: DELETE FROM users WHERE id = ?
 */
export async function remove(table, where) {
  try {
    const whereClause = Object.keys(where)
      .map(key => `${key} = ?`)
      .join(' AND ');

    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    const values = Object.values(where);

    const result = await executeQuery(sql, values);

    return {
      affectedRows: result.affectedRows,
    };
  } catch (error) {
    console.error(`[Delete Error] ${error.message}`);
    throw error;
  }
}

/**
 * HELPER: Buscar por ID
 *
 * Shortcut para SELECT by ID
 *
 * RETORNA: objeto del registro o null si no existe
 */
export async function findById(table, id) {
  try {
    const results = await executeQuery(
      `SELECT * FROM ${table} WHERE id = ?`,
      [id]
    );
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error(`[FindById Error] ${error.message}`);
    throw error;
  }
}

/**
 * HELPER: Buscar uno por condición
 *
 * RETORNA: objeto del registro o null
 *
 * EJEMPLO:
 * const user = await findOne('users', { email: 'test@example.com' });
 */
export async function findOne(table, where) {
  try {
    const whereClause = Object.keys(where)
      .map(key => `${key} = ?`)
      .join(' AND ');

    const results = await executeQuery(
      `SELECT * FROM ${table} WHERE ${whereClause}`,
      Object.values(where)
    );

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error(`[FindOne Error] ${error.message}`);
    throw error;
  }
}

/**
 * HELPER: Buscar muchos por condición
 *
 * RETORNA: array de registros
 *
 * EJEMPLO:
 * const favorites = await findMany('favorite_tracks', { user_id: 1 });
 */
export async function findMany(table, where = {}, limit = null) {
  try {
    let sql = `SELECT * FROM ${table}`;

    if (Object.keys(where).length > 0) {
      const whereClause = Object.keys(where)
        .map(key => `${key} = ?`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
    }

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    return await executeQuery(sql, Object.values(where));
  } catch (error) {
    console.error(`[FindMany Error] ${error.message}`);
    throw error;
  }
}
