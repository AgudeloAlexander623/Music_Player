import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  formatErrorResponse,
} from '../utils/errors.js';

describe('AppError', () => {
  it('crea error con mensaje y statusCode por defecto 500', () => {
    const err = new AppError('Algo salió mal');
    assert.equal(err.message, 'Algo salió mal');
    assert.equal(err.statusCode, 500);
    assert.equal(err.name, 'AppError');
  });

  it('crea error con statusCode personalizado', () => {
    const err = new AppError('No autorizado', 401);
    assert.equal(err.statusCode, 401);
  });
});

describe('ValidationError', () => {
  it('tiene statusCode 400', () => {
    const err = new ValidationError('Campo requerido');
    assert.equal(err.statusCode, 400);
    assert.equal(err.name, 'ValidationError');
  });
});

describe('AuthError', () => {
  it('tiene statusCode 401 y mensaje por defecto', () => {
    const err = new AuthError();
    assert.equal(err.statusCode, 401);
    assert.equal(err.message, 'Authentication failed');
  });
});

describe('ForbiddenError', () => {
  it('tiene statusCode 403', () => {
    const err = new ForbiddenError('Acceso denegado');
    assert.equal(err.statusCode, 403);
    assert.equal(err.message, 'Acceso denegado');
  });
});

describe('NotFoundError', () => {
  it('tiene statusCode 404', () => {
    const err = new NotFoundError();
    assert.equal(err.statusCode, 404);
    assert.equal(err.message, 'Resource not found');
  });
});

describe('ConflictError', () => {
  it('tiene statusCode 409', () => {
    const err = new ConflictError('Ya existe');
    assert.equal(err.statusCode, 409);
    assert.equal(err.message, 'Ya existe');
  });
});

describe('formatErrorResponse', () => {
  it('expone el mensaje como error visible en errores 4xx', () => {
    const err = new ValidationError('Email inválido');
    const result = formatErrorResponse(err);
    assert.equal(result.error, 'Email inválido');
    assert.equal(result.statusCode, 400);
    assert.equal(result.details, undefined);
  });

  it('formatea un error genérico como 500', () => {
    const err = new Error('Algo explotó');
    const result = formatErrorResponse(err);
    assert.equal(result.statusCode, 500);
  });

  it('oculta el detalle interno en errores 5xx en producción', () => {
    process.env.NODE_ENV = 'production';
    const err = new Error('connection refused at 172.17.0.2:5432');
    const result = formatErrorResponse(err);
    assert.equal(result.error, 'Internal server error');
    assert.equal(result.details, 'Ocurrió un error inesperado');
    assert.equal(result.statusCode, 500);
    delete process.env.NODE_ENV;
  });

  it('expone el detalle interno en errores 5xx en desarrollo', () => {
    const err = new Error('connection refused at 172.17.0.2:5432');
    const result = formatErrorResponse(err);
    assert.equal(result.error, 'Internal server error');
    assert.equal(result.details, 'connection refused at 172.17.0.2:5432');
  });
});
