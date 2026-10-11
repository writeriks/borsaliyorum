import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as NextNavigation from 'next/navigation';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ComposerModule from '@/features/composer';
import type { CommentSubmitHandler } from '@/features/composer';
import { fail, ok } from '@/lib/errors';

import { MESSAGES, renderWithIntl } from '../../../../tests/utils/render';
import type { CommentData, CommentsPage } from '../types';

import { CommentThread } from './comment-thread';

const refresh = vi.fn();
vi.mock('next/navigation', async importOriginal => ({
  ...(await importOriginal<typeof NextNavigation>()),
  useRouter: () => ({ push: vi.fn(), refresh, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/gonderi/1',
  useSearchParams: () => new URLSearchParams(),
}));
const toastInfo = vi.fn();
vi.mock('sonner', () => ({
  toast: Object.assign((...args: unknown[]) => toastInfo(...args), { error: vi.fn() }),
}));
vi.mock('../server/actions', () => ({
  createComment: vi.fn(),
  deleteComment: vi.fn(),
  setCommentLike: vi.fn(),
}));
// TipTap editörü burada test edilmez (composer kendi testlerinde): gönderimi tetikleyen sade
// bir yer tutucu, thread'in composer'a bağlanmasını (onSubmit/onSubmitted) doğrular.
vi.mock('@/features/composer', async importOriginal => ({
  ...(await importOriginal<typeof ComposerModule>()),
  ComposerLazy: (props: {
    postId: number;
    replyToUsername?: string;
    onSubmit: CommentSubmitHandler;
    onSubmitted?: (id: number) => void;
  }): ReactElement => (
    <button
      type='button'
      data-testid='composer-stub'
      data-reply-to={props.replyToUsername}
      onClick={async () => {
        const result = await props.onSubmit({
          postId: props.postId,
          text: '$THYAO yorum',
          clientRequestId: '00000000-0000-4000-8000-000000000001',
        });
        if (result.ok) props.onSubmitted?.(result.data.id);
      }}
    >
      stub
    </button>
  ),
}));

const tr = MESSAGES.tr;
const NOW = '2026-10-11T10:00:00.000Z';

const comment = (id: number, overrides: Partial<CommentData> = {}): CommentData => ({
  id,
  postId: 1,
  author: { username: `uye_${id}`, displayName: `Üye ${id}`, avatarUrl: null },
  createdAt: '2026-10-11T09:58:00.000Z',
  body: { text: `yorum ${id}`, entities: [] },
  stocks: {},
  likes: 3,
  ...overrides,
});

const page = (items: CommentData[], nextCursor: string | null = null): CommentsPage => ({
  items,
  nextCursor,
});

type ThreadProps = Parameters<typeof CommentThread>[0];

const renderThread = (props: Partial<ThreadProps> = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <CommentThread
        postId={1}
        viewerId={7}
        replyToUsername='yazar'
        loginHref='/giris?next=%2Fgonderi%2F1'
        signupHref='/kayit?next=%2Fgonderi%2F1'
        initialPage={page([])}
        now={NOW}
        fetchPage={vi.fn()}
        {...props}
      />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  refresh.mockReset();
  toastInfo.mockReset();
});

describe('CommentThread', () => {
  it('ilk sayfa sunucudan: sıralı liste, yorum erişilebilir adı, kalıcı bağlantı', () => {
    renderThread({ initialPage: page([comment(1), comment(2)]) });
    const list = screen.getByRole('list', { name: tr.comments.listLabel });
    const items = within(list).getAllByRole('article');
    expect(items.map(item => item.getAttribute('data-comment-id'))).toEqual(['1', '2']);
    expect(items[0]).toHaveAccessibleName('Yorum Üye 1 2 dk. önce');
    expect(
      within(items[0] as HTMLElement).getByRole('link', { name: '2 dk. önce' })
    ).toHaveAttribute('href', '/gonderi/1#yorum-1');
    expect(screen.queryByTestId('comments-load-more')).toBeNull();
  });

  it('"Daha fazla yükle" sonraki sayfayı imleçle ister ve sona ekler', async () => {
    const fetchPage = vi.fn(async () => page([comment(3)]));
    renderThread({ initialPage: page([comment(1)], 'imlec-1'), fetchPage });
    await userEvent.click(screen.getByRole('button', { name: tr.comments.loadMore }));
    await waitFor(() => expect(screen.getAllByTestId('comment')).toHaveLength(2));
    expect(fetchPage).toHaveBeenCalledWith(1, 'imlec-1', expect.anything());
    expect(screen.queryByTestId('comments-load-more')).toBeNull();
  });

  it('sonraki sayfa yüklenemezse satır içi hata + Tekrar dene; liste korunur', async () => {
    const fetchPage = vi
      .fn<ThreadProps['fetchPage'] & {}>()
      .mockRejectedValueOnce(new Error('ağ'))
      .mockResolvedValueOnce(page([comment(2)]));
    renderThread({ initialPage: page([comment(1)], 'imlec-1'), fetchPage });
    await userEvent.click(screen.getByRole('button', { name: tr.comments.loadMore }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(tr.comments.loadMoreError);
    expect(screen.getAllByTestId('comment')).toHaveLength(1);
    await userEvent.click(within(alert).getByRole('button', { name: tr.common.retry }));
    await waitFor(() => expect(screen.getAllByTestId('comment')).toHaveLength(2));
  });

  it('ilk sayfa sunucuda yüklenemediyse istemci dener: iskelet → hata → Tekrar dene → liste', async () => {
    const fetchPage = vi
      .fn<ThreadProps['fetchPage'] & {}>()
      .mockRejectedValueOnce(new Error('ağ'))
      .mockResolvedValueOnce(page([comment(1)]));
    renderThread({ initialPage: null, fetchPage });
    expect(screen.getAllByTestId('comment-skeleton')).toHaveLength(2);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(tr.comments.error);
    await userEvent.click(within(alert).getByRole('button', { name: tr.common.retry }));
    expect(await screen.findByTestId('comment')).toBeInTheDocument();
    expect(fetchPage).toHaveBeenCalledWith(1, null, expect.anything());
  });

  it('boş durum: girişliye çağrı, anonime yalnızca bilgi', () => {
    renderThread();
    expect(screen.getByText(tr.comments.empty)).toBeInTheDocument();
  });

  it('anonim: composer yerine giriş çağrısı (next ile), beğeni butonu yok, sayı salt okunur', () => {
    renderThread({ viewerId: null, initialPage: page([comment(1)]) });
    expect(screen.getByText(tr.composer.anon.comment)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr.common.login })).toHaveAttribute(
      'href',
      '/giris?next=%2Fgonderi%2F1'
    );
    expect(screen.getByRole('link', { name: tr.common.signup })).toHaveAttribute(
      'href',
      '/kayit?next=%2Fgonderi%2F1'
    );
    expect(screen.queryByTestId('composer-stub')).toBeNull();
    expect(screen.queryByTestId('post-like')).toBeNull();
    expect(screen.getByText('3 beğeni')).toBeInTheDocument();
    expect(screen.queryByTestId('comment-menu')).toBeNull();
  });

  it('anonim ve boş: "Henüz yorum yok."', () => {
    renderThread({ viewerId: null });
    expect(screen.getByText(tr.comments.emptyAnonymous)).toBeInTheDocument();
  });

  it('yorum yazılınca yüklü sayfalar yeniden istenir ve sayaç için sunucu verisi tazelenir', async () => {
    const create = vi.fn(async () => ok({ commentId: 9 }));
    const fetchPage = vi.fn(async () => page([comment(1), comment(9)]));
    renderThread({ initialPage: page([comment(1)]), fetchPage, actions: { create } });
    expect(screen.getByTestId('composer-stub')).toHaveAttribute('data-reply-to', 'yazar');
    await userEvent.click(screen.getByTestId('composer-stub'));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ postId: 1, text: '$THYAO yorum' })
    );
    await waitFor(() => expect(screen.getAllByTestId('comment')).toHaveLength(2));
    expect(fetchPage).toHaveBeenCalledWith(1, null, expect.anything());
    expect(refresh).toHaveBeenCalled();
  });

  it('beğeni yoruma bağlı action’ı çağırır (optimistic)', async () => {
    const like = vi.fn(async () => ok({ liked: true }));
    renderThread({
      initialPage: page([
        comment(1, { viewer: { liked: false, isOwner: false, canDelete: false } }),
      ]),
      actions: { like },
    });
    const button = screen.getByTestId('post-like');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(within(button).getByText('4')).toBeInTheDocument();
    await waitFor(() => expect(like).toHaveBeenCalledWith({ commentId: 1, liked: true }));
    expect(screen.queryByTestId('comment-menu')).toBeNull();
  });

  it('sahibi/moderatör silebilir: onay → listeden kalkar, toast, sunucu verisi tazelenir', async () => {
    const remove = vi.fn(async () => ok(null));
    const fetchPage = vi.fn(async () => page([comment(2)]));
    renderThread({
      initialPage: page([
        comment(1, { viewer: { liked: false, isOwner: true, canDelete: true } }),
        comment(2),
      ]),
      fetchPage,
      actions: { delete: remove },
    });
    await userEvent.click(screen.getByRole('button', { name: tr.comments.actions.menu }));
    await userEvent.click(
      await screen.findByRole('menuitem', { name: tr.comments.actions.delete })
    );
    const dialog = await screen.findByRole('dialog', { name: tr.comments.actions.deleteTitle });
    await userEvent.click(within(dialog).getByTestId('comment-delete-confirm'));
    await waitFor(() => expect(screen.getAllByTestId('comment')).toHaveLength(1));
    expect(remove).toHaveBeenCalledWith({ commentId: 1 });
    expect(toastInfo).toHaveBeenCalledWith(tr.comments.actions.deleted);
    expect(refresh).toHaveBeenCalled();
  });

  it('silme reddedilirse yorum listede kalır', async () => {
    const remove = vi.fn(async () => fail('FORBIDDEN'));
    renderThread({
      initialPage: page([comment(1, { viewer: { liked: false, isOwner: true, canDelete: true } })]),
      actions: { delete: remove },
    });
    await userEvent.click(screen.getByRole('button', { name: tr.comments.actions.menu }));
    await userEvent.click(
      await screen.findByRole('menuitem', { name: tr.comments.actions.delete })
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByTestId('comment-delete-confirm'));
    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(screen.getAllByTestId('comment')).toHaveLength(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});
