import './App.css'

const playlists = [
  'Mix de la tarde',
  'Favoritas recientes',
  'Descubrimientos',
  'Vistas esta semana',
]

function App() {
  return (
    <main className="app-layout">
      <section className="panel player-panel">
        <div className="panel-header">
          <span className="panel-label">Reproductor</span>
          <h1>Ahora suena</h1>
        </div>

        <div className="player-card">
          <div className="cover-art" />

          <div className="track-info">
            <h2>Cancion seleccionada</h2>
            <p>Artista principal</p>
            <span>Album o fuente</span>
          </div>

          <div className="player-progress">
            <div className="progress-line">
              <span className="progress-fill" />
            </div>
            <div className="time-row">
              <small>0:42</small>
              <small>3:21</small>
            </div>
          </div>

          <div className="player-controls">
            <button type="button">Anterior</button>
            <button type="button" className="primary-control">Play</button>
            <button type="button">Siguiente</button>
          </div>
        </div>
      </section>

      <section className="panel home-panel">
        <div className="panel-header">
          <span className="panel-label">Home</span>
          <h2>Playlists y actividad</h2>
          <p>Este espacio sera el mas amplio para mostrar playlists creadas y las vistas anteriormente.</p>
        </div>

        <div className="home-grid">
          <article className="feature-card">
            <h3>Tu espacio principal</h3>
            <p>Aqui podremos destacar la playlist activa, recomendaciones o historial reciente.</p>
          </article>

          <div className="playlist-section">
            <div className="section-title">
              <h3>Playlists guardadas</h3>
              <span>4 items</span>
            </div>

            <div className="playlist-list">
              {playlists.map((playlist) => (
                <article className="playlist-item" key={playlist}>
                  <div className="playlist-thumb" />
                  <div>
                    <strong>{playlist}</strong>
                    <p>Lista disponible para continuar escuchando.</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <aside className="panel profile-panel">
        <div className="panel-header">
          <span className="panel-label">Perfil</span>
          <h2>Usuario</h2>
        </div>

        <div className="profile-card">
          <div className="profile-avatar">A</div>
          <strong>Alexander</strong>
          <p>Perfil del usuario</p>
          <div className="profile-meta">
            <span>Playlists: 8</span>
            <span>Recientes: 12</span>
          </div>
        </div>
      </aside>
    </main>
  )
}

export default App
