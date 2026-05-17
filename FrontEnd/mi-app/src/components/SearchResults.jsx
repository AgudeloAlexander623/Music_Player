import { useState } from 'react';
import './SearchResults.css';

export default function SearchResults({ results, onPlay, onAddFavorite }) {
  const [filter, setFilter] = useState('all');

  const filtered = results.filter((item) => {
    if (filter === 'spotify') return item.source === 'spotify';
    if (filter === 'musicbrainz') return item.source === 'musicbrainz';
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
              {track.source && (
                <span className="track-source">{track.source}</span>
              )}
            </div>
            <div className="track-actions">
              <button className="track-btn" onClick={() => onPlay(track)} title="Reproducir">
                ▶️
              </button>
              <button className="track-btn" onClick={() => onAddFavorite(track)} title="Agregar a favoritos">
                ❤️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
