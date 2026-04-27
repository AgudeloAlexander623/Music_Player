/**
 * COMPONENTE PRINCIPAL - REPRODUCTOR DE MÚSICA (FRONTEND)
 *
 * Este componente maneja toda la interfaz de usuario:
 * - Formulario de búsqueda interactivo
 * - Estados de carga, error y resultados
 * - Reproductor HTML5 nativo para previews
 * - Integración con backend via Axios
 *
 * ARQUITECTURA REACT:
 * - useState para estado local (query, results, loading, etc.)
 * - Funciones helper para construcción de URLs y formateo
 * - Manejo asíncrono de búsquedas con error handling
 *
 * INTEGRACIÓN CON BACKEND:
 * - API_BASE_URL configurable via .env (VITE_API_URL)
 * - Proxy Vite para desarrollo local
 * - Endpoint: /api/search?q=...
 */

import { useState } from 'react'
import heroImg from './assets/hero.png'
import './App.css'

// CONFIGURACIÓN DE API
// En desarrollo: usa proxy Vite (localhost:4000)
// En producción: usa VITE_API_URL del .env
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/**
 * DATOS ESTÁTICOS - FUNCIONALIDADES IMPLEMENTADAS
 *
 * Muestra al usuario qué características ya están funcionando
 * Se actualiza manualmente según el progreso del proyecto
 */
const focusItems = [
  {
    title: 'Busqueda conectada',
    text: 'El formulario ya consulta el backend real y usa resultados agregados de Spotify y MusicBrainz.',
  },
  {
    title: 'Estados visibles',
    text: 'La interfaz maneja carga, errores, advertencias parciales y estado vacio sin romper la experiencia.',
  },
  {
    title: 'Base para reproducir',
    text: 'Si Spotify devuelve preview, el frontend ya la expone con un reproductor nativo del navegador.',
  },
]

/**
 * CONSTRUIR URL DE BÚSQUEDA
 *
 * Helper para crear URLs del API considerando el entorno
 * - Desarrollo: path relativo (usa proxy Vite)
 * - Producción: URL completa desde VITE_API_URL
 */
function buildSearchUrl(query) {
  const path = `/api/search?q=${encodeURIComponent(query)}`
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}

/**
 * OBTENER ETIQUETA DE FUENTE
 *
 * Convierte el código de fuente en etiqueta legible
 * Útil para mostrar de dónde viene cada resultado
 */
function getSourceLabel(source) {
  if (source === 'spotify') return 'Spotify'
  if (source === 'musicbrainz') return 'MusicBrainz'
  return 'Fuente externa'
}

/**
 * CONSTRUIR METADATA PARA DISPLAY
 *
 * Formatea artista y álbum para mostrar en la UI
 * Maneja casos donde faltan datos
 */
function buildMeta(item) {
  const pieces = [item.artist, item.album].filter(Boolean)
  return pieces.length > 0 ? pieces.join(' · ') : 'Sin album disponible'
}

/**
 * COMPONENTE PRINCIPAL DE LA APLICACIÓN
 *
 * Maneja todo el estado y lógica de la interfaz de búsqueda
 * Estados principales:
 * - query: texto del input
 * - results: array de canciones encontradas
 * - isLoading: mostrar spinner de carga
 * - error/warning: mensajes de error o advertencia
 */
