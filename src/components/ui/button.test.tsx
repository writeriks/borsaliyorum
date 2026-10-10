import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('varsayılan olarak 44px dokunma hedefli birincil buton', () => {
    render(<Button>Paylaş</Button>);
    const button = screen.getByRole('button', { name: 'Paylaş' });
    expect(button).toHaveClass('bg-accent', 'min-h-hit');
    expect(button).toBeEnabled();
  });

  it('loading iken devre dışı, aria-busy ve buton içi spinner', () => {
    render(<Button loading>Paylaş</Button>);
    const button = screen.getByRole('button', { name: 'Paylaş' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('button-spinner')).toBeInTheDocument();
  });

  it('asChild ile stilini bağlantıya aktarır', () => {
    render(
      <Button asChild variant='outline'>
        <a href='#akis'>Akış</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Akış' });
    expect(link).toHaveAttribute('href', '#akis');
    expect(link).toHaveClass('border-border-strong');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('icon boyutu 44×44', () => {
    render(<Button size='icon' aria-label='Ara' />);
    expect(screen.getByRole('button', { name: 'Ara' })).toHaveClass('size-hit');
  });
});
