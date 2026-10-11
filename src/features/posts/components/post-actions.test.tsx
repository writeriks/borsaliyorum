import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as NextNavigation from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fail, ok, type Result } from '@/lib/errors';

import { MESSAGES, renderWithIntl } from '../../../../tests/utils/render';
import { FIXTURE_NOW, POST_ALL_ENTITIES } from '../fixtures';

import { PostCard } from './post-card';
import { PostLikeButton, toggleLike } from './post-like-button';
import { PostOwnerMenu } from './post-owner-menu';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', async importOriginal => ({
  ...(await importOriginal<typeof NextNavigation>()),
  useRouter: () => ({ push, refresh, replace: vi.fn() }),
  usePathname: () => '/akis',
  useSearchParams: () => new URLSearchParams(),
}));
const toastError = vi.fn();
const toastInfo = vi.fn();
vi.mock('sonner', () => ({
  toast: Object.assign((...args: unknown[]) => toastInfo(...args), {
    error: (...args: unknown[]) => toastError(...args),
  }),
}));
// Bileşenler gerçek action'ı yalnızca varsayılan olarak import eder; testler `action` verir
vi.mock('../server/actions', () => ({
  setPostLike: vi.fn(),
  deletePost: vi.fn(),
}));

const tr = MESSAGES.tr;

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
  toastError.mockReset();
  toastInfo.mockReset();
});

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
};

describe('toggleLike', () => {
  it('beğeni ve geri alma sayacı; 0 altına inmez', () => {
    expect(toggleLike({ liked: false, count: 4 })).toEqual({ liked: true, count: 5 });
    expect(toggleLike({ liked: true, count: 5 })).toEqual({ liked: false, count: 4 });
    expect(toggleLike({ liked: true, count: 0 })).toEqual({ liked: false, count: 0 });
  });
});