function App() {
  // ESTADO DEL FORMULARIO Y BÚSQUEDA
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [results, setResults] = useState([])
  const [count, setCount] = useState(0)
  const [warning, setWarning] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  /**
   * MANEJAR SUBMIT DEL FORMULARIO
   *
   * Valida entrada, hace request al backend, maneja respuestas
   * Estados posibles: loading -> success/error -> results
   */
  async function handleSubmit(event) {
    event.preventDefault()

    const normalizedQuery = query.trim()

    if (normalizedQuery.length < 2) {
      setError('Escribe al menos 2 caracteres para buscar.')
      setWarning('')
      setResults([])
      setCount(0)
      return
    }

    setIsLoading(true)
    setError('')
    setWarning('')

    try {
      const response = await fetch(buildSearchUrl(normalizedQuery))
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details ?? data.error ?? 'No se pudo completar la busqueda.')
      }

      setResults(data.results ?? [])
      setCount(data.count ?? (data.results?.length ?? 0))
      setWarning(data.warning ?? '')
      setSubmittedQuery(normalizedQuery)
    } catch (requestError) {
      setResults([])
      setCount(0)
      setSubmittedQuery(normalizedQuery)
      setWarning('')
      setError(requestError.message || 'Fallo la conexion con el backend.')
    } finally {
      setIsLoading(false)
    }
  }

  const hasSearch = submittedQuery.length > 0
  const hasResults = results.length > 0

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Music Player</span>
          <h1>Busca canciones reales y conecta el frontend con tu backend.</h1>
          <p className="lead">
            Esta pantalla ya consume la API de busqueda. El siguiente paso natural
            es enriquecer resultados, playlists y autenticacion.
          </p>

          <form className="search-bar" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Busca canciones, artistas o albumes"
              aria-label="Buscar musica"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          <p className="search-hint">
            Usa `VITE_API_URL` si el backend corre en otro host. En desarrollo local
            puedes trabajar con el proxy de Vite hacia `http://localhost:4000`.
          </p>

          <div className="hero-stats">
            <article>
              <strong>{count}</strong>
              <span>resultados cargados</span>
            </article>
            <article>
              <strong>2 APIs</strong>
              <span>Spotify + MusicBrainz</span>
            </article>
            <article>
              <strong>{hasSearch ? 'Conectado' : 'Listo'}</strong>
              <span>flujo de busqueda</span>
            </article>
          </div>
        </div>

        <div className="hero-art">
          <div className="art-card">
            <img src={heroImg} alt="Ilustracion del reproductor" />
            <div className="now-playing">
              <span className="pill">Backend enlazado</span>
              <h2>Resultados unificados para el reproductor</h2>
              <p>La UI ya puede mostrar metadata, previews y errores parciales del servidor.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-head">
            <span className="panel-kicker">Busqueda en vivo</span>
            <h2>Resultados del backend</h2>
          </div>

          {error ? <p className="feedback error">{error}</p> : null}
          {warning ? <p className="feedback warning">{warning}</p> : null}
          {isLoading ? <p className="feedback neutral">Consultando fuentes musicales...</p> : null}

          {!isLoading && !error && !hasSearch ? (
            <p className="empty-state">
              Haz una busqueda para probar la conexion entre React y la API.
            </p>
          ) : null}

          {!isLoading && hasSearch && !error && !hasResults ? (
            <p className="empty-state">
              No hubo coincidencias para <strong>{submittedQuery}</strong>.
            </p>
          ) : null}

          {hasResults ? (
            <div className="result-list">
              {results.map((item) => (
                <article className="result-card" key={`${item.source}-${item.id}`}>
                  <div className="result-main">
                    <div className="result-copy">
                      <div className="result-topline">
                        <strong>{item.title}</strong>
                        <span>{getSourceLabel(item.source)}</span>
                      </div>
                      <p>{buildMeta(item)}</p>
                    </div>

                    {item.image ? (
                      <img
                        className="result-cover"
                        src={item.image}
                        alt={`Portada de ${item.title}`}
                      />
                    ) : null}
                  </div>

                  {item.preview ? (
                    <audio controls preload="none" className="preview-player">
                      <source src={item.preview} type="audio/mpeg" />
                      Tu navegador no soporta audio embebido.
                    </audio>
                  ) : (
                    <p className="preview-note">Sin preview disponible en esta fuente.</p>
                  )}
                </article>
              ))}
            </div>
          ) : null}
        </article>

        <article className="panel">
          <div className="panel-head">
            <span className="panel-kicker">Siguiente iteracion</span>
            <h2>Que ya resolvimos en la UI</h2>
          </div>

          <div className="focus-list">
            {focusItems.map((item) => (
              <div className="focus-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  )
}

export default App
