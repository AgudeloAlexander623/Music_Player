import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearchResults from '../components/SearchResults';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/Toast';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { playlists: [] } })),
    post: vi.fn(() => Promise.resolve({ data: { playlist: { id: '1', name: 'Test' } } })),
  },
}));

function mockTrack(overrides = {}) {
  return {
    id: '1',
    name: 'Test Song',
    artist: 'Test Artist',
    album: 'Album',
    albumImage: 'https://img.com/art.jpg',
    previewUrl: 'https://audio.com/play.mp3',
    source: 'deezer',
    ...overrides,
  };
}

function renderWithProviders(ui) {
  return render(
    <AuthProvider>
      <ToastProvider>{ui}</ToastProvider>
    </AuthProvider>
  );
}

describe('SearchResults', () => {
  const onPlay = vi.fn();
  const onAddFavorite = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('muestra mensaje "Sin resultados" si results está vacio', () => {
    renderWithProviders(
      <SearchResults results={[]} onPlay={onPlay} onAddFavorite={onAddFavorite} />
    );
    expect(screen.getByText(/Sin resultados/i)).toBeInTheDocument();
  });

  it('renderiza tracks correctamente', () => {
    const tracks = [mockTrack()];
    renderWithProviders(
      <SearchResults results={tracks} onPlay={onPlay} onAddFavorite={onAddFavorite} />
    );
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByText('deezer')).toBeInTheDocument();
  });

  it('renderiza imagen del album cuando existe', () => {
    const tracks = [mockTrack()];
    const { container } = renderWithProviders(
      <SearchResults results={tracks} onPlay={onPlay} onAddFavorite={onAddFavorite} />
    );
    const img = container.querySelector('.track-image');
    expect(img).toHaveAttribute('src', 'https://img.com/art.jpg');
  });

  it('no renderiza imagen si albumImage no existe', () => {
    const tracks = [mockTrack({ albumImage: null })];
    const { container } = renderWithProviders(
      <SearchResults results={tracks} onPlay={onPlay} onAddFavorite={onAddFavorite} />
    );
    expect(container.querySelector('img')).toBeNull();
  });

  it('llama onPlay al hacer clic en reproducir', () => {
    const tracks = [mockTrack()];
    renderWithProviders(
      <SearchResults results={tracks} onPlay={onPlay} onAddFavorite={onAddFavorite} />
    );
    const playBtn = screen.getByTitle('Reproducir');
    fireEvent.click(playBtn);
    expect(onPlay).toHaveBeenCalledWith(tracks[0]);
  });

  it('deshabilita play para tracks de musicbrainz', () => {
    const tracks = [mockTrack({ source: 'musicbrainz' })];
    renderWithProviders(
      <SearchResults results={tracks} onPlay={onPlay} onAddFavorite={onAddFavorite} />
    );
    const btn = screen.getByTitle('Metadata only - sin audio');
    expect(btn).toBeDisabled();
  });

  it('llama onAddFavorite al hacer clic en favorito', () => {
    const tracks = [mockTrack()];
    renderWithProviders(
      <SearchResults results={tracks} onPlay={onPlay} onAddFavorite={onAddFavorite} />
    );
    const favBtn = screen.getByTitle('Agregar a favoritos');
    fireEvent.click(favBtn);
    expect(onAddFavorite).toHaveBeenCalledWith(tracks[0]);
  });

  it('filtra por source cuando se selecciona un filtro', () => {
    const tracks = [
      mockTrack({ id: '1', source: 'deezer' }),
      mockTrack({ id: '2', source: 'fma', name: 'FMA Song' }),
    ];
    renderWithProviders(
      <SearchResults results={tracks} onPlay={onPlay} onAddFavorite={onAddFavorite} />
    );
    // Todos visibles por defecto
    expect(screen.getByText('FMA Song')).toBeInTheDocument();

    // Filtrar solo FMA
    fireEvent.click(screen.getByText('FMA'));
    expect(screen.getByText('FMA Song')).toBeInTheDocument();
    expect(screen.queryByText('Test Song')).not.toBeInTheDocument();
  });

  it('muestra mensaje de filtro vacio cuando no hay coincidencias', () => {
    const tracks = [mockTrack({ source: 'deezer' })];
    renderWithProviders(
      <SearchResults results={tracks} onPlay={onPlay} onAddFavorite={onAddFavorite} />
    );
    fireEvent.click(screen.getByText('YouTube'));
    expect(screen.getByText(/No hay resultados para este filtro/i)).toBeInTheDocument();
  });

  it('abre menu de playlist al hacer clic en agregar a playlist', async () => {
    const tracks = [mockTrack()];
    renderWithProviders(
      <SearchResults results={tracks} onPlay={onPlay} onAddFavorite={onAddFavorite} />
    );
    const addBtn = screen.getByTitle('Agregar a playlist');
    fireEvent.click(addBtn);
    await waitFor(() => {
      expect(screen.getByText(/Sin playlists/i)).toBeInTheDocument();
    });
  });
});
