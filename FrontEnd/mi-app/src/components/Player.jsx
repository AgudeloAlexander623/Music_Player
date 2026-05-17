import { useState, useRef, useEffect } from 'react';
import './Player.css';

export default function Player({ track, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!track) return null;

  const togglePlay = () => {
    if (!track.previewUrl) return;

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
    <div className="player-bar">
      <div className="player-track-info">
        {track.albumImage && <img src={track.albumImage} alt="" className="player-image" />}
        <div>
          <div className="player-name">{track.name}</div>
          <div className="player-artist">{track.artist}</div>
        </div>
      </div>

      <div className="player-controls">
        {track.previewUrl ? (
          <button className="player-play-btn" onClick={togglePlay}>
            {isPlaying ? '⏸️' : '▶️'}
          </button>
        ) : (
          <span className="player-no-preview">Sin preview disponible</span>
        )}
        <button className="player-close-btn" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}
