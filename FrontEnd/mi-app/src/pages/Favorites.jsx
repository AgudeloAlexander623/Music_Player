import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Player from '../components/Player';
import './Favorites.css';

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(null);

  const loadFavorites = useCallback(async () => {
    try {
      const res = await api.get('/favorites');
      setFavorites(res.data.favorites || []);
    } catch (err) {
      console.error('Error al cargar favoritos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRemoveFavorite = async (id) => {
    try {
      await api.delete(`/favorites/${id}`);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Error al eliminar favorito:', err);
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

  return (
    <div className="favorites-container">
      <div className="favorites-header">
        <h1>⭐ Favoritos</h1>
        <Link to="/" className="nav-link">Volver</Link>
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
          onClose={() => setCurrentTrack(null)}
        />
      )}
    </div>
  );
}
