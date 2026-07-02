import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

/* ── Helpers ── */

function createTestApp() {
  const app = express();
  const corsOrigins = ['http://allowed-origin.com', 'http://localhost:5173'];

  app.use(cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }));

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.disable('x-powered-by');

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

function createRateLimitedApp() {
  const app = express();
  const limiter = rateLimit({
    windowMs: 1000,
    max: 3,
    message: { error: 'Demasiadas solicitudes.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
  app.get('/test', (_req, res) => res.json({ ok: true }));
  return app;
}

/* ── CORS ── */

describe('CORS', () => {
  it('permite origenes de la whitelist', async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const { port } = server.address();
    const res = await fetch(`http://localhost:${port}/api/health`, {
      headers: { Origin: 'http://allowed-origin.com' },
    });
    server.close();
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://allowed-origin.com');
  });

  it('permite localhost:5173', async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const { port } = server.address();
    const res = await fetch(`http://localhost:${port}/api/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    server.close();
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  });

  it('NO permite origenes fuera de la whitelist', async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const { port } = server.address();
    const res = await fetch(`http://localhost:${port}/api/health`, {
      headers: { Origin: 'https://evil-site.com' },
    });
    server.close();
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });

  it('no expone metodos peligrosos en ACAOM', async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const { port } = server.address();
    const res = await fetch(`http://localhost:${port}/api/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://allowed-origin.com',
        'Access-Control-Request-Method': 'DELETE',
      },
    });
    server.close();
    const methods = res.headers.get('access-control-allow-methods') || '';
    assert(methods.includes('GET'));
    assert(!methods.includes('TRACE'));
    assert(!methods.includes('CONNECT'));
  });

  it('solo expone headers necesarios en ACAH', async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const { port } = server.address();
    const res = await fetch(`http://localhost:${port}/api/health`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://allowed-origin.com' },
    });
    server.close();
    const headers = res.headers.get('access-control-allow-headers') || '';
    assert(headers.includes('Content-Type'));
    assert(headers.includes('Authorization'));
  });
});

/* ── Helmet / Security Headers ── */

describe('Security Headers (Helmet)', () => {
  let server, port;
  before(() => {
    const app = createTestApp();
    server = app.listen(0);
    port = server.address().port;
  });
  after(() => server.close());

  it('incluye X-Content-Type-Options: nosniff', async () => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });

  it('incluye X-Frame-Options (SAMEORIGIN o DENY)', async () => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    const value = res.headers.get('x-frame-options');
    assert(value === 'SAMEORIGIN' || value === 'DENY');
  });

  it('incluye Strict-Transport-Security', async () => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    assert(res.headers.get('strict-transport-security'));
  });

  it('incluye X-DNS-Prefetch-Control', async () => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    assert(res.headers.get('x-dns-prefetch-control'));
  });

  it('incluye X-Download-Options: noopen', async () => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    assert.equal(res.headers.get('x-download-options'), 'noopen');
  });

  it('incluye X-Permitted-Cross-Domain-Policies', async () => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    assert(res.headers.get('x-permitted-cross-domain-policies'));
  });

  it('incluye Cross-Origin-Resource-Policy', async () => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    assert.equal(res.headers.get('cross-origin-resource-policy'), 'cross-origin');
  });

  it('NO incluye X-Powered-By (express)', async () => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  it('NO incluye Content-Security-Policy (deshabilitado explicitamente)', async () => {
    const res = await fetch(`http://localhost:${port}/api/health`);
    assert.equal(res.headers.get('content-security-policy'), null);
  });
});

/* ── Rate Limiting ── */

describe('Rate Limiting', () => {
  it('bloquea despues de exceder el limite', async () => {
    const app = createRateLimitedApp();
    const server = app.listen(0);
    const { port } = server.address();

    const url = `http://localhost:${port}/test`;

    const r1 = await fetch(url); assert(r1.ok);
    const r2 = await fetch(url); assert(r2.ok);
    const r3 = await fetch(url); assert(r3.ok);
    const r4 = await fetch(url);

    server.close();

    assert.equal(r4.status, 429);
    const body = await r4.json();
    assert(body.error);
  });

  it('incluye headers de rate-limit', async () => {
    const app = createRateLimitedApp();
    const server = app.listen(0);
    const { port } = server.address();

    const res = await fetch(`http://localhost:${port}/test`);
    server.close();

    assert(res.headers.get('ratelimit-limit'));
    assert(res.headers.get('ratelimit-remaining'));
  });
});

/* ── JSON Body Limit ── */

describe('JSON Body Limit', () => {
  it('rechaza payloads mayores a 1MB', async () => {
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.post('/test', (req, res) => res.json({ ok: true }));
    const server = app.listen(0);
    const { port } = server.address();

    const bigData = 'x'.repeat(2 * 1024 * 1024);
    const res = await fetch(`http://localhost:${port}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: bigData }),
    });

    server.close();
    assert.equal(res.status, 413);
  });
});
