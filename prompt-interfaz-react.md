# 🎵 PROMPT PARA GENERAR INTERFAZ REACT.JS - REPRODUCTOR DE MÚSICA

## 🎯 OBJETIVO
Crear una interfaz de usuario moderna, intuitiva y completamente funcional para un reproductor de música que integre múltiples APIs musicales (Spotify, MusicBrainz, FMA).

## 📋 CONTEXTO DEL PROYECTO

### 🎵 **¿Qué es el proyecto?**
Aplicación web fullstack tipo Spotify que permite buscar y reproducir música de forma legal usando APIs públicas. Es un proyecto educativo que demuestra integración de APIs musicales sin infringir copyrights.

### 🛠️ **Stack Tecnológico Actual**
- **Frontend:** React 19.2.5 + Vite 8.0.9
- **Backend:** Node.js + Express.js (ya funcionando)
- **APIs:** Spotify Web API, MusicBrainz, FMA (planeado)
- **Estilos:** CSS3 puro (sin frameworks como Tailwind)
- **Estado:** useState (sin Redux/Context avanzado)

### 🔗 **Backend API Disponible**
```
GET /api/search?q={query}
```
**Respuesta:**
```json
{
  "results": [
    {
      "id": "string",
      "title": "string",
      "artist": "string",
      "album": "string",
      "image": "url",
      "preview": "url_30s_preview",
      "source": "spotify|musicbrainz|fma"
    }
  ],
  "count": 15,
  "warning": "string (opcional)",
  "error": "string (opcional)"
}
```

## 🎨 **REQUISITOS DE LA NUEVA INTERFAZ**

### 🎯 **Funcionalidades Principales**
1. **Búsqueda Avanzada**
   - Input con autocompletado inteligente
   - Búsqueda por artista, canción, álbum
   - Historial de búsquedas recientes
   - Sugerencias populares

2. **Resultados de Búsqueda**
   - Grid/List view toggle
   - Filtros por fuente (Spotify, MusicBrainz, FMA)
   - Ordenamiento (relevancia, popularidad, fecha)
   - Paginación infinita (scroll)

3. **Reproductor de Música**
   - Reproductor HTML5 nativo para previews
   - Controles: play/pause, volumen, progreso
   - Lista de reproducción temporal
   - Mini-player flotante

4. **Experiencia de Usuario**
   - Estados de carga con skeletons
   - Manejo de errores graceful
   - Modo oscuro/claro
   - Responsive design (mobile-first)
   - Animaciones suaves

### 🎨 **Diseño Visual**
- **Tema:** Moderno, minimalista, inspirado en Spotify
- **Colores:** Gradientes suaves, tonos musicales
- **Tipografía:** Sans-serif moderna
- **Espaciado:** Generoso, breathing room
- **Iconos:** SVG inline o librería ligera

### 📱 **Responsive Design**
- **Mobile:** Single column, touch-friendly
- **Tablet:** 2-column layout
- **Desktop:** Multi-column con sidebar

## 🏗️ **ESTRUCTURA DE COMPONENTES PROPUESTA**

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.jsx          # Navegación principal
│   │   ├── Sidebar.jsx         # Menú lateral (futuro)
│   │   └── Footer.jsx          # Footer con info
│   ├── search/
│   │   ├── SearchBar.jsx       # Input de búsqueda
│   │   ├── SearchResults.jsx   # Grid de resultados
│   │   ├── SearchFilters.jsx   # Filtros y ordenamiento
│   │   └── SearchHistory.jsx   # Historial reciente
│   ├── player/
│   │   ├── MusicPlayer.jsx     # Reproductor principal
│   │   ├── MiniPlayer.jsx      # Player flotante
│   │   ├── Playlist.jsx        # Lista de reproducción
│   │   └── PlayerControls.jsx  # Controles play/pause/etc
│   ├── ui/
│   │   ├── Button.jsx          # Botón reutilizable
│   │   ├── Card.jsx            # Tarjeta para canciones
│   │   ├── Loading.jsx         # Skeleton loader
│   │   ├── ErrorMessage.jsx    # Componente de error
│   │   └── Modal.jsx           # Modal genérico
│   └── common/
│       └── ThemeToggle.jsx     # Toggle modo oscuro
├── hooks/
│   ├── useSearch.js            # Hook para búsquedas
│   ├── usePlayer.js            # Hook para reproducción
│   └── useLocalStorage.js      # Hook para persistencia
├── utils/
│   ├── api.js                  # Funciones API
│   ├── formatters.js           # Formateadores de datos
│   └── constants.js            # Constantes del proyecto
├── context/
│   └── PlayerContext.jsx       # Context para estado global
├── App.jsx                     # Componente principal
└── main.jsx                    # Punto de entrada
```

## 🎵 **FUNCIONALIDADES DETALLADAS**

### 🔍 **Búsqueda**
```jsx
// Estados necesarios
const [query, setQuery] = useState('')
const [results, setResults] = useState([])
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState('')
const [filters, setFilters] = useState({ source: 'all', sort: 'relevance' })

