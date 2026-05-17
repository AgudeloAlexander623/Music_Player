import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Player from '../components/Player';
import './Playlists.css';

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);

  const loadPlaylists = useCallback(async () => {
    try {
      const res = await api.get('/playlists');
      setPlaylists(res.data.playlists || []);
    } catch (err) {
      console.error('Error al cargar playlists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post('/playlists', { name: newName, description: newDesc });
      setNewName('');
      setNewDesc('');
      await loadPlaylists();
    } catch (err) {
      console.error('Error al crear playlist:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/playlists/${id}`);
      if (expandedId === id) setExpandedId(null);
      await loadPlaylists();
    } catch (err) {
      console.error('Error al eliminar playlist:', err);
    }
  };

  const loadTracks = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    try {
      const res = await api.get(`/playlists/${id}/tracks`);
      setTracks(res.data.tracks || []);
      setExpandedId(id);
    } catch (err) {
      console.error('Error al cargar tracks:', err);
    }
  };

  const handlePlay = (track) => {
    setCurrentTrack({
      id: track.external_track_id,
      name: track.track_title,
      artist: track.artist,
      album: track.album,
      albumImage: null,
      previewUrl: track.preview_url,
      source: track.source,
    });
  };

  const handleRemoveTrack = async (playlistId, trackId) => {
    try {
      await api.delete(`/playlists/${playlistId}/tracks/${trackId}`);
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
    } catch (err) {
      console.error('Error al eliminar track:', err);
    }
  };

  return (
    <div className="playlists-container">
      <div className="playlists-header">
        <h1>📋 Playlists</h1>
        <Link to="/" className="nav-link">Volver</Link>
      </div>

      <form onSubmit={handleCreate} className="create-form">
        <input
          type="text"
          placeholder="Nombre de la playlist"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="create-input"
          required
        />
        <input
          type="text"
          placeholder="Descripción (opcional)"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="create-input"
        />
        <button type="submit" disabled={creating} className="create-btn">
          {creating ? 'Creando...' : 'Crear'}
        </button>
      </form>

      {loading && <p>Cargando playlists...</p>}

      {!loading && playlists.length === 0 && (
        <p className="favorites-empty">
          No tienes playlists aún. Crea una usando el formulario de arriba.
        </p>
      )}

      {playlists.map((pl) => (
        <div key={pl.id} className="playlist-card">
          <div className="playlist-card-header">
            <div>
              <div className="playlist-name">{pl.name}</div>
              {pl.description && <div className="playlist-desc">{pl.description}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="nav-link"
                style={{ cursor: 'pointer', border: 'none' }}
                onClick={() => loadTracks(pl.id)}
              >
                {expandedId === pl.id ? 'Cerrar' : 'Ver tracks'}
              </button>
              <button className="delete-btn" onClick={() => handleDelete(pl.id)}>
                Eliminar
              </button>
            </div>
          </div>

          {expandedId === pl.id && (
            <div className="tracks-list">
              {tracks.length === 0 && <p style={{ color: '#888', fontSize: 14 }}>Sin tracks aún.</p>}
              {tracks.map((t) => (
                <div key={t.id} className="track-row">
                  <div className="track-row-info">
                    <strong>{t.track_title}</strong>
                    <span style={{ color: '#666', fontSize: 13 }}> — {t.artist}</span>
                  </div>
                  {t.preview_url && (
                    <button className="track-btn" onClick={() => handlePlay(t)}>▶️</button>
                  )}
                  <button className="remove-track-btn" onClick={() => handleRemoveTrack(pl.id, t.id)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {currentTrack && (
        <Player track={currentTrack} onClose={() => setCurrentTrack(null)} />
      )}
    </div>
  );
}
