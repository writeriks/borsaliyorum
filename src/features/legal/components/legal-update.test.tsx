import { fireEvent, screen, waitFor } from '@testing-library/react';
import type * as NextNavigation from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@/components/auth/auth-provider';
import { fail } from '@/lib/errors';
import type { ClientSession } from '@/lib/auth/types';

import { MESSAGES, renderWithIntl } from '../../../../tests/utils/render';

import { LegalAcceptanceForm } from './legal-acceptance-form';
import { LegalUpdateNotice } from './legal-update-notice';

let pathname = '/akis';
const push = vi.fn();
vi.mock('next/navigation', async importOriginal => ({
  ...(await importOriginal<typeof NextNavigation>()),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams('sekme=son'),
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));
const acceptLegalUpdate = vi.fn();
vi.mock('../server/actions', () => ({
  acceptLegalUpdate: (input: unknown) => acceptLegalUpdate(input),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const tr = MESSAGES.tr.legalUpdate;

const session = (legalAcceptanceRequired: boolean): ClientSession => ({
  status: 'authenticated',
  user: {
    username: 'aysek',
    displayName: 'Ayşe',
    avatarUrl: null,
    email: 'ayse@example.test',
    emailVerified: true,
    legalAcceptanceRequired,
  },
});

beforeEach(() => {
  pathname = '/akis';
  push.mockReset();
  acceptLegalUpdate.mockReset();
});

describe('LegalUpdateNotice', () => {
  it('kabul gerekiyorsa bant + kabul ekranına bulunduğu sayfayla bağlantı', () => {
    renderWithIntl(
      <AuthProvider session={session(true)}>
        <LegalUpdateNotice />
      </AuthProvider>
    );
    expect(screen.getByRole('heading', { name: tr.banner.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr.banner.cta })).toHaveAttribute(
      'href',
      '/yasal/yeni-surum?next=%2Fakis%3Fsekme%3Dson'
    );
  });

  it('paket güncelse, anonimse ya da kabul ekranının kendisindeyken görünmez', () => {
    const { rerender } = renderWithIntl(
      <AuthProvider session={session(false)}>
        <LegalUpdateNotice />
      </AuthProvider>
    );
    expect(screen.queryByTestId('legal-update-notice')).toBeNull();
    rerender(
      <AuthProvider session={{ status: 'anonymous' }}>
        <LegalUpdateNotice />
      </AuthProvider>
    );
    expect(screen.queryByTestId('legal-update-notice')).toBeNull();
    pathname = '/en/yasal/yeni-surum';
    rerender(
      <AuthProvider session={session(true)}>
        <LegalUpdateNotice />
      </AuthProvider>
    );
    expect(screen.queryByTestId('legal-update-notice')).toBeNull();
  });

  it('AuthProvider olmadan (izole kabuk testleri) hiçbir şey render etmez', () => {
    renderWithIntl(<LegalUpdateNotice />);
    expect(screen.queryByTestId('legal-update-notice')).toBeNull();
  });
});

describe('LegalAcceptanceForm', () => {
  it('kutu işaretlenmeden gönderilmez; satır içi hata', async () => {
    renderWithIntl(<LegalAcceptanceForm next='/akis' />);
    fireEvent.click(screen.getByTestId('legal-accept-submit'));
    expect(await screen.findByText(tr.checkboxRequired)).toBeInTheDocument();
    expect(acceptLegalUpdate).not.toHaveBeenCalled();
    // Kutu varsayılan olarak işaretsiz
    expect(screen.getByRole('checkbox', { name: tr.checkbox })).not.toBeChecked();
  });

  it('işaretlenince next ile gönderir; gönderim sürerken buton kilitli', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    acceptLegalUpdate.mockReturnValue(new Promise(r => (resolve = r)));
    renderWithIntl(<LegalAcceptanceForm next='/akis' />);
    fireEvent.click(screen.getByRole('checkbox', { name: tr.checkbox }));
    fireEvent.click(screen.getByTestId('legal-accept-submit'));
    await waitFor(() =>
      expect(acceptLegalUpdate).toHaveBeenCalledWith({ accepted: true, next: '/akis' })
    );
    expect(screen.getByTestId('legal-accept-submit')).toBeDisabled();
    expect(screen.getByTestId('legal-accept-submit')).toHaveTextContent(tr.submitting);
    resolve(fail('RATE_LIMITED'));
    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.tr.errors.RATE_LIMITED);
  });

  it('oturum düşmüşse girişe (bulunduğu sayfaya dönecek şekilde) yönlendirir', async () => {
    acceptLegalUpdate.mockResolvedValue(fail('UNAUTHENTICATED'));
    renderWithIntl(<LegalAcceptanceForm next={null} />);
    fireEvent.click(screen.getByRole('checkbox', { name: tr.checkbox }));
    fireEvent.click(screen.getByTestId('legal-accept-submit'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/giris?next=%2Fakis%3Fsekme%3Dson'));
  });
});
