import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ErrorBoundary from '../components/ErrorBoundary';

function GoodComponent() {
  return <div>Todo bien</div>;
}

function BadComponent() {
  throw new Error('Test error');
}

describe('ErrorBoundary', () => {
  it('renderiza hijos cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Todo bien')).toBeInTheDocument();
  });

  it('muestra error cuando un hijo lanza excepción', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Algo salió mal/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});
