import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SpotifyCallback from '../pages/SpotifyCallback';
import { AuthProvider } from '../context/AuthContext';

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(() => Promise.resolve({ data: {} })),
    get: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

function renderCallback(url) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/auth/callback" element={<SpotifyCallback />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('SpotifyCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('guarda la sesion recibida en el callback', async () => {
    const user = {
      userId: 1,
      username: 'Ana',
      email: 'ana@example.com',
      avatar_url: null,
    };
    const url =
      '/auth/callback?token=tk123&refresh_token=rf456&user=' +
      encodeURIComponent(JSON.stringify(user));

    renderCallback(url);

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('tk123');
      expect(localStorage.getItem('refresh_token')).toBe('rf456');
      expect(JSON.parse(localStorage.getItem('user'))).toEqual(user);
    });
  });

  it('muestra error si Spotify devuelve un error en la query', async () => {
    renderCallback('/auth/callback?error=spotify_denied');
    const text = await waitFor(() =>
      document.body.textContent
    );
    expect(text).toMatch(/No se pudo completar/i);
  });

  it('muestra error si la respuesta no trae token', async () => {
    renderCallback('/auth/callback?user=notajson');
    const text = await waitFor(() =>
      document.body.textContent
    );
    expect(text).toMatch(/Respuesta incompleta|Error al procesar/i);
  });
});