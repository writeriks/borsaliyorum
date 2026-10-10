import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { MESSAGES, renderWithIntl } from '../../../../tests/utils/render';
import {
  FIXTURE_MEDIA_URL,
  FIXTURE_NOW,
  POST_ALL_ENTITIES,
  POST_HOSTILE,
  POST_LEGACY,
  POST_SPONSORED,
  POST_WITH_MEDIA,
} from '../fixtures';
import type { PostCardData } from '../types';

import { PostCard } from './post-card';
import { PostCardError, PostCardSkeleton, PostCardUnavailable } from './post-card-states';

const renderCard = (post: PostCardData, locale: 'tr' | 'en' = 'tr') =>
  renderWithIntl(<PostCard post={post} now={FIXTURE_NOW} />, locale);

describe('PostCard', () => {
  it('article erişilebilir adı "Gönderi, yazar, göreli zaman"; gövde değil', () => {
    renderCard(POST_ALL_ENTITIES);
    const article = screen.getByRole('article');
    expect(article).toHaveAccessibleName('Gönderi Ayşe Kaya 3 dk. önce');
  });

  it('yazar profil linki, @kullanıcı ve detaya giden zaman linki', () => {
    renderCard(POST_ALL_ENTITIES);
    expect(screen.getByRole('link', { name: 'Ayşe Kaya' })).toHaveAttribute('href', '/u/aysek');
    expect(screen.getByText('@aysek')).toBeInTheDocument();
    const timeLink = screen.getByRole('link', { name: '3 dk. önce' });
    expect(timeLink).toHaveAttribute('href', '/gonderi/1');
    const time = within(timeLink).getByText('3 dk. önce');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', '2026-10-10T11:32:00.000Z');
  });

  it('zaman tooltip’i tam tarihi Europe/Istanbul ile gösterir', async () => {
    renderCard(POST_ALL_ENTITIES);
    const user = userEvent.setup();
    await user.hover(screen.getByRole('link', { name: '3 dk. önce' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('10 Eki 2026 14:32');
  });

  it('bullish etiketi "▲ Yükseliş", glif aria-hidden ([SEN-04])', () => {
    renderCard(POST_ALL_ENTITIES);
    const tag = screen.getByText(
      (_content, element) => element?.getAttribute('data-slot') === 'sentiment-tag'
    );
    expect(tag.textContent).toBe('▲ Yükseliş');
    expect(within(tag).getByText('▲')).toHaveAttribute('aria-hidden', 'true');
  });

  it('bearish "▼ Düşüş"; nötrde etiket yok', () => {
    const { container } = renderCard(POST_LEGACY);
    expect(container.querySelector('[data-slot="sentiment-tag"]')?.textContent).toBe('▼ Düşüş');
    const neutral = renderCard(POST_SPONSORED);
    expect(neutral.container.querySelector('[data-slot="sentiment-tag"]')).toBeNull();
  });

  it('gövdede tüm entity linkleri', () => {
    renderCard(POST_ALL_ENTITIES);
    expect(screen.getByRole('link', { name: '$THYAO, Türk Hava Yolları A.O.' })).toHaveAttribute(
      'href',
      '/hisse/THYAO'
    );
    expect(screen.getByRole('link', { name: '#bist100' })).toHaveAttribute(
      'href',
      '/etiket/bist100'
    );
    expect(screen.getByRole('link', { name: '@mehmet_y, Mehmet Yılmaz' })).toHaveAttribute(
      'href',
      '/u/mehmet_y'
    );
    expect(
      screen.getByRole('link', { name: /^kap\.org\.tr\/tr\/Bildirim\/1234567/ })
    ).toHaveAttribute('href', 'https://www.kap.org.tr/tr/Bildirim/1234567');
  });

  describe('sponsorlu ([LEG-03])', () => {
    it('"Reklam / İşbirliği" etiketi DOM’da yazar adından önce', () => {
      renderCard(POST_SPONSORED);
      const label = screen.getByText('Reklam / İşbirliği');
      const author = screen.getByRole('link', { name: 'Mehmet Yılmaz' });
      expect(label.compareDocumentPosition(author) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('en: etikette Türkçe "Reklam" kalır (legal HD-2)', () => {
      renderCard(POST_SPONSORED, 'en');
      expect(screen.getByText('Ad / Collaboration (Reklam)')).toBeInTheDocument();
    });

    it('sponsorsuz gönderide etiket yok', () => {
      renderCard(POST_ALL_ENTITIES);
      expect(screen.queryByText('Reklam / İşbirliği')).toBeNull();
    });
  });

  describe('link önizleme', () => {
    it('hazır kart tek link: başlık + host adı, ugc rel, yeni sekme ([LPV-06])', () => {
      renderCard(POST_SPONSORED);
      const card = screen.getByTestId('link-preview-card');
      expect(card).toHaveAccessibleName(
        'Borsa eğitim programı başladı, ornek.com (yeni sekmede açılır)'
      );
      expect(card).toHaveAttribute('href', 'https://ornek.com/haber');
      expect(card).toHaveAttribute('target', '_blank');
      expect(card.getAttribute('rel')).toBe('nofollow ugc noopener noreferrer');
      expect(within(card).queryAllByRole('link')).toHaveLength(0);
      expect(card.querySelector('img')).toBeNull();
    });

    it('bekleyen önizleme için aynı ölçüde iskelet', () => {
      renderCard(POST_LEGACY);
      expect(screen.getByTestId('link-preview-skeleton')).toHaveAttribute('aria-busy', 'true');
    });

    it('görsel varken önizleme kartı yok ([LPV-04])', () => {
      renderCard(POST_WITH_MEDIA);
      expect(screen.queryByTestId('link-preview-card')).toBeNull();
      expect(screen.getByRole('img', { name: 'Gönderi görseli' })).toHaveAttribute(
        'src',
        FIXTURE_MEDIA_URL
      );
    });

    it.each([
      ['javascript: URL', 'javascript:alert(1)', 'Başlık'],
      ['başlıksız', 'https://ornek.com/x', null],
      ['boş başlık', 'https://ornek.com/x', '   '],
    ])('%s → kart yok', (_label, url, title) => {
      renderCard({
        ...POST_ALL_ENTITIES,
        linkPreview: { status: 'ready', url, siteName: null, title, description: null },
      });
      expect(screen.queryByTestId('link-preview-card')).toBeNull();
    });
  });

  it('eski görsel yalnızca https ise gösterilir', () => {
    renderCard({ ...POST_ALL_ENTITIES, mediaUrl: 'javascript:alert(1)' });
    expect(screen.queryByRole('img')).toBeNull();
    renderCard({ ...POST_ALL_ENTITIES, mediaUrl: 'http://ornek.com/a.png' });
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('sayaçlar: kısaltılmış görünür, ekran okuyucuya tam ve birimli', () => {
    renderCard(POST_SPONSORED);
    const stats = screen.getByRole('list', { name: 'Etkileşimler' });
    expect(within(stats).getByText('1,2 B')).toHaveAttribute('aria-hidden', 'true');
    expect(within(stats).getByText('1.234 beğeni')).toBeInTheDocument();
    expect(within(stats).getByText('0 yorum')).toBeInTheDocument();
    expect(within(stats).queryAllByRole('button')).toHaveLength(0);
  });

  it('en: sayaçlar çoğul kurallarıyla', () => {
    renderCard(POST_SPONSORED, 'en');
    expect(screen.getByText('1 repost')).toBeInTheDocument();
    expect(screen.getByText('0 comments')).toBeInTheDocument();
  });

  it('düşmanca içerik: script metin olarak, sızmış href link değil, homograf punycode', () => {
    const { container } = renderCard(POST_HOSTILE);
    const body = container.querySelector('[data-slot="rich-text"]');
    expect(body?.querySelector('script, img')).toBeNull();
    expect(body?.textContent).toContain('<script>alert(1)</script>');
    const links = within(body as HTMLElement).getAllByRole('link');
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      'https://xn--pple-43d.com/giris',
      '/hisse/THYAO',
    ]);
    expect(container.querySelector('a[href^="javascript:"], a[href^="data:"]')).toBeNull();
  });

  it('eski format: $(THYAO) → $THYAO linki', () => {
    const { container } = renderCard(POST_LEGACY);
    const body = container.querySelector('[data-slot="rich-text"]');
    expect(body?.textContent).toMatch(/^\$THYAO ve \$ASELS için #bist100 zayıf\. @aysegul/);
    expect(screen.getByRole('link', { name: /^\$THYAO,/ })).toHaveAttribute('href', '/hisse/THYAO');
  });

  it('detail varyantında "Devamını gör" kırpması yok', () => {
    const { container } = renderWithIntl(
      <PostCard post={POST_ALL_ENTITIES} variant='detail' now={FIXTURE_NOW} />
    );
    expect(container.querySelector('.line-clamp-6')).toBeNull();
  });
});

describe('PostCard durumları', () => {
  it('loading: aria-busy iskelet + ekran okuyucu metni', () => {
    renderWithIntl(<PostCardSkeleton />);
    expect(screen.getByTestId('post-card-skeleton')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(MESSAGES.tr.post.loading)).toHaveClass('sr-only');
  });

  it('error: alert + tekrar dene', () => {
    renderWithIntl(<PostCardError onRetry={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent(MESSAGES.tr.post.error);
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument();
  });

  it('empty: kaldırılmış gönderi açıklaması', () => {
    renderWithIntl(<PostCardUnavailable />, 'en');
    expect(screen.getByText(MESSAGES.en.post.unavailable)).toBeInTheDocument();
  });
});
