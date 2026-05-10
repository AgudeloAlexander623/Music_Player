import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Player from '../components/Player';

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const res = await api.get('/favorites');
      setFavorites(res.data.favorites || []);
    } catch (err) {
      console.error('Error al cargar favoritos:', err);
    } finally {
      setLoading(false);
    }
  };

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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1>⭐ Favoritos</h1>
        <Link to="/" style={{ padding: '8px 16px', background: '#e0e0e0', borderRadius: 5, textDecoration: 'none', color: '#000' }}>
          Volver
        </Link>
      </div>

      {loading && <p>Cargando favoritos...</p>}

      {!loading && favorites.length === 0 && (
        <p style={{ color: '#666', textAlign: 'center', marginTop: 40 }}>
          No tienes favoritos aún. Busca canciones y agrégalas desde la pantalla principal.
        </p>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {favorites.map((fav) => (
          <div key={fav.id} style={{
            display: 'flex',
            alignItems: 'center',
            padding: 10,
            background: '#f5f5f5',
            borderRadius: 5,
            gap: 10
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{fav.track_title}</div>
              <div style={{ color: '#666', fontSize: 14 }}>{fav.artist}</div>
              {fav.source && (
                <span style={{ fontSize: 11, background: '#e0e0e0', padding: '2px 6px', borderRadius: 3 }}>
                  {fav.source}
                </span>
              )}
            </div>
            {fav.preview_url && (
              <button onClick={() => handlePlay(fav)} style={{ padding: '5px 10px' }}>
                ▶️
              </button>
            )}
            <button onClick={() => handleRemoveFavorite(fav.id)} style={{ padding: '5px 10px' }}>
              🗑️
            </button>
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
