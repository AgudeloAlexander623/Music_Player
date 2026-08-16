-- ============================================================
-- MIGRACIÓN 001 — Corregir los valores válidos de `source`
-- ============================================================
-- Problema: los plugins producen sources que el CHECK de la BD
-- rechazaba: 'youtube_music' (guion bajo), 'audius' e
-- 'internetarchive'. El CHECK solo aceptaba 'youtube-music'
-- (guion), que ningún plugin genera, y faltaban dos fuentes.
--
-- Aplica a BD existentes. Para BD nuevas basta con DataBases.sql.
--
-- EJECUTAR:
--   psql -U reproductor_user -d reproductor_db -h localhost \
--        -f BackEnd/src/db/migrations/001_fix_sources.sql
-- ============================================================

BEGIN;

-- 1) Normalizar filas heredadas que usaran el guion 'youtube-music'.
UPDATE favorite_tracks SET source = 'youtube_music' WHERE source = 'youtube-music';
UPDATE playlist_tracks SET source = 'youtube_music' WHERE source = 'youtube-music';

-- 2) Reemplazar el CHECK por uno con la lista completa de fuentes.
ALTER TABLE favorite_tracks DROP CONSTRAINT IF EXISTS favorite_tracks_source_check;
ALTER TABLE favorite_tracks ADD CONSTRAINT favorite_tracks_source_check
    CHECK (source IN ('spotify', 'deezer', 'youtube', 'youtube_music', 'musicbrainz', 'fma', 'internetarchive', 'audius'));

ALTER TABLE playlist_tracks DROP CONSTRAINT IF EXISTS playlist_tracks_source_check;
ALTER TABLE playlist_tracks ADD CONSTRAINT playlist_tracks_source_check
    CHECK (source IN ('spotify', 'deezer', 'youtube', 'youtube_music', 'musicbrainz', 'fma', 'internetarchive', 'audius'));

COMMIT;