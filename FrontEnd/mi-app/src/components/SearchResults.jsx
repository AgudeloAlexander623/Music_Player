import { useState } from 'react';

export default function SearchResults({ results, onPlay, onAddFavorite }) {
  const [filter, setFilter] = useState('all');

  const filtered = results.filter((item) => {
    if (filter === 'spotify') return item.source === 'spotify';
    if (filter === 'musicbrainz') return item.source === 'musicbrainz';
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setFilter('all')} disabled={filter === 'all'}>Todos</button>
        <button onClick={() => setFilter('spotify')} disabled={filter === 'spotify'}>Spotify</button>
        <button onClick={() => setFilter('musicbrainz')} disabled={filter === 'musicbrainz'}>MusicBrainz</button>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map((track) => (
          <div key={track.id} style={{
            display: 'flex',
            alignItems: 'center',
            padding: 10,
            background: '#f5f5f5',
            borderRadius: 5,
            gap: 10
          }}>
            {track.albumImage && (
              <img src={track.albumImage} alt="" style={{ width: 60, height: 60, borderRadius: 4 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{track.name}</div>
              <div style={{ color: '#666', fontSize: 14 }}>{track.artist}</div>
              {track.source && (
                <span style={{ fontSize: 11, background: '#e0e0e0', padding: '2px 6px', borderRadius: 3 }}>
                  {track.source}
                </span>
              )}
            </div>
            <button onClick={() => onPlay(track)} style={{ padding: '5px 10px' }}>
              ▶️
            </button>
            <button onClick={() => onAddFavorite(track)} style={{ padding: '5px 10px' }}>
              ❤️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
