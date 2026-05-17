-- ===========================================
-- REPRODUCTOR DE MÚSICA - SCHEMA DE BASE DE DATOS
-- ===========================================

-- Crear base de datos (usando nombre más descriptivo)
CREATE DATABASE IF NOT EXISTS `reproductor_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `reproductor_db`;

-- ===========================================
-- TABLA: USUARIOS
-- ===========================================
-- Almacena información de autenticación de usuarios
-- Campos:
--   id: identificador único
--   email: email único para login (UNIQUE)
--   password_hash: contraseña hasheada con bcryptjs
--   created_at: timestamp de creación
--   updated_at: timestamp de última actualización
--

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL UNIQUE COLLATE utf8mb4_unicode_ci,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_email` (`email`)
);

-- ===========================================
-- TABLA: MUSICIANS
-- ===========================================
-- Perfil extendido para usuarios músicos que subirán música gratis
-- y orientada a uso sin copyright.
-- Campos:
--   id: identificador único
--   user_id: referencia al usuario dueño del perfil
--   stage_name: nombre artístico visible
--   legal_name: nombre real del músico (opcional)
--   artist_bio: biografía o descripción corta
--   country: país de origen
--   contact_email: correo público de contacto
--   profile_image_url: foto o avatar del músico
--   music_genre: género musical principal
--   license_type: tipo de licencia libre declarada
--   copyright_free: indica si la música puede usarse sin copyright
--   commercial_use_allowed: permite uso comercial
--   attribution_required: indica si requiere dar créditos
--   terms_accepted_at: fecha en que aceptó condiciones de publicación
--   created_at: timestamp de creación
--   updated_at: timestamp de última actualización
--

CREATE TABLE IF NOT EXISTS `musicians` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `stage_name` VARCHAR(150) NOT NULL,
    `legal_name` VARCHAR(150),
    `artist_bio` TEXT,
    `country` VARCHAR(100),
    `contact_email` VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    `profile_image_url` TEXT,
    `music_genre` VARCHAR(100),
    `license_type` ENUM('public_domain', 'cc0', 'cc_by', 'cc_by_sa', 'custom_free_license') NOT NULL DEFAULT 'cc0',
    `copyright_free` BOOLEAN NOT NULL DEFAULT TRUE,
    `commercial_use_allowed` BOOLEAN NOT NULL DEFAULT TRUE,
    `attribution_required` BOOLEAN NOT NULL DEFAULT FALSE,
    `terms_accepted_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_musician_user` (`user_id`),
    UNIQUE KEY `unique_musician_stage_name` (`stage_name`),
    INDEX `idx_musicians_stage_name` (`stage_name`),
    INDEX `idx_musicians_license_type` (`license_type`),
    INDEX `idx_musicians_copyright_free` (`copyright_free`)
);

-- ===========================================
-- TABLA: FAVORITOS (TRACKS)
-- ===========================================
-- Almacena canciones favoritas de usuarios
-- Campos:
--   id: identificador único
--   user_id: referencia a usuario
--   external_track_id: ID del track en Spotify o MusicBrainz
--   source: 'spotify' o 'musicbrainz'
--   track_title: nombre de la canción
--   artist: artista
--   album: álbum
--   preview_url: URL del preview (si existe)
--   added_at: timestamp de cuándo se agregó a favoritos
--

CREATE TABLE IF NOT EXISTS `favorite_tracks` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `external_track_id` VARCHAR(255) NOT NULL,
    `source` ENUM('spotify', 'musicbrainz') NOT NULL,
    `track_title` VARCHAR(255) NOT NULL,
    `artist` VARCHAR(255),
    `album` VARCHAR(255),
    `preview_url` TEXT,
    `added_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_user_track` (`user_id`, `external_track_id`, `source`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_added_at` (`added_at`)
);

-- ===========================================
-- TABLA: HISTORIAL DE BÚSQUEDAS
-- ===========================================
-- Guarda el historial de búsquedas de cada usuario
-- Campos:
--   id: identificador único
--   user_id: referencia a usuario
--   query: término de búsqueda
--   results_count: cuántos resultados se encontraron
--   searched_at: timestamp de la búsqueda
--

CREATE TABLE IF NOT EXISTS `search_history` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `query` VARCHAR(255) NOT NULL,
    `results_count` INT DEFAULT 0,
    `searched_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_searched_at` (`searched_at`)
);

-- ===========================================
-- TABLA: PLAYLISTS
-- ===========================================
-- Define playlists creadas por usuarios
-- Campos:
--   id: identificador único
--   user_id: referencia a usuario propietario
--   name: nombre de la playlist
--   description: descripción (opcional)
--   created_at: timestamp de creación
--   updated_at: timestamp de última actualización
--

CREATE TABLE IF NOT EXISTS `playlists` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_user_id` (`user_id`)
);

-- ===========================================
-- TABLA: CANCIONES EN PLAYLISTS
-- ===========================================
-- Relaciona tracks con playlists
-- Campos:
--   id: identificador único
--   playlist_id: referencia a playlist
--   external_track_id: ID del track en API externa
--   source: 'spotify' o 'musicbrainz'
--   track_title: nombre de la canción
--   artist: artista
--   album: álbum
--   preview_url: URL del preview
--   added_at: timestamp de cuándo se agregó a la playlist
--

CREATE TABLE IF NOT EXISTS `playlist_tracks` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `playlist_id` INT NOT NULL,
    `external_track_id` VARCHAR(255) NOT NULL,
    `source` ENUM('spotify', 'musicbrainz') NOT NULL,
    `track_title` VARCHAR(255) NOT NULL,
    `artist` VARCHAR(255),
    `album` VARCHAR(255),
    `preview_url` TEXT,
    `added_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON DELETE CASCADE,
    INDEX `idx_playlist_id` (`playlist_id`)
);

-- ===========================================
-- TABLA: SESIONES (OPCIONAL PARA FUTURO)
-- ===========================================
-- Podría almacenar sesiones activas si fuera necesario refresh tokens
-- Por ahora, JWT es stateless, no requiere tabla de sesiones

-- ===========================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ===========================================

-- Búsquedas rápidas por usuario en favoritos y playlists
ALTER TABLE `users` ADD UNIQUE KEY `unique_email` (`email`);

-- ===========================================
-- COMENTARIOS Y QUERIES DE REFERENCIA
-- ===========================================

-- Ver todos los usuarios
-- SELECT * FROM users;

-- Ver músicos registrados para música sin copyright
-- SELECT * FROM musicians WHERE copyright_free = TRUE ORDER BY created_at DESC;

-- Ver los favoritos de un usuario
-- SELECT * FROM favorite_tracks WHERE user_id = 1 ORDER BY added_at DESC;

-- Ver historial de búsquedas de un usuario
-- SELECT * FROM search_history WHERE user_id = 1 ORDER BY searched_at DESC LIMIT 20;

-- Ver playlists de un usuario
-- SELECT * FROM playlists WHERE user_id = 1 ORDER BY created_at DESC;

-- Ver tracks en una playlist
-- SELECT * FROM playlist_tracks WHERE playlist_id = 1 ORDER BY added_at DESC;
