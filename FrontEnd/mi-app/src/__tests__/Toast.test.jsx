import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ToastProvider, useToast } from '../components/Toast';

function TestButton() {
  const toast = useToast();
  return <button onClick={() => toast.success('Test message')}>Show Toast</button>;
}

describe('Toast', () => {
  it('renderiza y muestra mensaje al hacer click', () => {
    render(
      <ToastProvider>
        <TestButton />
      </ToastProvider>
    );

    const btn = screen.getByText('Show Toast');
    fireEvent.click(btn);

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });
});
