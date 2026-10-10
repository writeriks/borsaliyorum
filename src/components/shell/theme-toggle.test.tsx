import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { afterEach, describe, expect, it } from 'vitest';

import { MESSAGES, renderWithIntl } from '../../../tests/utils/render';

import { ThemeToggle } from './theme-toggle';

const renderToggle = (): void => {
  renderWithIntl(
    <ThemeProvider attribute='class' defaultTheme='dark' enableSystem storageKey='theme'>
      <ThemeToggle />
    </ThemeProvider>
  );
};

describe('ThemeToggle', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('varsayılan koyu; menüden açık seçilince <html> sınıfı ve tercih güncellenir', async () => {
    const user = userEvent.setup();
    renderToggle();
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    const trigger = screen.getByRole('button', { name: MESSAGES.tr.theme.toggle });
    expect(trigger).toHaveClass('size-hit');
    await user.click(trigger);

    const dark = await screen.findByRole('menuitemradio', { name: MESSAGES.tr.theme.dark });
    expect(dark).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: MESSAGES.tr.theme.system })).toBeVisible();

    await user.click(screen.getByRole('menuitemradio', { name: MESSAGES.tr.theme.light }));
    await waitFor(() => expect(document.documentElement).toHaveClass('light'));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
