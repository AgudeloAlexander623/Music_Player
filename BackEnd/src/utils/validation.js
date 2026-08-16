/**
 * VALIDACIÓN DE ESQUEMAS CON ZOD
 *
 * Esquemas reutilizables para validar requests en los controllers.
 * Cada schema se usa con validate() que lanza ValidationError si falla.
 *
 * USO:
 *   const data = validate(registerSchema, req.body);
 *   // data.email, data.password están tipados y limpios
 */

import { z } from 'zod';
import { ValidationError } from './errors.js';

/**
 * Valida unos datos contra un schema Zod.
 * Lanza ValidationError con los mensajes de error si no pasa.
 *
 * @template T
 * @param {z.ZodSchema<T>} schema - Schema de Zod
 * @param {unknown} data - Datos a validar (req.body, req.query, etc.)
 * @returns {T} Datos validados y transformados
 * @throws {ValidationError}
 */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new ValidationError(messages);
  }
  return result.data;
}

/* ── Esquemas de autenticación ── */

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').trim(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

/* ── Esquemas de favoritos ── */

const validSources = ['spotify', 'deezer', 'youtube', 'youtube_music', 'musicbrainz', 'fma', 'internetarchive', 'audius'];

export const addFavoriteSchema = z.object({
  external_track_id: z.string().min(1, 'external_track_id is required'),
  source: z.enum(validSources, {
    errorMap: () => ({ message: `Invalid source. Must be one of: ${validSources.join(', ')}` }),
  }),
  track_title: z.string().min(1, 'track_title is required'),
  artist: z.string().optional().default(''),
  album: z.string().optional().default(''),
  album_image: z.string().optional().default(''),
  preview_url: z.string().optional().nullable().default(null),
  video_id: z.string().optional().nullable().default(null),
});

/* ── Esquemas de playlists ── */

export const createPlaylistSchema = z.object({
  name: z.string().min(1, 'Playlist name is required').trim(),
  description: z.string().optional().nullable().default(null),
});

export const updatePlaylistSchema = z.object({
  name: z.string().min(1, 'Playlist name cannot be empty').trim().optional(),
  description: z.string().optional().nullable(),
});

export const addTrackToPlaylistSchema = z.object({
  external_track_id: z.string().min(1, 'external_track_id is required'),
  source: z.enum(validSources, {
    errorMap: () => ({ message: `Invalid source. Must be one of: ${validSources.join(', ')}` }),
  }),
  track_title: z.string().min(1, 'track_title is required'),
  artist: z.string().optional().default(''),
  album: z.string().optional().default(''),
  album_image: z.string().optional().default(''),
  preview_url: z.string().optional().nullable().default(null),
  video_id: z.string().optional().nullable().default(null),
});

/* ── Esquemas de búsqueda ── */

export const searchQuerySchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters').trim(),
});

/* ── Esquemas de Spotify ── */

export const configureSpotifySchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
  clientSecret: z.string().min(1, 'clientSecret is required'),
});
