import './PlaylistPanel.css';

export default function PlaylistPanel({ currentTrack }) {
  if (!currentTrack) {
    return (
      <aside className="playlist-panel">
        <div className="playlist-preview">
          <button className="play-btn">▶</button>
          <h3>Playlist Details</h3>
          <p>Add tracks to start playing</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="playlist-panel">
      <div className="playlist-preview">
        {currentTrack.thumbnail || currentTrack.albumImage ? (
          <img
            src={currentTrack.thumbnail || currentTrack.albumImage}
            alt={currentTrack.title || currentTrack.name}
            className="panel-cover"
          />
        ) : (
          <button className="play-btn">▶</button>
        )}
        <h3>{currentTrack.title || currentTrack.name}</h3>
        <p>{currentTrack.artist}</p>
      </div>
    </aside>
  );
}
