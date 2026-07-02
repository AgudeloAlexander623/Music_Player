import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Player from '../components/Player';

function mockTrack(overrides = {}) {
  return {
    id: '1',
    name: 'Test Song',
    title: 'Test Song',
    artist: 'Test Artist',
    album: 'Test Album',
    albumImage: 'https://example.com/img.jpg',
    previewUrl: 'https://example.com/audio.mp3',
    source: 'deezer',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  HTMLAudioElement.prototype.play = vi.fn(() => Promise.resolve());
  HTMLAudioElement.prototype.pause = vi.fn();
  HTMLAudioElement.prototype.load = vi.fn();
  HTMLAudioElement.prototype.addEventListener = vi.fn();
  HTMLAudioElement.prototype.removeEventListener = vi.fn();
  // Add a script tag for YouTube iframe API logic
  if (!document.querySelector('script')) {
    const script = document.createElement('script');
    document.head.appendChild(script);
  }
});

describe('Player', () => {
  it('renderiza null si no hay track', () => {
    const { container } = render(<Player track={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('muestra informacion del track', () => {
    render(<Player track={mockTrack()} />);
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('muestra la imagen del album cuando existe', () => {
    const { container } = render(<Player track={mockTrack()} />);
    const img = container.querySelector('.track-cover');
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
  });

  it('muestra botones de control', () => {
    render(<Player track={mockTrack()} />);
    expect(screen.getByTitle('Reproducir')).toBeInTheDocument();
  });

  it('boton anterior deshabilitado en primer track', () => {
    render(<Player track={mockTrack()} />);
    expect(screen.getByTitle('Anterior')).toBeDisabled();
  });

  it('boton siguiente habilitado cuando hay mas tracks', () => {
    render(<Player track={mockTrack()} queue={[mockTrack(), mockTrack({ id: '2', name: 'Song 2' })]} />);
    expect(screen.getByTitle('Siguiente')).not.toBeDisabled();
  });

  it('carga volumen desde localStorage', () => {
    localStorage.setItem('reproductor_volume', '0.5');
    render(<Player track={mockTrack()} />);
    const slider = screen.getByTitle('Volumen');
    expect(slider).toHaveValue('0.5');
  });

  it('usa volumen por defecto 0.7 si no hay guardado', () => {
    render(<Player track={mockTrack()} />);
    const slider = screen.getByTitle('Volumen');
    expect(slider).toHaveValue('0.7');
  });

  it('persiste volumen en localStorage al cambiar', () => {
    render(<Player track={mockTrack()} />);
    const slider = screen.getByTitle('Volumen');
    fireEvent.change(slider, { target: { value: '0.3' } });
    expect(localStorage.getItem('reproductor_volume')).toBe('0.3');
  });

  it('llama onClose al hacer clic en cerrar', () => {
    const onClose = vi.fn();
    render(<Player track={mockTrack()} onClose={onClose} />);
    fireEvent.click(screen.getByTitle('Cerrar'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('muestra el progreso en 0:00 cuando no hay reproduccion', () => {
    render(<Player track={mockTrack()} />);
    const times = screen.getAllByText('0:00');
    expect(times.length).toBeGreaterThanOrEqual(2);
  });

  it('alterna shuffle al hacer clic', () => {
    render(<Player track={mockTrack()} />);
    const shuffleBtn = screen.getByTitle('Aleatorio');
    fireEvent.click(shuffleBtn);
    expect(screen.getByTitle('Aleatorio activo')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Aleatorio activo'));
    expect(screen.getByTitle('Aleatorio')).toBeInTheDocument();
  });

  it('cicla modos de repeticion al hacer clic', () => {
    render(<Player track={mockTrack()} />);
    const repeatBtn = screen.getByTitle('Repetir');
    fireEvent.click(repeatBtn);
    expect(screen.getByTitle('Repetir todo')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Repetir todo'));
    expect(screen.getByTitle('Repetir uno')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Repetir uno'));
    expect(screen.getByTitle('Repetir')).toBeInTheDocument();
  });

  it('muestra mensaje de carga para tracks sin preview', () => {
    const noPreviewTrack = mockTrack({ previewUrl: null, source: 'musicbrainz' });
    render(<Player track={noPreviewTrack} />);
    expect(screen.getByTitle('Cargando...')).toBeDisabled();
  });
});
