import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  addFavoriteSchema,
  createPlaylistSchema,
  searchQuerySchema,
} from '../utils/validation.js';
import { ValidationError } from '../utils/errors.js';

describe('validate()', () => {
  it('retorna datos validados si pasa el schema', () => {
    const data = validate(registerSchema, {
      email: 'test@example.com',
      password: '123456',
      username: 'testuser',
    });
      assert.equal(data.email, 'test@example.com');
      assert.equal(data.username, 'testuser');
  });

  it('lanza ValidationError si falla la validación', () => {
    assert.throws(
      () => validate(registerSchema, { email: 'invalido', password: '12' }),
      ValidationError,
    );
  });
});

describe('registerSchema', () => {
  it('acepta datos válidos', () => {
    const result = registerSchema.safeParse({
      email: 'user@test.com',
      password: 'abcdef',
      username: ' user ',
    });
    assert(result.success);
      assert.equal(result.data.username, 'user');
  });

  it('rechaza email inválido', () => {
    const result = registerSchema.safeParse({
      email: 'notanemail',
      password: '123456',
      username: 'user',
    });
    assert(!result.success);
  });

  it('rechaza password menor a 6 caracteres', () => {
    const result = registerSchema.safeParse({
      email: 'user@test.com',
      password: '12345',
      username: 'user',
    });
    assert(!result.success);
  });

  it('rechaza username menor a 3 caracteres', () => {
    const result = registerSchema.safeParse({
      email: 'user@test.com',
      password: '123456',
      username: 'ab',
    });
    assert(!result.success);
  });
});

describe('loginSchema', () => {
  it('acepta datos válidos', () => {
    const result = loginSchema.safeParse({
      email: 'user@test.com',
      password: 'anything',
    });
    assert(result.success);
  });

  it('rechaza email vacío', () => {
    const result = loginSchema.safeParse({ email: '', password: '123' });
    assert(!result.success);
  });
});

describe('refreshTokenSchema', () => {
  it('acepta token presente', () => {
    const result = refreshTokenSchema.safeParse({ refresh_token: 'abc123' });
    assert(result.success);
  });

  it('rechaza token vacío', () => {
    const result = refreshTokenSchema.safeParse({ refresh_token: '' });
    assert(!result.success);
  });
});

describe('addFavoriteSchema', () => {
  it('acepta datos válidos', () => {
    const result = addFavoriteSchema.safeParse({
      external_track_id: 'spotify:track:123',
      source: 'deezer',
      track_title: 'Song',
    });
    assert(result.success);
  });

  it('rechaza source inválido', () => {
    const result = addFavoriteSchema.safeParse({
      external_track_id: '123',
      source: 'invalid',
      track_title: 'Song',
    });
    assert(!result.success);
  });

  it('acepta todas las fuentes reales de los plugins', () => {
    const sources = [
      'spotify',
      'deezer',
      'youtube',
      'youtube_music',
      'musicbrainz',
      'fma',
      'internetarchive',
      'audius',
    ];
    for (const source of sources) {
      const result = addFavoriteSchema.safeParse({
        external_track_id: '123',
        source,
        track_title: 'Song',
      });
      assert(result.success, `debería aceptar source=${source}`);
    }
  });

  it('rechaza la fuente legacy con guion youtube-music', () => {
    const result = addFavoriteSchema.safeParse({
      external_track_id: '123',
      source: 'youtube-music',
      track_title: 'Song',
    });
    assert(!result.success);
  });

  it('acepta y conserva video_id para tracks de YouTube', () => {
    const result = addFavoriteSchema.safeParse({
      external_track_id: '123',
      source: 'youtube',
      track_title: 'Song',
      video_id: 'dQw4w9WgXcQ',
    });
    assert(result.success);
    assert.equal(result.data.video_id, 'dQw4w9WgXcQ');
  });

  it('video_id es null por defecto si no se envía', () => {
    const result = addFavoriteSchema.safeParse({
      external_track_id: '123',
      source: 'deezer',
      track_title: 'Song',
    });
    assert(result.success);
    assert.equal(result.data.video_id, null);
  });
});

describe('createPlaylistSchema', () => {
  it('acepta nombre válido', () => {
    const result = createPlaylistSchema.safeParse({ name: '  Mi playlist  ' });
    assert(result.success);
      assert.equal(result.data.name, 'Mi playlist');
  });

  it('rechaza nombre vacío', () => {
    const result = createPlaylistSchema.safeParse({ name: '' });
    assert(!result.success);
  });
});

describe('searchQuerySchema', () => {
  it('acepta query de 2+ caracteres', () => {
    const result = searchQuerySchema.safeParse({ q: '  ab  ' });
    assert(result.success);
      assert.equal(result.data.q, 'ab');
  });

  it('rechaza query menor a 2 caracteres', () => {
    const result = searchQuerySchema.safeParse({ q: 'a' });
    assert(!result.success);
  });
});
