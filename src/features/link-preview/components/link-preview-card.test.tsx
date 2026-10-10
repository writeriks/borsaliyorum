import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@tests/utils/render';

import type { LinkPreviewDto } from '../types';

import { LinkPreviewCard, LinkPreviewCardSkeleton } from './link-preview-card';

const preview: LinkPreviewDto = {
  url: 'https://www.kap.org.tr/tr/Bildirim/1',
  host: 'kap.org.tr',
  siteName: 'KAP',
  title: 'THYAO Özel Durum Açıklaması',
  description: 'Şirketimizin 2026 yılı 3. çeyrek sonuçları',
};

describe('LinkPreviewCard', () => {
  it('tek bir link; erişilebilir adı başlık ve host içerir, yeni sekmede güvenli açılır', () => {
    renderWithIntl(<LinkPreviewCard preview={preview} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAccessibleName(
      'THYAO Özel Durum Açıklaması, kap.org.tr (yeni sekmede açılır)'
    );
    expect(link).toHaveAttribute('href', preview.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('host her zaman görünür; görsel yoktur (K6)', () => {
    const { container } = renderWithIntl(<LinkPreviewCard preview={preview} />);
    expect(screen.getByText('kap.org.tr')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('İngilizce erişilebilir ad', () => {
    renderWithIntl(<LinkPreviewCard preview={preview} />, 'en');
    expect(screen.getByRole('link')).toHaveAccessibleName(
      'THYAO Özel Durum Açıklaması, kap.org.tr (opens in a new tab)'
    );
  });

  it('HTML içeren başlık ve açıklama düz metin olarak render edilir', () => {
    const { container } = renderWithIntl(
      <LinkPreviewCard
        preview={{
          ...preview,
          title: '<img src=x onerror=alert(1)>',
          description: '<script>alert(1)</script>',
        }}
      />
    );
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(container.querySelector('img, script')).toBeNull();
  });

  it('açıklama yoksa yalnızca host ve başlık', () => {
    renderWithIntl(<LinkPreviewCard preview={{ ...preview, description: null }} />);
    expect(screen.queryByText(preview.description ?? '')).toBeNull();
  });
});

describe('LinkPreviewCardSkeleton', () => {
  it('yükleme durumunu erişilebilir şekilde bildirir', () => {
    renderWithIntl(<LinkPreviewCardSkeleton />);
    expect(screen.getByRole('status')).toHaveAccessibleName('Bağlantı önizlemesi yükleniyor');
  });
});
