import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MESSAGES, renderWithIntl } from '../../../tests/utils/render';

import { InvestmentDisclaimer } from './investment-disclaimer';

describe('InvestmentDisclaimer', () => {
  it.each([
    ['tr', '/yasal/yatirim-uyarisi'],
    ['en', '/en/yasal/yatirim-uyarisi'],
  ] as const)('%s short: legal metni + kalıcı "Ayrıntılar" linki', (locale, href) => {
    const m = MESSAGES[locale].legal.disclaimer;
    renderWithIntl(<InvestmentDisclaimer variant='short' id='composer-disclaimer' />, locale);
    const paragraph = screen.getByText(m.short, { exact: false });
    expect(paragraph).toHaveAttribute('id', 'composer-disclaimer');
    expect(screen.getByRole('link', { name: m.more })).toHaveAttribute('href', href);
    // Kapatılamaz: kapatma kontrolü yok (LEG-01)
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('comment varyantı yoruma özel kısa metni kullanır', () => {
    renderWithIntl(<InvestmentDisclaimer variant='comment' />);
    expect(
      screen.getByText(MESSAGES.tr.legal.disclaimer.comment, { exact: false })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(MESSAGES.tr.legal.disclaimer.short, { exact: false })
    ).not.toBeInTheDocument();
  });

  it.each(['tr', 'en'] as const)('%s full: başlıklı bölüm + tam metin', locale => {
    const m = MESSAGES[locale].legal.disclaimer;
    renderWithIntl(<InvestmentDisclaimer variant='full' id='footer-disclaimer' />, locale);
    expect(screen.getByRole('region', { name: m.title })).toBeInTheDocument();
    expect(screen.getByText(m.full)).toBeInTheDocument();
  });
});
