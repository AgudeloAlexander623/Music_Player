-- ===========================================
-- REPRODUCTOR DE MÚSICA - SCHEMA DE BASE DE DATOS
-- PostgreSQL 16+
-- ===========================================

-- Crear base de datos (ejecutar como superusuario)
-- CREATE DATABASE reproductor_db;
-- \c reproductor_db;

-- ===========================================
-- TABLA: USUARIOS
-- ===========================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ===========================================
-- TABLA: FAVORITOS (TRACKS)
-- ===========================================

CREATE TABLE IF NOT EXISTS favorite_tracks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    external_track_id VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('spotify', 'musicbrainz', 'fma', 'youtube', 'youtube-music', 'deezer')),
    track_title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    album VARCHAR(255),
    album_image TEXT,
    preview_url TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, external_track_id, source)
);

CREATE INDEX IF NOT EXISTS idx_favorite_tracks_user_id ON favorite_tracks (user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_tracks_added_at ON favorite_tracks (added_at);

-- ===========================================
-- TABLA: HISTORIAL DE BÚSQUEDAS
-- ===========================================

CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query VARCHAR(255) NOT NULL,
    results_count INTEGER DEFAULT 0,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history (user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_searched_at ON search_history (searched_at);

-- ===========================================
-- TABLA: PLAYLISTS
-- ===========================================

CREATE TABLE IF NOT EXISTS playlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists (user_id);

-- ===========================================
-- TABLA: CANCIONES EN PLAYLISTS
-- ===========================================

CREATE TABLE IF NOT EXISTS playlist_tracks (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    external_track_id VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('spotify', 'musicbrainz', 'fma', 'youtube', 'youtube-music', 'deezer')),
    track_title VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    album VARCHAR(255),
    album_image TEXT,
    preview_url TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks (playlist_id);

-- ===========================================
-- TRIGGER: actualizar updated_at automáticamente
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_playlists_updated_at
    BEFORE UPDATE ON playlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
