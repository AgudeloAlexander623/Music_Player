import { useState, useRef, useEffect, useCallback } from 'react';
import './Player.css';

export default function Player({ track, queue = [], onPlayNext, onPlayPrevious, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const animationRef = useRef(null);

  const hasQueue = queue.length > 0;
  const currentIndex = track ? queue.findIndex((t) => t.id === track.id && t.source === track.source) : -1;
  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;
  const hasPrev = currentIndex > 0;

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current || !track?.previewUrl) return;

    const audio = audioRef.current;
    audio.src = track.previewUrl;
    audio.load();
    setCurrentTime(0);
    setIsPlaying(false);

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (hasNext && onPlayNext) {
        onPlayNext();
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [track]);

  const updateProgress = useCallback(() => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    animationRef.current = requestAnimationFrame(updateProgress);
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !track?.previewUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    } else {
      audioRef.current.play();
      animationRef.current = requestAnimationFrame(updateProgress);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, track, updateProgress]);

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
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
    setIsMuted(value === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.7;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const handleNext = useCallback(() => {
    if (hasNext && onPlayNext) onPlayNext();
  }, [hasNext, onPlayNext]);

  const handlePrevious = useCallback(() => {
    if (hasPrev && onPlayPrevious) onPlayPrevious();
  }, [hasPrev, onPlayPrevious]);

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
        </div>
      </div>

      <div className="player-center">
        <div className="player-main-controls">
          <button
            className="player-control-btn"
            onClick={handlePrevious}
            disabled={!hasPrev}
            title="Anterior"
          >
            ⏮
          </button>
          <button
            className="player-play-btn"
            onClick={togglePlay}
            disabled={!track.previewUrl}
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="player-control-btn"
            onClick={handleNext}
            disabled={!hasNext}
            title="Siguiente"
          >
            ⏭
          </button>
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
        {!track.previewUrl && (
          <span className="player-no-preview">Sin preview</span>
        )}
        <div className="player-volume">
          <button className="player-volume-btn" onClick={toggleMute} title={isMuted ? 'Activar sonido' : 'Silenciar'}>
            {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="player-volume-slider"
            title="Volumen"
          />
        </div>
        <button className="player-close-btn" onClick={onClose} title="Cerrar">
          ✕
        </button>
      </div>
    </div>
  );
}