// Funcionalidad
- Debounce de 300ms para evitar spam
- Mínimo 2 caracteres para buscar
- Cache de resultados por 5 minutos
- Historial local (localStorage)
```

### 🎶 **Reproductor**
```jsx
// Estados del player
const [currentTrack, setCurrentTrack] = useState(null)
const [isPlaying, setIsPlaying] = useState(false)
const [volume, setVolume] = useState(0.7)
const [currentTime, setCurrentTime] = useState(0)
const [duration, setDuration] = useState(0)
const [playlist, setPlaylist] = useState([])

// Funcionalidad
- Auto-play siguiente canción
- Loop individual y playlist
- Shuffle aleatorio
- Controles de teclado (space, arrows)
- Persistencia de volumen
```

### 🎨 **Estados UI**
```jsx
// Estados visuales
const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
const [theme, setTheme] = useState('light') // 'light' | 'dark'
const [showPlayer, setShowPlayer] = useState(false)

// Estados de carga
const [loadingStates, setLoadingStates] = useState({
  search: false,
  player: false,
  playlist: false
})
```

## 🎨 **ESTILOS Y CSS**

### **Variables CSS**
```css
:root {
  /* Colores principales */
  --primary: #1db954;
  --primary-dark: #1aa34a;
  --secondary: #535353;
  --accent: #ff6b6b;

  /* Fondos */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #e9ecef;

  /* Texto */
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --text-muted: #adb5bd;

  /* Bordes y sombras */
  --border: #dee2e6;
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.15);

  /* Espaciado */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}
```

### **Clases de Componentes**
```css
/* Layout */
.container { max-width: 1200px; margin: 0 auto; padding: var(--spacing-md); }
.grid { display: grid; gap: var(--spacing-md); }
.flex { display: flex; gap: var(--spacing-sm); }

/* Cards */
.card {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Buttons */
.btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
}
```

## 🔧 **INTEGRACIÓN TÉCNICA**

### **Configuración API**
```jsx
// En desarrollo: proxy Vite
// En producción: VITE_API_URL
const API_BASE_URL = import.meta.env.VITE_API_URL || ''
const API_ENDPOINTS = {
  search: `${API_BASE_URL}/api/search`,
  // Futuros endpoints
  login: `${API_BASE_URL}/api/auth/login`,
  playlist: `${API_BASE_URL}/api/playlist`,
}
```

### **Manejo de Errores**
```jsx
// Tipos de error
const ERROR_TYPES = {
  NETWORK: 'Error de conexión',
  API: 'Error del servidor',
  VALIDATION: 'Datos inválidos',
  NOT_FOUND: 'No encontrado'
}

// Componente de error
function ErrorMessage({ type, message, retry }) {
  return (
    <div className="error-message">
      <h3>{ERROR_TYPES[type]}</h3>
      <p>{message}</p>
      {retry && <button onClick={retry}>Reintentar</button>}
    </div>
  )
}
```

## 📱 **RESPONSIVE DESIGN**

### **Breakpoints**
```css
/* Mobile First */
@media (min-width: 768px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1200px) { /* Large Desktop */ }
```

### **Layout Adaptativo**
```jsx
// Hook para detectar tamaño de pantalla
function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState('mobile')

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      if (width >= 1200) setBreakpoint('desktop')
      else if (width >= 768) setBreakpoint('tablet')
      else setBreakpoint('mobile')
    }

    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  return breakpoint
}
```

## 🚀 **INSTRUCCIONES PARA LA IA**

### **PASOS A SEGUIR:**

1. **📖 LEE ESTE PROMPT COMPLETO** antes de empezar
2. **🔍 ANALIZA** la estructura existente en `App.jsx`
3. **🏗️ CREA** los componentes siguiendo la estructura propuesta
4. **🎨 IMPLEMENTA** estilos modernos y responsive
5. **⚡ AGREGA** funcionalidades avanzadas (hooks, context)
6. **🧪 ASEGURA** compatibilidad con el backend existente
7. **📱 OPTIMIZA** para mobile y desktop
8. **🎵 PRIORIZA** UX musical (reproducción fluida)

### **REQUISITOS OBLIGATORIOS:**
- ✅ **React 19** (sin hooks deprecated)
- ✅ **CSS puro** (sin Tailwind/Bootstrap)
- ✅ **Responsive** (mobile-first)
- ✅ **Accesible** (ARIA labels, keyboard navigation)
- ✅ **Performante** (lazy loading, memoización)
- ✅ **Compatible** con API existente

### **ARCHIVOS A GENERAR:**
1. `src/components/layout/Header.jsx`
2. `src/components/search/SearchBar.jsx`
3. `src/components/search/SearchResults.jsx`
4. `src/components/player/MusicPlayer.jsx`
5. `src/components/ui/Button.jsx`
6. `src/components/ui/Card.jsx`
7. `src/hooks/useSearch.js`
8. `src/hooks/usePlayer.js`
9. `src/utils/api.js`
10. `App.jsx` (actualizado)
11. `App.css` (mejorado)

### **CALIDAD ESPERADA:**
- 🎯 **Código limpio** y bien comentado
- 🎨 **Diseño moderno** inspirado en Spotify
- ⚡ **Performance óptima** (sin re-renders innecesarios)
- 🐛 **Manejo robusto** de errores
- 📱 **UX excepcional** en todos los dispositivos

---

**🎵 ¡MANOS A LA OBRA! Crea la interfaz definitiva para este reproductor de música.**