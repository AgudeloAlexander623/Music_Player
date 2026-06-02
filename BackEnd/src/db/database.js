import pg from 'pg';
import logger from '../utils/logger.js';



const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const PLACEHOLDER_RE = /\?/g;

let pool = null;

function sanitizeIdentifier(name, context) {
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(`Invalid ${context}: "${name}"`);
  }
  return name;
}

function convertPlaceholders(sql, values) {
  let idx = 0;
  return {
    text: sql.replace(PLACEHOLDER_RE, () => `$${++idx}`),
    values,
  };
}

export async function initializeDatabase() {
  try {
    const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missing = required.filter(v => !process.env[v]);

    if (missing.length > 0) {
      throw new Error(
        `Database configuration incomplete. Missing: ${missing.join(', ')}. Check .env file.`
      );
    }

    pool = new pg.Pool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '5432'),
      max: parseInt(process.env.DB_POOL_LIMIT || '10'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    logger.info('Base de datos conectada exitosamente', {
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      poolLimit: process.env.DB_POOL_LIMIT || '10',
    });

    return pool;
  } catch (error) {
    logger.error('Error conectando a base de datos', { error: error.message });
    throw error;
  }
}

export async function executeQuery(sql, values = []) {
  try {
    if (!pool) {
      throw new Error('Database pool not initialized. Call initializeDatabase() first.');
    }

    const query = convertPlaceholders(sql, values);
    const result = await pool.query(query);

    return result;
  } catch (error) {
    logger.error('Error en consulta SQL', { error: error.message, sql, values });
    throw error;
  }
}

export async function getConnection() {
  try {
    if (!pool) {
      throw new Error('Database pool not initialized. Call initializeDatabase() first.');
    }

    return await pool.connect();
  } catch (error) {
    logger.error('No se pudo obtener conexión del pool', { error: error.message });
    throw error;
  }
}

export async function closeDatabase() {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      logger.info('Pool de conexiones cerrado');
    }
  } catch (error) {
    logger.error('Error cerrando conexiones', { error: error.message });
  }
}

export async function insert(table, data) {
  try {
    const safeTable = sanitizeIdentifier(table, 'table name');
    const columns = Object.keys(data).map(col => sanitizeIdentifier(col, 'column name'));
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `INSERT INTO ${safeTable} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`;
    const result = await executeQuery(sql, values);

    return {
      insertId: result.rows[0].id,
      affectedRows: result.rowCount,
    };
  } catch (error) {
    logger.error('Error en insert', { error: error.message, table });
    throw error;
  }
}

export async function update(table, data, where) {
  try {
    const safeTable = sanitizeIdentifier(table, 'table name');
    const setKeys = Object.keys(data).map(col => sanitizeIdentifier(col, 'column name'));
    const whereKeys = Object.keys(where).map(col => sanitizeIdentifier(col, 'column name'));

    let idx = 0;
    const setClause = setKeys.map(key => `${key} = $${++idx}`).join(', ');
    const whereClause = whereKeys.map(key => `${key} = $${++idx}`).join(' AND ');

    const sql = `UPDATE ${safeTable} SET ${setClause} WHERE ${whereClause}`;
    const values = [...Object.values(data), ...Object.values(where)];

    const result = await executeQuery(sql, values);

    return {
      affectedRows: result.rowCount,
    };
  } catch (error) {
    logger.error('Error en update', { error: error.message, table });
    throw error;
  }
}

export async function remove(table, where) {
  try {
    const safeTable = sanitizeIdentifier(table, 'table name');
    const whereKeys = Object.keys(where).map(col => sanitizeIdentifier(col, 'column name'));

    const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

    const sql = `DELETE FROM ${safeTable} WHERE ${whereClause}`;
    const values = Object.values(where);

    const result = await executeQuery(sql, values);

    return {
      affectedRows: result.rowCount,
    };
  } catch (error) {
    logger.error('Error en delete', { error: error.message, table });
    throw error;
  }
}

export async function findById(table, id) {
  try {
    const safeTable = sanitizeIdentifier(table, 'table name');
    const result = await executeQuery(
      `SELECT * FROM ${safeTable} WHERE id = $1`,
      [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error('Error en findById', { error: error.message, table });
    throw error;
  }
}

export async function findOne(table, where) {
  try {
    const safeTable = sanitizeIdentifier(table, 'table name');
    const whereKeys = Object.keys(where).map(col => sanitizeIdentifier(col, 'column name'));

    const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

    const result = await executeQuery(
      `SELECT * FROM ${safeTable} WHERE ${whereClause}`,
      Object.values(where)
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error('Error en findOne', { error: error.message, table });
    throw error;
  }
}

export async function findMany(table, where = {}, limit = null, orderBy = null) {
  try {
    const safeTable = sanitizeIdentifier(table, 'table name');
    let sql = `SELECT * FROM ${safeTable}`;
    const values = Object.values(where);

    if (Object.keys(where).length > 0) {
      const whereKeys = Object.keys(where).map(col => sanitizeIdentifier(col, 'column name'));
      const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
      sql += ` WHERE ${whereClause}`;
    }

    if (orderBy) {
      const col = sanitizeIdentifier(orderBy.trim().split(/\s+/)[0], 'order column');
      sql += ` ORDER BY ${col}`;
    }

    if (limit !== null) {
      const safeLimit = Number(limit);
      if (!Number.isInteger(safeLimit) || safeLimit < 0) {
        throw new Error(`Invalid limit value: ${limit}`);
      }
      sql += ` LIMIT ${safeLimit}`;
    }

    const result = await executeQuery(sql, values);
    return result.rows;
  } catch (error) {
    logger.error('Error en findMany', { error: error.message, table });
    throw error;
  }
}

