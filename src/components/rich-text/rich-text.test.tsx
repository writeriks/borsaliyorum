import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { parseEntities } from '@/lib/entities';

import { renderWithIntl } from '../../../tests/utils/render';

import { toRichTextContent } from './resolve';
import { RichText } from './rich-text';
import type { RichTextEntity, StockLookup } from './types';

const STOCKS: StockLookup = {
  THYAO: { ticker: 'THYAO', companyName: 'Türk Hava Yolları A.O.', stockType: 'stock' },
};

const fromParser = (text: string): RichTextEntity[] =>
  parseEntities(text).map((entity): RichTextEntity => {
    if (entity.type === 'hashtag') {
      return { type: 'hashtag', start: entity.start, end: entity.end, slug: entity.slug };
    }
    if (entity.type === 'mention') return { ...entity, displayName: 'Ayşe Kaya' };
    return entity;
  });

const renderText = (text: string, entities = fromParser(text), locale: 'tr' | 'en' = 'tr') =>
  renderWithIntl(<RichText text={text} entities={entities} stocks={STOCKS} />, locale);

describe('RichText', () => {
  it('cashtag → /hisse/THYAO, erişilebilir ad şirket adıyla ([ENT-R01])', () => {
    renderText('$THYAO yükselir');
    const link = screen.getByRole('link', { name: '$THYAO, Türk Hava Yolları A.O.' });
    expect(link).toHaveAttribute('href', '/hisse/THYAO');
    expect(link).toHaveTextContent('$THYAO');
    expect(link).not.toHaveAttribute('target');
  });

  it('hashtag → /etiket/<slug> ([ENT-R02])', () => {
    renderText("#BİST100'de düşüş");
    const link = screen.getByRole('link', { name: '#BİST100' });
    expect(link).toHaveAttribute('href', '/etiket/bist100');
  });

  it('mention → /u/<güncel ad>, adı içerir ([ENT-R03])', () => {
    renderText('@aysek ne dersin');
    const link = screen.getByRole('link', { name: '@aysek, Ayşe Kaya' });
    expect(link).toHaveAttribute('href', '/u/aysek');
  });

  it('URL kısaltılmış + ↗, yeni sekme ve ugc rel ([ENT-R04], [URL-02])', () => {
    const href = 'https://www.borsaistanbul.com/tr/sayfa/2367/endeks-bilgileri?x=1';
    renderText(`kaynak ${href}`);
    const link = screen.getByRole('link', {
      // jsdom'un ad hesabı satır içi öğe metnini kırpar; gerçek tarayıcıdaki boşluk E2E'de
      name: /^borsaistanbul\.com\/tr\/sayfa\/2367…\s?\(yeni sekmede açılır\)$/,
    });
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveAttribute('title', href);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')?.split(' ').sort()).toEqual(
      ['noopener', 'noreferrer', 'nofollow', 'ugc'].sort()
    );
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('en: yeni sekme ipucu İngilizce', () => {
    renderText('https://x.com/a', undefined, 'en');
    expect(
      screen.getByRole('link', { name: /^x\.com\/a\s?\(opens in a new tab\)$/ })
    ).toBeInTheDocument();
  });

  it('satır sonları pre-wrap ile korunur, <br> üretilmez', () => {
    const { container } = renderText('ilk satır\nikinci satır');
    const paragraph = container.querySelector('[data-slot="rich-text"]');
    expect(paragraph?.textContent).toBe('ilk satır\nikinci satır');
    expect(paragraph?.className).toContain('whitespace-pre-wrap');
    expect(container.querySelector('br')).toBeNull();
  });

  describe('XSS', () => {
    it('HTML/script metni escape edilir, DOM öğesi oluşmaz', () => {
      const text =
        '<script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:x">y</a>';
      const { container } = renderText(text, []);
      expect(container.querySelector('script, img, a')).toBeNull();
      expect(container.textContent).toBe(text);
    });

    it('jsonb’ye sızmış javascript: href link olmaz ([ENT-R06])', () => {
      const text = 'tıkla javascript:alert(1)';
      renderText(text, [{ type: 'url', start: 6, end: 25, href: 'javascript:alert(1)' }]);
      expect(screen.queryByRole('link')).toBeNull();
      expect(screen.getByText(text)).toBeInTheDocument();
    });

    it('data: href ve güvenli metin + kötü href link olmaz', () => {
      const text = 'https://kap.org.tr';
      renderText(text, [
        { type: 'url', start: 0, end: text.length, href: 'data:text/html,<b>x</b>' },
      ]);
      expect(screen.queryByRole('link')).toBeNull();
    });

    it('homograf host punycode gösterilir, href kanonik', () => {
      renderText('https://аpple.com/giris');
      const link = screen.getByRole('link', { name: /xn--pple-43d\.com\/giris/ });
      expect(link).toHaveAttribute('href', 'https://xn--pple-43d.com/giris');
      expect(link.textContent).not.toContain('аpple');
    });
  });

  it('bozuk offset’ler render’ı düşürmez, metin aynen görünür', () => {
    const text = '$THYAO #bist100';
    const { container } = renderText(text, [
      { type: 'cashtag', start: 0, end: 99, ticker: 'THYAO' },
      { type: 'hashtag', start: -2, end: 3, slug: 'bist100' },
      { type: 'hashtag', start: 7, end: 15, slug: 'bist100' },
      { type: 'hashtag', start: 8, end: 15, slug: 'ist100' },
    ]);
    expect(container.textContent).toBe(text);
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('indekste olmayan hisse ve çözülemeyen mention düz metin ([ENT-R07])', () => {
    const { text, entities } = toRichTextContent(
      {
        content: '$ZZZZ @silinen',
        contentFormat: 2,
        entities: {
          v: 1,
          items: [
            { type: 'cashtag', start: 0, end: 5, ticker: 'ZZZZ', stockId: 9 },
            { type: 'mention', start: 6, end: 14, username: 'silinen', userId: 404 },
          ],
        },
      },
      { users: [] }
    );
    renderText(text, entities);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('$ZZZZ @silinen')).toBeInTheDocument();
  });

  it('eski $(THYAO) markup’ı $THYAO linki olarak görünür', () => {
    const { text, entities } = toRichTextContent({
      content: '$(THYAO) uçuşta',
      contentFormat: 1,
      entities: null,
    });
    const { container } = renderText(text, entities);
    expect(container.textContent).toBe('$THYAO uçuşta');
    const link = screen.getByRole('link', { name: /^\$THYAO/ });
    expect(link).toHaveAttribute('href', '/hisse/THYAO');
    expect(within(link).queryByText('$(THYAO)')).toBeNull();
  });
});
