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
  try { localStorage.setItem(VOLUME_KEY, String(v)); } catch { }
}

const YT_SOURCES = ['youtube', 'youtube_music'];

export default function Player({ track, queue = [], onPlayNext, onPlayPrevious, onClose }) {
  const isYouTube = track && YT_SOURCES.includes(track.source);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(loadVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [shuffleMode, setShuffleMode] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [ytReady, setYtReady] = useState(false);
  const [ytApiReady, setYtApiReady] = useState(false);

  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const animationRef = useRef(null);
  const prevVolumeRef = useRef(loadVolume());
  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);
  const trackRef = useRef(track);
  trackRef.current = track;

  const shuffleRef = useRef(shuffleMode);
  shuffleRef.current = shuffleMode;
  const repeatRef = useRef(repeatMode);
  repeatRef.current = repeatMode;
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const currentIndex = track ? queue.findIndex((t) => t.id === track.id && t.source === track.source) : -1;
  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;
  const hasPrev = currentIndex > 0;

  const ytProgressRef = useRef(null);
  const ytDurationRef = useRef(0);

  useEffect(() => {
    if (!isYouTube) return;

    if (window.YT?.ready) {
      setYtApiReady(true);
      return;
    }

    const existing = document.getElementById('youtube-iframe-api');
    if (existing) return;

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.id = 'youtube-iframe-api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(tag, firstScript);

    window.onYouTubeIframeAPIReady = () => {
      setYtApiReady(true);
    };

    return () => {
      window.onYouTubeIframeAPIReady = null;
    };
  }, [isYouTube]);

  useEffect(() => {
    if (!isYouTube || !track?.videoId || !ytApiReady) return;

    setYtReady(false);

    if (ytPlayerRef.current) {
      ytPlayerRef.current.destroy();
      ytPlayerRef.current = null;
    }

    const onReady = () => {
      ytDurationRef.current = ytPlayerRef.current.getDuration();
      setDuration(ytDurationRef.current);
      setYtReady(true);
      ytPlayerRef.current.setVolume(Math.round(volume * 100));
      ytPlayerRef.current.playVideo();
    };

    const onStateChange = (event) => {
      if (event.data === YT.PlayerState.PLAYING) {
        setIsPlaying(true);
        setAudioError(null);
        ytDurationRef.current = ytPlayerRef.current.getDuration();
        setDuration(ytDurationRef.current);
        if (ytProgressRef.current) cancelAnimationFrame(ytProgressRef.current);
        const update = () => {
          if (ytPlayerRef.current) {
            setCurrentTime(ytPlayerRef.current.getCurrentTime());
          }
          ytProgressRef.current = requestAnimationFrame(update);
        };
        ytProgressRef.current = requestAnimationFrame(update);
      } else if (event.data === YT.PlayerState.PAUSED) {
        setIsPlaying(false);
        if (ytProgressRef.current) cancelAnimationFrame(ytProgressRef.current);
      } else if (event.data === YT.PlayerState.ENDED) {
        setIsPlaying(false);
        setCurrentTime(0);
        if (ytProgressRef.current) cancelAnimationFrame(ytProgressRef.current);
        const q = queueRef.current;
        if (repeatRef.current === 'one' && ytPlayerRef.current) {
          ytPlayerRef.current.seekTo(0);
          ytPlayerRef.current.playVideo();
        } else if (shuffleRef.current && onPlayNext) {
          onPlayNext(Math.floor(Math.random() * q.length));
        } else if (hasNext && onPlayNext) {
          onPlayNext();
        } else if (repeatRef.current === 'all' && onPlayNext) {
          onPlayNext(0);
        }
      }
    };

    const onError = () => {
      setAudioError('No se pudo reproducir este video');
      setIsPlaying(false);
    };

    ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
      height: '0',
      width: '0',
      videoId: track.videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady,
        onStateChange,
        onError,
      },
    });

    return () => {
      if (ytProgressRef.current) cancelAnimationFrame(ytProgressRef.current);
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
      setYtReady(false);
    };
  }, [isYouTube, track?.videoId, ytApiReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isYouTube) return;

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
  }, [isYouTube]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateProgressRef = useRef(null);

  useEffect(() => {
    updateProgressRef.current = () => {
      if (!audioRef.current) return;
      setCurrentTime(audioRef.current.currentTime);
      animationRef.current = requestAnimationFrame(updateProgressRef.current);
    };
  }, []);

  useEffect(() => {
    if (isYouTube || !audioRef.current || !track?.previewUrl) return;

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
      const q = queueRef.current;
      if (repeatRef.current === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => { });
        setIsPlaying(true);
        animationRef.current = requestAnimationFrame(updateProgressRef.current);
      } else if (shuffleRef.current && onPlayNext) {
        onPlayNext(Math.floor(Math.random() * q.length));
      } else if (hasNext && onPlayNext) {
        onPlayNext();
      } else if (repeatRef.current === 'all' && onPlayNext) {
        onPlayNext(0);
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
  }, [isYouTube, track, repeatMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = useCallback(() => {
    if (isYouTube) {
      if (!ytPlayerRef.current || !ytReady) return;
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
      return;
    }

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
  }, [isPlaying, track, isYouTube, ytReady]);

  const handleSeek = useCallback((e) => {
    if (!duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekTime = percent * duration;

    if (isYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(seekTime);
    } else if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
    setCurrentTime(seekTime);
  }, [duration, isYouTube]);

  const handleVolumeChange = useCallback((e) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    saveVolume(value);
    if (isYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(Math.round(value * 100));
    } else if (audioRef.current) {
      audioRef.current.volume = value;
    }
    if (value > 0) prevVolumeRef.current = value;
    setIsMuted(value === 0);
  }, [isYouTube]);

  const handleNext = useCallback(() => {
    if (!queue.length) return;
    if (shuffleMode) {
      if (onPlayNext) onPlayNext(Math.floor(Math.random() * queue.length));
    } else if (hasNext && onPlayNext) {
      onPlayNext();
    } else if (repeatMode === 'all' && onPlayNext) {
      onPlayNext(0);
    }
  }, [hasNext, onPlayNext, shuffleMode, queue.length, repeatMode]);

  const handlePrevious = useCallback(() => {
    if (hasPrev && onPlayPrevious) onPlayPrevious();
  }, [hasPrev, onPlayPrevious]);

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
  const canPlay = isYouTube ? ytReady : Boolean(track?.previewUrl);

  if (!track) return null;

  return (
    <footer className="player">
      {isYouTube && (
        <div ref={ytContainerRef} className="player-youtube-container" />
      )}

      <div className="track-info">
        {(track.thumbnail || track.albumImage) && (
          <img src={track.thumbnail || track.albumImage} alt="" className="track-cover" />
        )}
        <div className="track-text">
          <h4>{track.title || track.name}</h4>
          <span>{track.artist}</span>
        </div>
        {audioError && <span className="player-error">{audioError}</span>}
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button onClick={handlePrevious} disabled={!hasPrev} title="Anterior">⏮</button>
          <button
            className="play-btn-main"
            onClick={togglePlay}
            disabled={!canPlay}
            title={canPlay ? (isPlaying ? 'Pausar' : 'Reproducir') : 'Cargando...'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={handleNext} disabled={!hasNext} title="Siguiente">⏭</button>
        </div>

        <div className="progress" ref={progressRef} onClick={handleSeek}>
          <span className="progress-time">{formatTime(currentTime)}</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="progress-time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <button
          className={`mode-btn ${shuffleMode ? 'active' : ''}`}
          onClick={() => setShuffleMode(prev => !prev)}
          title={shuffleMode ? 'Aleatorio activo' : 'Aleatorio'}
        >🔀</button>
        <button
          className={`mode-btn ${repeatMode !== 'off' ? 'active' : ''}`}
          onClick={() => setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off')}
          title={repeatMode === 'one' ? 'Repetir uno' : repeatMode === 'all' ? 'Repetir todo' : 'Repetir'}
        >{repeatMode === 'one' ? '🔂' : '🔁'}</button>
        <div className="volume">
          <span className="volume-icon">
            {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </span>
          <input
            type="range" min="0" max="1" step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="volume-slider" title="Volumen"
          />
        </div>
        <button className="player-close" onClick={onClose} title="Cerrar">✕</button>
      </div>
    </footer>
  );
}
