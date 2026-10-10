import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MESSAGES, renderWithIntl } from '../../../tests/utils/render';

import { AppShell, MAIN_CONTENT_ID } from './app-shell';
import { isActivePath } from './nav-link';
import type { ShellViewer } from './types';

const tr = MESSAGES.tr;

const renderShell = (viewer?: ShellViewer, locale: 'tr' | 'en' = 'tr'): void => {
  renderWithIntl(
    <AppShell viewer={viewer}>
      <h1>İçerik</h1>
    </AppShell>,
    locale
  );
};

const authenticated: ShellViewer = {
  status: 'authenticated',
  user: { username: 'aysek', displayName: 'Ayşe Kaya', avatarUrl: null },
};

describe('AppShell', () => {
  it("landmark'lar: ana menü, main, gündem (aside), footer; skip link main'e gider", () => {
    renderShell();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', MAIN_CONTENT_ID);
    expect(within(main).getByRole('heading', { name: 'İçerik' })).toBeInTheDocument();

    const skip = screen.getByRole('link', { name: tr.shell.skipToContent });
    expect(skip).toHaveAttribute('href', `#${MAIN_CONTENT_ID}`);
    // İlk odaklanabilir öğe
    expect(document.querySelector('a, button')).toBe(skip);

    // jsdom CSS uygulamaz: mobil tab bar + masaüstü sol menü ikisi de DOM'da
    expect(screen.getAllByRole('navigation', { name: tr.shell.mainNav })).toHaveLength(2);
    const aside = screen.getByRole('complementary', { name: tr.shell.aside });
    // Footer iki kopya: akış kolonu altı (<lg) ve sağ kolon içi (lg+); CSS ile biri görünür
    const footers = screen.getAllByRole('contentinfo');
    expect(footers).toHaveLength(2);
    expect(footers.filter(footer => aside.contains(footer))).toHaveLength(1);
  });

  it('wordmark ana sayfaya gider; erişilebilir adı i18n', () => {
    renderShell();
    const homeLinks = screen.getAllByRole('link', { name: tr.shell.homeLabel });
    expect(homeLinks.length).toBeGreaterThan(0);
    for (const link of homeLinks) expect(link).toHaveAttribute('href', '/');
  });

  it("auth bilinmiyorken giriş/kayıt UI'ı ASLA render edilmez, skeleton gösterilir", () => {
    renderShell({ status: 'unknown' });
    expect(screen.queryByText(tr.common.login)).not.toBeInTheDocument();
    expect(screen.queryByText(tr.common.signup)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: tr.common.login })).not.toBeInTheDocument();
    expect(screen.queryByTestId('join-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('auth-slot-skeleton')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('tab-bar')).toBeInTheDocument();
    // Kişisel sekmeler (Bildirimler, Profil) yerinde skeleton
    expect(
      screen.queryByRole('link', { name: tr.shell.nav.notifications })
    ).not.toBeInTheDocument();
  });

  it('viewer verilmezse varsayılan unknown', () => {
    renderShell(undefined);
    expect(screen.getByTestId('auth-slot-skeleton')).toBeInTheDocument();
  });

  it('anonim: mobilde tab bar yerine "Sohbete katıl" bandı, giriş/kayıt linkleri', () => {
    renderShell({ status: 'anonymous' });
    const banner = screen.getByTestId('join-banner');
    expect(banner).toHaveTextContent(tr.shell.joinPrompt);
    expect(within(banner).getByRole('link', { name: tr.common.login })).toHaveAttribute(
      'href',
      '/giris'
    );
    expect(within(banner).getByRole('link', { name: tr.common.signup })).toHaveAttribute(
      'href',
      '/kayit'
    );
    expect(screen.queryByTestId('tab-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('auth-slot-skeleton')).not.toBeInTheDocument();
  });

  it('onboarding eksik: "Giriş yap" yerine "Kaydı tamamla" (→ /hos-geldin)', () => {
    renderShell({ status: 'needs-onboarding' });
    expect(screen.queryByText(tr.common.login)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: tr.common.login })).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-cta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('join-banner')).not.toBeInTheDocument();
    const ctas = screen.getAllByTestId('complete-signup-cta');
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) expect(cta).toHaveAttribute('href', '/hos-geldin');
    expect(screen.getByTestId('complete-signup-banner')).toHaveTextContent(tr.shell.completeSignup);
  });

  it('mobil üst bar skeleton’ı test kimliğiyle işaretli (flash testi yakalasın)', () => {
    renderShell({ status: 'unknown' });
    expect(screen.getByTestId('top-bar-account-skeleton')).toBeInTheDocument();
  });

  it('girişli: profil ve bildirim linkleri, avatar baş harfleri', () => {
    renderShell(authenticated);
    const profileLinks = screen.getAllByRole('link', { name: tr.shell.nav.profile });
    for (const link of profileLinks) expect(link).toHaveAttribute('href', '/u/aysek');
    expect(screen.getAllByRole('link', { name: tr.shell.nav.notifications }).length).toBe(2);
    // Hesap menüsü: sol menü (md+) ve mobil üst bar; ikisi de avatar baş harfleriyle
    const accountMenus = screen.getAllByRole('button', { name: 'Hesap menüsü: Ayşe Kaya' });
    expect(accountMenus).toHaveLength(2);
    for (const trigger of accountMenus) expect(trigger).toHaveTextContent('AK');
    expect(screen.queryByText(tr.common.login)).not.toBeInTheDocument();
  });

  it("nav öğeleri Türkçe URL'lere gider, aktif sayfa aria-current", () => {
    globalThis.__testPathname = '/akis';
    renderShell();
    const feedLinks = screen.getAllByRole('link', { name: tr.shell.nav.feed });
    expect(feedLinks).toHaveLength(2);
    for (const link of feedLinks) {
      expect(link).toHaveAttribute('href', '/akis');
      expect(link).toHaveAttribute('aria-current', 'page');
    }
    for (const link of screen.getAllByRole('link', { name: tr.shell.nav.explore })) {
      expect(link).toHaveAttribute('href', '/kesfet');
      expect(link).not.toHaveAttribute('aria-current');
    }
  });

  it('İngilizce: metinler ve linkler /en önekli', () => {
    globalThis.__testPathname = '/en/kesfet';
    renderShell({ status: 'unknown' }, 'en');
    const explore = screen.getAllByRole('link', { name: MESSAGES.en.shell.nav.explore });
    for (const link of explore) {
      expect(link).toHaveAttribute('href', '/en/kesfet');
      expect(link).toHaveAttribute('aria-current', 'page');
    }
    expect(screen.getAllByText(MESSAGES.en.legal.disclaimer.full)).toHaveLength(2);
  });

  it('footer yatırım tavsiyesi değildir uyarısının tam metnini içerir', () => {
    renderShell();
    for (const footer of screen.getAllByRole('contentinfo')) {
      expect(within(footer).getByText(tr.legal.disclaimer.full)).toBeInTheDocument();
    }
  });
});

describe('isActivePath', () => {
  it.each([
    ['/akis', '/akis', true],
    ['/akis/takip', '/akis', true],
    ['/akisx', '/akis', false],
    ['/', '/akis', false],
  ] as const)('%s ~ %s → %s', (pathname, href, expected) => {
    expect(isActivePath(pathname, href)).toBe(expected);
  });
});
