import { useState, useEffect, useRef } from 'react';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './SearchResults.css';

export default function SearchResults({ results, onPlay, onAddFavorite }) {
  const [filter, setFilter] = useState('all');
  const [playlistMenuId, setPlaylistMenuId] = useState(null);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const menuRef = useRef(null);
  const { isGuest } = useAuth();
  const toast = useToast();

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const res = await api.get('/playlists');
      setUserPlaylists(res.data.playlists || []);
    } catch {
      toast.error('No se pudieron cargar las playlists');
    } finally {
      setLoadingPlaylists(false);
    }
  };

  useEffect(() => {
    if (playlistMenuId !== null && userPlaylists.length === 0) {
      loadPlaylists();
    }
  }, [playlistMenuId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playlistMenuId) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setPlaylistMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [playlistMenuId]);

  const handleAddToPlaylist = async (track, playlistId) => {
    try {
      await api.post(`/playlists/${playlistId}/tracks`, {
        external_track_id: track.id,
        source: track.source || 'spotify',
        track_title: track.name,
        artist: track.artist,
        album: track.album,
        album_image: track.albumImage,
        preview_url: track.previewUrl,
      });
      toast.success('Agregado a la playlist');
    } catch {
      toast.error('No se pudo agregar a la playlist');
    }
    setPlaylistMenuId(null);
  };

  const handlePlaylistClick = (trackId) => {
    if (isGuest) {
      toast.info('Regístrate o inicia sesión para crear playlists');
      return;
    }
    if (playlistMenuId === trackId) {
      setPlaylistMenuId(null);
    } else {
      setPlaylistMenuId(trackId);
    }
  };

  const filtered = results.filter((item) => {
    if (filter === 'spotify') return item.source === 'spotify';
    if (filter === 'musicbrainz') return item.source === 'musicbrainz';
    if (filter === 'fma') return item.source === 'fma';
    if (filter === 'youtube') return item.source === 'youtube';
    if (filter === 'youtube-music') return item.source === 'youtube-music';
    if (filter === 'deezer') return item.source === 'deezer';
    return true;
  });

  return (
    <div className="search-results">
      <div className="filter-bar">
        <button className="filter-btn" onClick={() => setFilter('all')} disabled={filter === 'all'}>
          Todos
        </button>
        <button className="filter-btn" onClick={() => setFilter('spotify')} disabled={filter === 'spotify'}>
          Spotify
        </button>
        <button className="filter-btn" onClick={() => setFilter('musicbrainz')} disabled={filter === 'musicbrainz'}>
          MusicBrainz
        </button>
        <button className="filter-btn" onClick={() => setFilter('fma')} disabled={filter === 'fma'}>
          FMA
        </button>
        <button className="filter-btn" onClick={() => setFilter('youtube')} disabled={filter === 'youtube'}>
          YouTube
        </button>
        <button className="filter-btn" onClick={() => setFilter('youtube-music')} disabled={filter === 'youtube-music'}>
          YouTube Music
        </button>
        <button className="filter-btn" onClick={() => setFilter('deezer')} disabled={filter === 'deezer'}>
          Deezer
        </button>
      </div>

      <div className="track-list">
        {filtered.map((track) => (
          <div
            key={`${track.source}-${track.id}`}
            className="track-item"
          >
            {track.albumImage && (
              <img src={track.albumImage} alt="" className="track-image" />
            )}
            <div className="track-info">
              <div className="track-name">{track.name}</div>
              <div className="track-artist">{track.artist}</div>
              <div className="track-meta">
                {track.source && (
                  <span className={`track-source source-${track.source}`}>{track.source}</span>
                )}
                {track.license && (
                  <span className="track-license">{track.license}</span>
                )}
              </div>
            </div>
            <div className="track-actions">
              {/**
               * El botón de play se deshabilita si el track no tiene previewUrl.
               * Esto evita que el usuario intente reproducir algo que no suena.
               * Spotify ya no devuelve previews y MusicBrainz es solo metadata.
               * Solo FMA y algunos tracks antiguos de Spotify tienen audio.
               */}
              <button
                className={`track-btn ${!track.previewUrl ? 'track-btn-disabled' : ''}`}
                onClick={() => track.previewUrl && onPlay(track)}
                disabled={!track.previewUrl}
                title={track.previewUrl ? 'Reproducir' : 'Sin preview disponible'}
              >
                {track.previewUrl ? '▶️' : '🔇'}
              </button>
              <button className="track-btn" onClick={() => onAddFavorite(track)} title="Agregar a favoritos">
                ❤️
              </button>
              <div className="track-playlist-dropdown">
                <button
                  className="track-btn"
                  onClick={() => handlePlaylistClick(track.id)}
                  title="Agregar a playlist"
                >
                  📋
                </button>
                {playlistMenuId === track.id && (
                  <div className="playlist-dropdown-menu" ref={menuRef}>
                    {loadingPlaylists ? (
                      <span className="dropdown-loading">Cargando...</span>
                    ) : userPlaylists.length === 0 ? (
                      <span className="dropdown-empty">Sin playlists</span>
                    ) : (
                      userPlaylists.map((pl) => (
                        <button
                          key={pl.id}
                          className="dropdown-item"
                          onClick={() => handleAddToPlaylist(track, pl.id)}
                        >
                          {pl.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
