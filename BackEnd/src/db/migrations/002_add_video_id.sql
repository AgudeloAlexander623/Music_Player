-- ============================================================
-- MIGRACIÓN 002 — Columna `video_id` para reproducir YouTube
-- ============================================================
-- Problema: al guardar un track de YouTube/YouTube Music en
-- favoritos o playlists solo se persistía `preview_url`
-- (https://www.youtube.com/watch?v=...). El Player del frontend
-- necesita `videoId` para reproducir vía IFrame API, así que
-- los tracks de YouTube guardados eran irrreproducibles.
--
-- Solución: columna dedicada `video_id` + backfill desde
-- `preview_url` para las filas ya existentes.
--
-- Aplica a BD existentes. Para BD nuevas basta con DataBases.sql.
--
-- EJECUTAR (después de 001_fix_sources.sql):
--   psql -U reproductor_user -d reproductor_db -h localhost \
--        -f BackEnd/src/db/migrations/002_add_video_id.sql
-- ============================================================

BEGIN;

-- 1) Columna nueva (idempotente).
ALTER TABLE favorite_tracks ADD COLUMN IF NOT EXISTS video_id VARCHAR(64);
ALTER TABLE playlist_tracks ADD COLUMN IF NOT EXISTS video_id VARCHAR(64);

-- 2) Backfill: extraer el videoId del preview_url en filas heredadas.
UPDATE favorite_tracks
SET video_id = (regexp_match(preview_url, 'v=([a-zA-Z0-9_-]{11})'))[1]
WHERE source IN ('youtube', 'youtube_music')
  AND video_id IS NULL
  AND preview_url ~ 'v=[a-zA-Z0-9_-]{11}';

UPDATE playlist_tracks
SET video_id = (regexp_match(preview_url, 'v=([a-zA-Z0-9_-]{11})'))[1]
WHERE source IN ('youtube', 'youtube_music')
  AND video_id IS NULL
  AND preview_url ~ 'v=[a-zA-Z0-9_-]{11}';

COMMIT;