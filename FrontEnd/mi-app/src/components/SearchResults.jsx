import { useState, useEffect, useRef } from 'react';
import { PlayRegular, HeartRegular, AddCircleRegular } from '@fluentui/react-icons';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './SearchResults.css';

export default function SearchResults({ results, onPlay, onAddFavorite }) {
  const [filter, setFilter] = useState('all');
  const [playlistMenuId, setPlaylistMenuId] = useState(null);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [showNewPlaylistInput, setShowNewPlaylistInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const menuRef = useRef(null);
  const newPlaylistInputRef = useRef(null);
  const { isGuest } = useAuth();
  const toast = useToast();

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const res = await api.get('/playlists');
      setUserPlaylists(res.data.playlists || []);
    } catch {
      console.warn('No se pudieron cargar las playlists');
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
    if (!playlistMenuId) {
      setShowNewPlaylistInput(false);
      setNewPlaylistName('');
      return;
    }
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setPlaylistMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [playlistMenuId]);

  useEffect(() => {
    if (showNewPlaylistInput && newPlaylistInputRef.current) {
      newPlaylistInputRef.current.focus();
    }
  }, [showNewPlaylistInput]);

  const handleAddToPlaylist = async (track, playlistId) => {
    try {
      await api.post(`/playlists/${playlistId}/tracks`, {
        external_track_id: track.id,
        source: track.source || 'spotify',
        track_title: track.name || track.title,
        artist: track.artist,
        album: track.album,
        album_image: track.albumImage || track.thumbnail,
        preview_url: track.previewUrl,
      });
      toast.success('Agregado a la playlist');
    } catch {
      console.warn('No se pudo agregar a la playlist');
    }
    setPlaylistMenuId(null);
  };

  const handleCreateAndAdd = async (track) => {
    if (!newPlaylistName.trim()) return;
    setCreatingPlaylist(true);
    try {
      const res = await api.post('/playlists', { name: newPlaylistName.trim() });
      const newPlaylist = res.data.playlist;
      await handleAddToPlaylist(track, newPlaylist.id);
      setUserPlaylists((prev) => [...prev, newPlaylist]);
      toast.success(`Playlist "${newPlaylistName.trim()}" creada`);
    } catch {
      console.warn('No se pudo crear la playlist');
      toast.error('Error al crear la playlist');
    } finally {
      setCreatingPlaylist(false);
      setShowNewPlaylistInput(false);
      setNewPlaylistName('');
    }
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
    if (filter === 'youtube_music') return item.source === 'youtube_music';
    if (filter === 'deezer') return item.source === 'deezer';
    if (filter === 'internetarchive') return item.source === 'internetarchive';
    return true;
  });

  return (
    <div className="search-results">
      <div className="filter-bar">
        <button className="source-filter-btn" onClick={() => setFilter('all')} disabled={filter === 'all'}>
          Todos
        </button>
        <button className="source-filter-btn" onClick={() => setFilter('spotify')} disabled={filter === 'spotify'}>
          Spotify
        </button>
        <button className="source-filter-btn" onClick={() => setFilter('musicbrainz')} disabled={filter === 'musicbrainz'}>
          MusicBrainz
        </button>
        <button className="source-filter-btn" onClick={() => setFilter('fma')} disabled={filter === 'fma'}>
          FMA
        </button>
        <button className="source-filter-btn" onClick={() => setFilter('youtube')} disabled={filter === 'youtube'}>
          YouTube
        </button>
        <button className="source-filter-btn" onClick={() => setFilter('youtube_music')} disabled={filter === 'youtube_music'}>
          YouTube Music
        </button>
        <button className="source-filter-btn" onClick={() => setFilter('deezer')} disabled={filter === 'deezer'}>
          Deezer
        </button>
        <button className="source-filter-btn" onClick={() => setFilter('internetarchive')} disabled={filter === 'internetarchive'}>
          Internet Archive
        </button>
      </div>

      {filtered.length === 0 && (
        <p className="search-empty">
          {results.length === 0
            ? 'Sin resultados. Intenta con otra búsqueda.'
            : 'No hay resultados para este filtro.'}
        </p>
      )}

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
              <div className="track-name">{track.name || track.title}</div>
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
               * YouTube/YouTube Music se reproducen vía IFrame API.
               * FMA, Deezer y Spotify usan previewUrl directo.
               * MusicBrainz es metadata-only (sin preview).
               */}
              <button
                className={`track-btn ${track.source === 'musicbrainz' ? 'track-btn-disabled' : ''}`}
                onClick={() => onPlay(track)}
                disabled={track.source === 'musicbrainz'}
                title={
                  track.source === 'musicbrainz' ? 'Metadata only - sin audio' :
                  'Reproducir'
                }
              >
                <PlayRegular />
              </button>
              <button className="track-btn" onClick={() => onAddFavorite(track)} title="Agregar a favoritos">
                <HeartRegular />
              </button>
              <div className="track-playlist-dropdown">
                <button
                  className="track-btn"
                  onClick={() => handlePlaylistClick(track.id)}
                  title="Agregar a playlist"
                >
                  <AddCircleRegular />
                </button>
                {playlistMenuId === track.id && (
                  <div className="playlist-dropdown-menu" ref={menuRef}>
                    {loadingPlaylists ? (
                      <span className="dropdown-loading">Cargando...</span>
                    ) : userPlaylists.length === 0 && !showNewPlaylistInput ? (
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
                    {showNewPlaylistInput ? (
                      <form
                        className="dropdown-new-form"
                        onSubmit={(e) => { e.preventDefault(); handleCreateAndAdd(track); }}
                      >
                        <input
                          ref={newPlaylistInputRef}
                          type="text"
                          className="dropdown-new-input"
                          placeholder="Nombre de la playlist"
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          disabled={creatingPlaylist}
                        />
                        <button
                          type="submit"
                          className="dropdown-new-btn"
                          disabled={creatingPlaylist || !newPlaylistName.trim()}
                        >
                          {creatingPlaylist ? 'Creando...' : 'Crear y agregar'}
                        </button>
                      </form>
                    ) : (
                      <button
                        className="dropdown-new-playlist"
                        onClick={() => setShowNewPlaylistInput(true)}
                      >
                        + Crear nueva playlist
                      </button>
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
