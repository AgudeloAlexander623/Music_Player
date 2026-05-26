import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function sanitizeIdentifier(name, context) {
  const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(`Invalid ${context}: "${name}"`);
  }
  return name;
}

describe('sanitizeIdentifier', () => {
  it('accepts valid table names', () => {
    assert.equal(sanitizeIdentifier('users', 'table'), 'users');
    assert.equal(sanitizeIdentifier('playlist_tracks', 'table'), 'playlist_tracks');
    assert.equal(sanitizeIdentifier('_test', 'table'), '_test');
  });

  it('rejects invalid identifiers', () => {
    assert.throws(() => sanitizeIdentifier('users; DROP TABLE users', 'table'), /Invalid table/);
    assert.throws(() => sanitizeIdentifier('users--', 'table'), /Invalid table/);
    assert.throws(() => sanitizeIdentifier('', 'table'), /Invalid table/);
    assert.throws(() => sanitizeIdentifier('user name', 'column'), /Invalid column/);
  });
});
