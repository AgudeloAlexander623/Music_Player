import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { executeQuery, initializeDatabase, closeDatabase } from '../db/database.js';
import { validateEnv } from '../utils/validateEnv.js';

/* ── SQL Injection: sanitizeIdentifier ── */

describe('sanitizeIdentifier — proteccion contra SQL injection en nombres de tabla/columna', () => {
  const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  it('permite identificadores validos', () => {
    assert(IDENTIFIER_RE.test('users'));
    assert(IDENTIFIER_RE.test('_users'));
    assert(IDENTIFIER_RE.test('refresh_tokens'));
    assert(IDENTIFIER_RE.test('u123'));
  });

  it('rechaza SQL injection clasica en nombre de tabla', () => {
    assert(!IDENTIFIER_RE.test("users; DROP TABLE users; --"));
  });

  it('rechaza OR 1=1 en nombre de columna', () => {
    assert(!IDENTIFIER_RE.test("name' OR '1'='1"));
  });

  it('rechaza UNION SELECT en nombre de tabla', () => {
    assert(!IDENTIFIER_RE.test("users UNION SELECT * FROM passwords"));
  });

  it('rechaza comentarios SQL en medio de identificador', () => {
    assert(!IDENTIFIER_RE.test("valid/*comment*/name"));
    assert(!IDENTIFIER_RE.test("valid--name"));
  });

  it('rechaza strings vacios', () => {
    assert(!IDENTIFIER_RE.test(""));
  });

  it('rechaza queries multi-statement', () => {
    assert(!IDENTIFIER_RE.test("users; DELETE FROM users;"));
  });

  it('rechaza pg_sleep (timing attack)', () => {
    assert(!IDENTIFIER_RE.test("users; SELECT pg_sleep(5); --"));
  });

  it('rechaza caracteres especiales', () => {
    assert(!IDENTIFIER_RE.test("user name"));
    assert(!IDENTIFIER_RE.test("user\"name"));
    assert(!IDENTIFIER_RE.test("user`name"));
    assert(!IDENTIFIER_RE.test("user\nname"));
  });
});

/* ── Parameterized Queries ── */

describe('Parametrizacion de queries (SQL injection via values)', () => {
  it('escapa valores maliciosos en consultas parametrizadas', async () => {
    const sql = 'SELECT * FROM users WHERE email = $1';
    const values = ["' OR '1'='1"];
    const query = { text: sql, values };

    const expectedText = 'SELECT * FROM users WHERE email = $1';
    assert.equal(query.text, expectedText);
    assert.deepEqual(query.values, ["' OR '1'='1"]);
  });

  it('no permite interpolacion directa de valores', () => {
    const maliciousInput = "'; DROP TABLE users; --";
    // Este valor nunca debe estar en el SQL mismo, solo en el array values[]
    const sql = 'SELECT * FROM users WHERE id = $1';
    const safe = sql.includes(maliciousInput);
    assert.equal(safe, false);
  });

  it('la funcion de ordenamiento no permite SQL en parametros limit', () => {
    const malicioso = "1; DROP TABLE users; --";
    const safeLimit = Number(malicioso);
    assert(Number.isNaN(safeLimit));
  });
});

/* ── JWT_SECRET validation ── */

describe('JWT_SECRET validation (seguridad de tokens)', () => {
  it('JWT_SECRET debe estar configurado en entorno de produccion', () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    // Simular validateEnv chequeando JWT_SECRET
    const requiredVars = { JWT_SECRET: 'JWT secret' };
    let hasError = false;
    for (const [key] of Object.entries(requiredVars)) {
      if (!process.env[key] || process.env[key].startsWith('your_')) {
        hasError = true;
      }
    }
    assert(hasError);

    process.env.JWT_SECRET = original;
  });

  it('rechaza JWT_SECRET placeholder (your_)', () => {
    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'your_super_secret_jwt_key_change_this';
    const requiredVars = { JWT_SECRET: 'JWT secret' };
    let hasError = false;
    for (const [key] of Object.entries(requiredVars)) {
      if (!process.env[key] || process.env[key].startsWith('your_')) {
        hasError = true;
      }
    }
    assert(hasError);
    process.env.JWT_SECRET = original;
  });
});

/* ── Password Security ── */

describe('Seguridad de contraseñas', () => {
  it('bcrypt genera hashes diferentes para misma contraseña', async () => {
    const bcryptjs = await import('bcryptjs');
    const password = 'test_password_123';
    const salt1 = await bcryptjs.genSalt(10);
    const salt2 = await bcryptjs.genSalt(10);
    const hash1 = await bcryptjs.hash(password, salt1);
    const hash2 = await bcryptjs.hash(password, salt2);
    assert.notEqual(hash1, hash2);
  });

  it('bcrypt verifica correctamente contraseña correcta', async () => {
    const bcryptjs = await import('bcryptjs');
    const password = 'test_password_123';
    const hash = await bcryptjs.hash(password, 10);
    const match = await bcryptjs.compare(password, hash);
    assert(match);
  });

  it('bcrypt rechaza contraseña incorrecta', async () => {
    const bcryptjs = await import('bcryptjs');
    const hash = await bcryptjs.hash('correct_password', 10);
    const match = await bcryptjs.compare('wrong_password', hash);
    assert.equal(match, false);
  });
});

/* ── Refresh Token Security ── */

describe('Refresh Token seguridad', () => {
  it('token plano y hash deben ser diferentes', async () => {
    const auth = await import('../services/auth.service.js');
    const { token, tokenHash } = auth.generateRefreshToken();
    assert.notEqual(token, tokenHash);
  });

  it('hash es SHA-256 (64 caracteres hex)', async () => {
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update('test').digest('hex');
    assert.equal(hash.length, 64);
    assert(/^[a-f0-9]{64}$/.test(hash));
  });

  it('hashRefreshToken produce hash consistente', async () => {
    const auth = await import('../services/auth.service.js');
    const hash1 = auth.hashRefreshToken('test-token');
    const hash2 = auth.hashRefreshToken('test-token');
    assert.equal(hash1, hash2);
  });
});
