import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';
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
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [queue, setQueue] = useState([]);
  const toast = useToast();

  const loadPlaylists = useCallback(async () => {
    try {
      const res = await api.get('/playlists');
      setPlaylists(res.data.playlists || []);
    } catch {
      toast.error('Error al cargar playlists');
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
      toast.success('Playlist creada');
      await loadPlaylists();
    } catch {
      toast.error('No se pudo crear la playlist');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/playlists/${id}`);
      if (expandedId === id) setExpandedId(null);
      toast.success('Playlist eliminada');
      await loadPlaylists();
    } catch {
      toast.error('No se pudo eliminar la playlist');
    }
  };

  const startEdit = (pl) => {
    setEditingId(pl.id);
    setEditName(pl.name);
    setEditDesc(pl.description || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDesc('');
  };

  const saveEdit = async (id) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/playlists/${id}`, { name: editName, description: editDesc });
      toast.success('Playlist actualizada');
      setEditingId(null);
      await loadPlaylists();
    } catch {
      toast.error('No se pudo actualizar la playlist');
    }
  };

  const loadTracks = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    try {
      setTracks([]);
      const res = await api.get(`/playlists/${id}/tracks`);
      setTracks(res.data.tracks || []);
      setExpandedId(id);
    } catch {
      toast.error('Error al cargar tracks');
    }
  };

  const handlePlay = (track) => {
    const trackData = {
      id: track.external_track_id,
      name: track.track_title,
      artist: track.artist,
      album: track.album,
      albumImage: track.album_image || null,
      previewUrl: track.preview_url,
      source: track.source,
    };
    const trackQueue = tracks.map((t) => ({
      id: t.external_track_id,
      name: t.track_title,
      artist: t.artist,
      album: t.album,
      albumImage: t.album_image || null,
      previewUrl: t.preview_url,
      source: t.source,
    }));
    setQueue(trackQueue);
    setCurrentTrack(trackData);
  };

  const handlePlayNext = () => {
    const idx = queue.findIndex((t) => t.id === currentTrack?.id && t.source === currentTrack?.source);
    if (idx >= 0 && idx < queue.length - 1) {
      setCurrentTrack(queue[idx + 1]);
    }
  };

  const handlePlayPrevious = () => {
    const idx = queue.findIndex((t) => t.id === currentTrack?.id && t.source === currentTrack?.source);
    if (idx > 0) {
      setCurrentTrack(queue[idx - 1]);
    }
  };

  const handleRemoveTrack = async (playlistId, trackId) => {
    try {
      await api.delete(`/playlists/${playlistId}/tracks/${trackId}`);
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
      toast.success('Track eliminado');
    } catch {
      toast.error('No se pudo eliminar el track');
    }
  };

  return (
    <div className="playlists-container">
      <div className="playlists-header">
        <h1>Playlists</h1>
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
        <p className="playlists-empty">
          No tienes playlists aún. Crea una usando el formulario de arriba.
        </p>
      )}

      {playlists.map((pl) => (
        <div key={pl.id} className="playlist-card">
          {editingId === pl.id ? (
            <div className="playlist-edit-form">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="edit-input"
                placeholder="Nombre"
              />
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="edit-input"
                placeholder="Descripción"
              />
              <div className="edit-actions">
                <button className="edit-save-btn" onClick={() => saveEdit(pl.id)}>
                  Guardar
                </button>
                <button className="edit-cancel-btn" onClick={cancelEdit}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="playlist-card-header">
              <div>
                <div className="playlist-name">{pl.name}</div>
                {pl.description && <div className="playlist-desc">{pl.description}</div>}
              </div>
              <div className="playlist-actions">
                <button
                  className="playlist-action-btn"
                  onClick={() => loadTracks(pl.id)}
                >
                  {expandedId === pl.id ? 'Cerrar' : 'Ver tracks'}
                </button>
                <button className="playlist-action-btn edit" onClick={() => startEdit(pl)}>
                  Editar
                </button>
                <button className="playlist-action-btn delete" onClick={() => handleDelete(pl.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          )}

          {expandedId === pl.id && (
            <div className="tracks-list">
              {tracks.length === 0 && <p className="tracks-empty">Sin tracks aún. Agrega tracks desde la búsqueda.</p>}
              {tracks.map((t) => (
                <div key={t.id} className="track-row">
                  <div className="track-row-info">
                    <strong>{t.track_title}</strong>
                    <span className="track-row-artist"> — {t.artist}</span>
                    <span className={`track-row-source source-${t.source}`}>{t.source}</span>
                  </div>
                  <div className="track-row-actions">
                    {t.preview_url && (
                      <button className="track-btn" onClick={() => handlePlay(t)}>▶️</button>
                    )}
                    <button className="remove-track-btn" onClick={() => handleRemoveTrack(pl.id, t.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {currentTrack && (
        <Player
          track={currentTrack}
          queue={queue}
          onPlayNext={handlePlayNext}
          onPlayPrevious={handlePlayPrevious}
          onClose={() => setCurrentTrack(null)}
        />
      )}
    </div>
  );
}
