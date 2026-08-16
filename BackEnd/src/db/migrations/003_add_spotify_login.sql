-- ============================================================
-- MIGRACIÓN 003 — Login social con Spotify (users)
-- ============================================================
-- Añade soporte para identidad de Spotify en `users`:
--   - spotify_id:  ID público del usuario en Spotify (único cuando existe)
--   - avatar_url:  Imagen de perfil que Spotify devuelve en /v1/me
--
-- Los usuarios creados por OAuth tienen `password_hash` con un hash
-- aleatorio (la columna es NOT NULL), de modo que el login por
-- email/contraseña simplemente falla para ellos, y solo pueden
-- entrar por el flujo social.
--
-- Aplica a BD existentes. Para BD nuevas basta con DataBases.sql.
--
-- EJECUTAR (después de 002_add_video_id.sql):
--   psql -U reproductor_user -d reproductor_db -h localhost \
--        -f BackEnd/src/db/migrations/003_add_spotify_login.sql
-- ============================================================

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS spotify_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Índice único parcial: permite múltiples NULL y garantiza un solo
-- usuario por cuenta de Spotify cuando hay valor.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_spotify_id
    ON users (spotify_id) WHERE spotify_id IS NOT NULL;

COMMIT;