describe('PostLikeButton', () => {
  it('optimistic: sunucu yanıtından önce basılı ve sayaç artmış; başarıda kalır', async () => {
    const pending = deferred<Result<{ liked: boolean }>>();
    const action = vi.fn(() => pending.promise);
    renderWithIntl(
      <PostLikeButton postId={7} initial={{ liked: false, count: 4 }} action={action} />
    );
    const button = screen.getByRole('button', { name: /Beğen/ });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('post-like-count')).toHaveTextContent('5');
    expect(action).toHaveBeenCalledWith({ postId: 7, liked: true });

    pending.resolve(ok({ liked: true }));
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'));
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(action).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('istek sürerken ikinci tıklama kuyruğa alınır: ilk yanıttan sonra son niyet gönderilir', async () => {
    const first = deferred<Result<{ liked: boolean }>>();
    const second = deferred<Result<{ liked: boolean }>>();
    const action = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    renderWithIntl(
      <PostLikeButton postId={7} initial={{ liked: false, count: 4 }} action={action} />
    );
    const button = screen.getByRole('button', { name: /Beğen/ });

    await userEvent.click(button);
    await userEvent.click(button);
    // Görünen durum hemen son niyet; ikinci istek ilki bitmeden gitmez (sıra karışmaz)
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('post-like-count')).toHaveTextContent('4');
    expect(action).toHaveBeenCalledTimes(1);

    first.resolve(ok({ liked: true }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
    expect(action).toHaveBeenLastCalledWith({ postId: 7, liked: false });
    second.resolve(ok({ liked: false }));
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'));
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('post-like-count')).toHaveTextContent('4');
  });

  it('kuyrukta çift sayıda tıklama sunucudaki duruma dönerse ek istek gönderilmez', async () => {
    const first = deferred<Result<{ liked: boolean }>>();
    const action = vi.fn(() => first.promise);
    renderWithIntl(
      <PostLikeButton postId={7} initial={{ liked: false, count: 4 }} action={action} />
    );
    const button = screen.getByRole('button', { name: /Beğen/ });
    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    first.resolve(ok({ liked: true }));
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'));
    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('post-like-count')).toHaveTextContent('5');
  });

  it('kuyruktaki istek başarısız olursa son onaylanan duruma döner', async () => {
    const first = deferred<Result<{ liked: boolean }>>();
    const action = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(fail('RATE_LIMITED', { retryAfter: 5 }));
    renderWithIntl(
      <PostLikeButton postId={7} initial={{ liked: false, count: 4 }} action={action} />
    );
    const button = screen.getByRole('button', { name: /Beğen/ });
    await userEvent.click(button);
    await userEvent.click(button);
    first.resolve(ok({ liked: true }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(tr.errors.RATE_LIMITED));
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('post-like-count')).toHaveTextContent('5');
  });

  it('hata → önceki duruma döner + hata toast’ı (RATE_LIMITED)', async () => {
    const action = vi.fn(async () => fail('RATE_LIMITED', { retryAfter: 30 }));
    renderWithIntl(
      <PostLikeButton postId={7} initial={{ liked: true, count: 9 }} action={action} />
    );
    const button = screen.getByRole('button', { name: /Beğen/ });
    await userEvent.click(button);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(tr.errors.RATE_LIMITED));
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('post-like-count')).toHaveTextContent('9');
  });

  it('oturum düştüyse geri alır ve girişe next ile yönlendirir', async () => {
    const action = vi.fn(async () => fail('UNAUTHENTICATED'));
    renderWithIntl(
      <PostLikeButton postId={7} initial={{ liked: false, count: 0 }} action={action} />
    );
    await userEvent.click(screen.getByRole('button', { name: /Beğen/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/giris?next=%2Fakis'));
    expect(screen.getByRole('button', { name: /Beğen/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('ağ hatası (exception) → geri alır + genel hata', async () => {
    const action = vi.fn(async () => {
      throw new Error('offline');
    });
    renderWithIntl(
      <PostLikeButton postId={7} initial={{ liked: false, count: 2 }} action={action} />
    );
    await userEvent.click(screen.getByRole('button', { name: /Beğen/ }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(tr.errors.INTERNAL));
    expect(screen.getByTestId('post-like-count')).toHaveTextContent('2');
  });
});

describe('PostOwnerMenu', () => {
  const openDialog = async (): Promise<void> => {
    await userEvent.click(screen.getByRole('button', { name: tr.post.actions.menu }));
    await userEvent.click(await screen.findByRole('menuitem', { name: tr.post.actions.delete }));
    await screen.findByRole('dialog', { name: tr.post.actions.deleteTitle });
  };

  it('onay olmadan silmez; Vazgeç kapatır', async () => {
    const action = vi.fn(async () => ok(null));
    renderWithIntl(<PostOwnerMenu postId={3} action={action} />);
    await openDialog();
    await userEvent.click(screen.getByRole('button', { name: tr.post.actions.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(action).not.toHaveBeenCalled();
  });

  it('onayla → spinner, başarıda toast + sayfa yenileme', async () => {
    const pending = deferred<Result<null>>();
    const action = vi.fn(() => pending.promise);
    renderWithIntl(<PostOwnerMenu postId={3} action={action} />);
    await openDialog();
    await userEvent.click(screen.getByTestId('post-delete-confirm'));
    expect(action).toHaveBeenCalledWith({ postId: 3 });
    expect(screen.getByTestId('post-delete-confirm')).toBeDisabled();
    expect(screen.getByTestId('post-delete-confirm')).toHaveTextContent(tr.post.actions.deleting);
    pending.resolve(ok(null));
    await waitFor(() => expect(toastInfo).toHaveBeenCalledWith(tr.post.actions.deleted));
    expect(refresh).toHaveBeenCalled();
  });

  it('FORBIDDEN → hata toast’ı, yenileme yok', async () => {
    const action = vi.fn(async () => fail('FORBIDDEN'));
    renderWithIntl(<PostOwnerMenu postId={3} action={action} />);
    await openDialog();
    await userEvent.click(screen.getByTestId('post-delete-confirm'));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(tr.errors.FORBIDDEN));
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe('PostCard görüntüleyen durumu', () => {
  it('viewer yoksa salt okunur: beğeni butonu ve menü yok', () => {
    renderWithIntl(<PostCard post={POST_ALL_ENTITIES} now={FIXTURE_NOW} />);
    expect(screen.queryByTestId('post-like')).not.toBeInTheDocument();
    expect(screen.queryByTestId('post-menu')).not.toBeInTheDocument();
  });

  it('girişli: beğeni butonu; menü yalnızca sahibine', () => {
    const { unmount } = renderWithIntl(
      <PostCard
        post={{ ...POST_ALL_ENTITIES, viewer: { liked: true, isOwner: false } }}
        now={FIXTURE_NOW}
      />
    );
    expect(screen.getByTestId('post-like')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('post-menu')).not.toBeInTheDocument();
    unmount();

    renderWithIntl(
      <PostCard
        post={{ ...POST_ALL_ENTITIES, viewer: { liked: false, isOwner: true } }}
        now={FIXTURE_NOW}
      />
    );
    expect(screen.getByRole('button', { name: tr.post.actions.menu })).toBeInTheDocument();
  });
});
