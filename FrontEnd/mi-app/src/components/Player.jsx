import { useState, useRef, useEffect, useCallback } from 'react';
import './Player.css';

const VOLUME_KEY = 'reproductor_volume';

function loadVolume() {
  try {
    const saved = localStorage.getItem(VOLUME_KEY);
    if (saved !== null) {
      const v = parseFloat(saved);
      return v >= 0 && v <= 1 ? v : 0.7;
    }
  } catch {
    return 0.7;
  }
  return 0.7;
}

function saveVolume(v) {
  try { localStorage.setItem(VOLUME_KEY, String(v)); } catch { /* localStorage no disponible */ }
}

export default function Player({ track, queue = [], onPlayNext, onPlayPrevious, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(loadVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [shuffleMode, setShuffleMode] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const animationRef = useRef(null);
  const prevVolumeRef = useRef(loadVolume());

  const currentIndex = track ? queue.findIndex((t) => t.id === track.id && t.source === track.source) : -1;
  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;
  const hasPrev = currentIndex > 0;

  useEffect(() => {
    const audio = new Audio();
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audio.pause();
      audio.src = '';
      audio.load();
      audioRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateProgressRef = useRef(null);

  useEffect(() => {
    updateProgressRef.current = () => {
      if (!audioRef.current) return;
      setCurrentTime(audioRef.current.currentTime);
      animationRef.current = requestAnimationFrame(updateProgressRef.current);
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current || !track?.previewUrl) return;

    const audio = audioRef.current;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(null);
    setIsPlaying(false);

    const onError = () => {
      setAudioError('No se pudo reproducir este preview');
      setIsPlaying(false);
      setCurrentTime(0);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        setIsPlaying(true);
        animationRef.current = requestAnimationFrame(updateProgressRef.current);
      } else if (hasNext && onPlayNext) {
        onPlayNext();
      } else if (repeatMode === 'all' && onPlayNext) {
        onPlayNext();
      }
    };

    audio.src = track.previewUrl;
    audio.load();

    audio.addEventListener('error', onError);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('error', onError);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [track, repeatMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !track?.previewUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          animationRef.current = requestAnimationFrame(updateProgressRef.current);
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error('Play failed:', err);
          setAudioError('Error al reproducir. Intenta otro track.');
          setIsPlaying(false);
        });
    }
  }, [isPlaying, track]);

  const handleSeek = useCallback((e) => {
    if (!audioRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = percent * duration;
    setCurrentTime(percent * duration);
  }, [duration]);

  const handleVolumeChange = useCallback((e) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    saveVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
    if (value > 0) {
      prevVolumeRef.current = value;
    }
    setIsMuted(value === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      const restore = prevVolumeRef.current;
      audioRef.current.volume = restore;
      setVolume(restore);
      setIsMuted(false);
    } else {
      prevVolumeRef.current = volume;
      audioRef.current.volume = 0;
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const handleNext = useCallback(() => {
    if (hasNext && onPlayNext) onPlayNext();
  }, [hasNext, onPlayNext]);

  const handlePrevious = useCallback(() => {
    if (hasPrev && onPlayPrevious) onPlayPrevious();
  }, [hasPrev, onPlayPrevious]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffleMode(prev => !prev);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      togglePlay();
    }
  }, [togglePlay]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  if (!track) return null;

  return (
    <div className="player-bar">
      <div className="player-track-info">
        {track.albumImage && <img src={track.albumImage} alt="" className="player-image" />}
        <div className="player-text">
          <div className="player-name">{track.name}</div>
          <div className="player-artist">{track.artist}</div>
          {audioError && <div className="player-error">{audioError}</div>}
        </div>
      </div>

      <div className="player-center">
        <div className="player-main-controls">
          <button className="player-control-btn" onClick={handlePrevious} disabled={!hasPrev} title="Anterior">⏮</button>
          <button
            className="player-play-btn"
            onClick={togglePlay}
            disabled={!track.previewUrl}
            title={track.previewUrl ? (isPlaying ? 'Pausar' : 'Reproducir') : 'Sin preview disponible'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="player-control-btn" onClick={handleNext} disabled={!hasNext} title="Siguiente">⏭</button>
        </div>

        <div className="player-progress" ref={progressRef} onClick={handleSeek}>
          <span className="player-time">{formatTime(currentTime)}</span>
          <div className="player-progress-bar">
            <div className="player-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="player-time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <button
          className={`player-mode-btn ${shuffleMode ? 'active' : ''}`}
          onClick={toggleShuffle}
          title={shuffleMode ? 'Aleatorio activo' : 'Aleatorio'}
        >
          🔀
        </button>
        <button
          className={`player-mode-btn ${repeatMode !== 'off' ? 'active' : ''}`}
          onClick={toggleRepeat}
          title={repeatMode === 'one' ? 'Repetir uno' : repeatMode === 'all' ? 'Repetir todo' : 'Repetir'}
        >
          {repeatMode === 'one' ? '🔂' : '🔁'}
        </button>
        {!track.previewUrl && <span className="player-no-preview">Sin preview</span>}
        <div className="player-volume">
          <button className="player-volume-btn" onClick={toggleMute} title={isMuted ? 'Activar sonido' : 'Silenciar'}>
            {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </button>
          <input
            type="range" min="0" max="1" step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="player-volume-slider" title="Volumen"
          />
        </div>
        <button className="player-close-btn" onClick={onClose} title="Cerrar">✕</button>
      </div>
    </div>
  );
}
