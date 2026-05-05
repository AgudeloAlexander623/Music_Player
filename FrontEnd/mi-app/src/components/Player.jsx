import { useState, useRef } from 'react';

export default function Player({ track, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  if (!track) return null;

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(track.previewUrl);
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#282828',
      color: 'white',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {track.albumImage && <img src={track.albumImage} alt="" style={{ width: 50, height: 50 }} />}
        <div>
          <div style={{ fontWeight: 'bold' }}>{track.name}</div>
          <div style={{ fontSize: 12, color: '#b3b3b3' }}>{track.artist}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={togglePlay} style={{ fontSize: 24, background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer' }}>
          ✕
        </button>
      </div>
    </div>
  );
}
