import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';
import api from '../services/api';
import Player from '../components/Player';
import './Favorites.css';

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const toast = useToast();

  const loadFavorites = useCallback(async () => {
    try {
      const res = await api.get('/favorites');
      setFavorites(res.data.favorites || []);
    } catch {
      toast.error('Error al cargar favoritos');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRemoveFavorite = async (id) => {
    try {
      await api.delete(`/favorites/${id}`);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
      toast.success('Eliminado de favoritos');
    } catch {
      toast.error('No se pudo eliminar el favorito');
    }
  };

  const mapFavoriteToTrack = (fav) => ({
    id: fav.external_track_id,
    name: fav.track_title,
    artist: fav.artist,
    album: fav.album,
    albumImage: fav.album_image || null,
    previewUrl: fav.preview_url,
    source: fav.source,
  });

  const handlePlay = (fav) => {
    setQueue(favorites.map(mapFavoriteToTrack));
    setCurrentTrack(mapFavoriteToTrack(fav));
  };

  const handlePlayNext = () => {
    if (!currentTrack) return;
    const idx = queue.findIndex((t) => t.id === currentTrack.id && t.source === currentTrack.source);
    if (idx >= 0 && idx < queue.length - 1) {
      setCurrentTrack(queue[idx + 1]);
    }
  };

  const handlePlayPrevious = () => {
    if (!currentTrack) return;
    const idx = queue.findIndex((t) => t.id === currentTrack.id && t.source === currentTrack.source);
    if (idx > 0) {
      setCurrentTrack(queue[idx - 1]);
    }
  };

  return (
    <div className="favorites-container">
      <div className="favorites-header">
        <h1>⭐ Favoritos</h1>
      </div>

      {loading && <p>Cargando favoritos...</p>}

      {!loading && favorites.length === 0 && (
        <p className="favorites-empty">
          No tienes favoritos aún. Busca canciones y agrégalas desde la pantalla principal.
        </p>
      )}

      <div className="favorites-list">
        {favorites.map((fav) => (
          <div key={fav.id} className="favorite-item">
            <div className="favorite-info">
              <div className="favorite-title">{fav.track_title}</div>
              <div className="favorite-artist">{fav.artist}</div>
              {fav.source && (
                <span className="favorite-source">{fav.source}</span>
              )}
            </div>
            <div className="favorite-actions">
              {fav.preview_url && (
                <button className="track-btn" onClick={() => handlePlay(fav)}>▶️</button>
              )}
              <button className="track-btn" onClick={() => handleRemoveFavorite(fav.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {currentTrack && (
        <Player
          track={currentTrack}
          queue={queue}
          onPlayNext={handlePlayNext}
          onPlayPrevious={handlePlayPrevious}
          onClose={() => {
            setCurrentTrack(null);
            setQueue([]);
          }}
        />
      )}
    </div>
  );
}
