import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as NextNavigation from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

import { MESSAGES, renderWithIntl } from '../../../tests/utils/render';

import ErrorPage from './error';

const refresh = vi.fn();
vi.mock('next/navigation', async importOriginal => ({
  ...(await importOriginal<typeof NextNavigation>()),
  useRouter: () => ({ push: vi.fn(), refresh, replace: vi.fn() }),
}));
const logError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/logger', () => ({
  logger: { child: () => ({ error: logError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() }) },
}));

describe('[locale]/error.tsx', () => {
  it('teknik ayrıntı göstermez, "Giriş yap" göstermez; yalnızca digest loglanır', () => {
    const error = Object.assign(new Error('secret: user@example.com'), { digest: 'd-1' });
    renderWithIntl(<ErrorPage error={error} reset={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(MESSAGES.tr.errorPage.message);
    expect(document.body.textContent).not.toContain('user@example.com');
    expect(screen.queryByText(MESSAGES.tr.common.login)).toBeNull();
    expect(logError).toHaveBeenCalledWith('route error boundary', { digest: 'd-1' });
  });

  it('tekrar dene: sunucu bileşenlerini yeniler ve sınırı sıfırlar', async () => {
    const reset = vi.fn();
    renderWithIntl(<ErrorPage error={new Error('x')} reset={reset} />, 'en');
    await userEvent.click(screen.getByRole('button', { name: MESSAGES.en.common.retry }));
    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
