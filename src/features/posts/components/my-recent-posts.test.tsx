import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as NextNavigation from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

import { MESSAGES, renderWithIntl } from '../../../../tests/utils/render';
import { POST_ALL_ENTITIES } from '../fixtures';

const refresh = vi.fn();
vi.mock('next/navigation', async importOriginal => ({
  ...(await importOriginal<typeof NextNavigation>()),
  useRouter: () => ({ push: vi.fn(), refresh, replace: vi.fn() }),
  usePathname: () => '/akis',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('../server/queries', () => ({ getMyRecentPosts: vi.fn() }));
const logError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/logger', () => ({
  logger: { child: () => ({ error: logError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() }) },
}));

const { MyRecentPosts, RecentPostsSkeleton } = await import('./my-recent-posts');

const tr = MESSAGES.tr;

describe('MyRecentPosts (/akis listesi)', () => {
  it('yükleme hatası: satır içi alert + tekrar dene (router.refresh); hata loglanır', async () => {
    const ui = await MyRecentPosts({
      load: async () => {
        throw new Error('db down');
      },
    });
    renderWithIntl(ui);
    expect(screen.getByRole('alert')).toHaveTextContent(tr.feedPlaceholder.loadError);
    expect(logError).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: tr.common.retry }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('boş: tek cümlelik boş durum', async () => {
    renderWithIntl(await MyRecentPosts({ load: async () => [] }));
    expect(screen.getByText(tr.feedPlaceholder.body)).toBeInTheDocument();
    expect(screen.queryByTestId('my-posts')).toBeNull();
  });

  it('başarı: başlık + kartlar', async () => {
    renderWithIntl(await MyRecentPosts({ load: async () => [POST_ALL_ENTITIES] }));
    expect(screen.getByRole('heading', { name: tr.feedPlaceholder.mine })).toBeInTheDocument();
    expect(screen.getAllByTestId('post-card')).toHaveLength(1);
  });

  it('iskelet içerik yüklemesi olarak işaretli (auth iskeleti değil)', () => {
    renderWithIntl(<RecentPostsSkeleton />);
    for (const skeleton of screen.getAllByTestId('post-card-skeleton')) {
      expect(skeleton).toHaveAttribute('data-skeleton', 'content');
    }
  });
});
