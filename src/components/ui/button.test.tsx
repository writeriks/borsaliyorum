import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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

  it.each(['sm', 'md'] as const)(
    '%s 44px altı: dokunmatik (pointer: coarse) cihazda 44px dokunma hedefine büyür',
    size => {
      render(<Button size={size}>Takip et</Button>);
      expect(screen.getByRole('button', { name: 'Takip et' })).toHaveClass('pointer-coarse:h-hit');
    }
  );

  it.each([
    { state: 'disabled', props: { disabled: true } },
    { state: 'loading', props: { loading: true } },
  ])('asChild + $state: aria-disabled, sekme dışı, tıklama gezinmez', async ({ props }) => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button asChild {...props} onClick={onClick}>
        <a href='#akis'>Akış</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Akış' });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');
    expect(link).toHaveClass('aria-disabled:pointer-events-none');

    // Varsayılan engellenmezse tarayıcı (ve Next Link) gezinirdi
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
    await user.tab();
    expect(link).not.toHaveFocus();
  });

  it('asChild + loading: bağlantı içinde spinner ve aria-busy', () => {
    render(
      <Button asChild loading>
        <a href='#akis'>Akış</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Akış' });
    expect(link).toHaveAttribute('aria-busy', 'true');
    expect(link).toContainElement(screen.getByTestId('button-spinner'));
  });

  it('asChild etkinken aria-disabled yok, tıklama iletilir', () => {
    const onClick = vi.fn();
    render(
      <Button asChild onClick={onClick}>
        <a href='#akis'>Akış</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Akış' });
    expect(link).not.toHaveAttribute('aria-disabled');
    expect(link).not.toHaveAttribute('tabindex');
    link.click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
