import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as NextNavigation from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { consumeInAppNavigation } from '@/lib/client/in-app-navigation';

import { renderWithIntl } from '../../../../tests/utils/render';
import { FIXTURE_NOW, POST_ALL_ENTITIES } from '../fixtures';

import { BackButton } from './back-button';
import { PostCard } from './post-card';
import { shouldOpenFromCardClick } from './post-card-surface';

const push = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', async importOriginal => ({
  ...(await importOriginal<typeof NextNavigation>()),
  useRouter: () => ({ push, back, refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/akis',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('../server/actions', () => ({
  setPostLike: vi.fn(async () => ({ ok: true, data: { liked: true } })),
  deletePost: vi.fn(),
}));

/** Kart gövdesi (etkileşimsiz alan). */
const bodyOf = (): HTMLElement => {
  const body = document.querySelector<HTMLElement>('[data-slot="post-body"]');
  if (!body) throw new Error('post-body yok');
  return body;
};

beforeEach(() => {
  push.mockReset();
  back.mockReset();
  consumeInAppNavigation();
  // Saf fonksiyon testleri body'ye elle öğe ekler (RTL temizliği bunları kapsamaz)
  document.body.innerHTML = '';
});

const ownCard = { ...POST_ALL_ENTITIES, viewer: { liked: false, isOwner: true } };

describe('shouldOpenFromCardClick', () => {
  const build = (): { card: HTMLElement; text: HTMLElement; link: HTMLElement } => {
    const card = document.createElement('article');
    card.innerHTML = '<p><span>metin</span> <a href="/hisse/THYAO"><b>$THYAO</b></a></p>';
    document.body.append(card);
    return {
      card,
      text: card.querySelector('span') as HTMLElement,
      link: card.querySelector('b') as HTMLElement,
    };
  };

  it('düz metin → evet; link içi (iç öğe dahil) → hayır; metin seçiliyken → hayır', () => {
    const { card, text, link } = build();
    expect(shouldOpenFromCardClick(text, card, '')).toBe(true);
    expect(shouldOpenFromCardClick(link, card, '')).toBe(false);
    expect(shouldOpenFromCardClick(text, card, 'seçili')).toBe(false);
  });

  it('kart DOM’unda olmayan hedef (Radix portalı) → hayır', () => {
    const { card } = build();
    const portal = document.createElement('div');
    document.body.append(portal);
    expect(shouldOpenFromCardClick(portal, card, '')).toBe(false);
    expect(shouldOpenFromCardClick(null, card, '')).toBe(false);
  });
});

describe('PostCard tıklaması', () => {
  it('akışta gövdeye tıklama detaya gider; Geri ardından geçmişte geri döner', async () => {
    renderWithIntl(<PostCard post={POST_ALL_ENTITIES} now={FIXTURE_NOW} />);
    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('data-clickable', 'true');
    await userEvent.click(bodyOf());
    expect(push).toHaveBeenCalledWith('/gonderi/1');

    renderWithIntl(<BackButton fallbackHref='/akis' />);
    await userEvent.click(screen.getByRole('link', { name: 'Geri' }));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('iç linkler (cashtag, yazar) ve butonlar kartı açmaz ([ENT-R05])', async () => {
    renderWithIntl(<PostCard post={ownCard} now={FIXTURE_NOW} />);
    const user = userEvent.setup();
    const cashtag = screen.getAllByRole('link').find(link => link.textContent === '$THYAO');
    expect(cashtag).toBeDefined();
    if (cashtag) fireEvent.click(cashtag);
    fireEvent.click(screen.getByRole('link', { name: 'Ayşe Kaya' }));
    await user.click(screen.getByTestId('post-like'));
    await user.click(screen.getByTestId('post-menu'));
    expect(push).not.toHaveBeenCalled();
  });

  it('Ctrl/Cmd ya da orta tık yeni sekmede açar (yerel önekli yol)', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithIntl(<PostCard post={POST_ALL_ENTITIES} now={FIXTURE_NOW} />, 'en');
    const body = bodyOf();
    fireEvent.click(body, { ctrlKey: true });
    fireEvent(body, new MouseEvent('auxclick', { bubbles: true, button: 1 }));
    expect(open).toHaveBeenNthCalledWith(1, '/en/gonderi/1', '_blank', 'noopener');
    expect(open).toHaveBeenCalledTimes(2);
    expect(push).not.toHaveBeenCalled();
  });

  it('detay varyantında kart tıklanmaz', async () => {
    renderWithIntl(<PostCard post={POST_ALL_ENTITIES} variant='detail' now={FIXTURE_NOW} />);
    expect(screen.getByRole('article')).not.toHaveAttribute('data-clickable');
    await userEvent.click(bodyOf());
    expect(push).not.toHaveBeenCalled();
  });
});

describe('BackButton', () => {
  it('doğrudan açılan detayda (uygulama içi geçiş yok) sabit hedefe giden link', async () => {
    renderWithIntl(<BackButton fallbackHref='/akis' />);
    const link = screen.getByRole('link', { name: 'Geri' });
    expect(link).toHaveAttribute('href', '/akis');
    await userEvent.click(link);
    expect(back).not.toHaveBeenCalled();
  });
});
