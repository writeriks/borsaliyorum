import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as NextNavigation from 'next/navigation';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from '@/components/auth/auth-provider';

import { MESSAGES, renderWithIntl } from '../../../../tests/utils/render';

import { CredentialsForm, type CredentialsMode } from './credentials-form';

const signInWithEmail = vi.fn();
const signUpWithEmail = vi.fn();
const signInWithGoogle = vi.fn();
const sendVerificationEmail = vi.fn();
const hasPendingGoogleRedirect = vi.fn(() => false);
const completeGoogleRedirect = vi.fn();
vi.mock('../client/auth-flows', () => ({
  signInWithEmail: (...args: unknown[]) => signInWithEmail(...args),
  signUpWithEmail: (...args: unknown[]) => signUpWithEmail(...args),
  signInWithGoogle: (...args: unknown[]) => signInWithGoogle(...args),
  sendVerificationEmail: (...args: unknown[]) => sendVerificationEmail(...args),
  hasPendingGoogleRedirect: () => hasPendingGoogleRedirect(),
  completeGoogleRedirect: (...args: unknown[]) => completeGoogleRedirect(...args),
}));
const authorizeVerificationEmail = vi.fn();
vi.mock('../server/actions', () => ({
  authorizeVerificationEmail: () => authorizeVerificationEmail(),
}));
const prewarmClientAuth = vi.fn();
vi.mock('@/lib/auth/firebase-client', () => ({
  prewarmClientAuth: (...args: unknown[]) => prewarmClientAuth(...args),
}));
vi.mock('@/lib/auth/session-api', () => ({
  prefetchCsrfToken: vi.fn(),
  deleteSession: vi.fn(),
}));
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));
const routerReplace = vi.fn();
const hardNavigate = vi.fn();
vi.mock('@/lib/client/hard-navigate', () => ({
  hardNavigate: (...args: unknown[]) => hardNavigate(...args),
}));
vi.mock('next/navigation', async importOriginal => ({
  ...(await importOriginal<typeof NextNavigation>()),
  useRouter: () => ({ replace: routerReplace, refresh: vi.fn(), push: vi.fn() }),
}));

const tr = MESSAGES.tr;

let pendingSeen: string[] = [];
const PendingProbe = (): null => {
  const { pending } = useAuth();
  pendingSeen.push(String(pending));
  return null;
};

const ANONYMOUS = { status: 'anonymous' } as const;
const AUTH_USER = {
  username: 'ayse',
  displayName: 'Ayşe',
  avatarUrl: null,
  email: 'ayse@example.test',
  emailVerified: true,
  legalAcceptanceRequired: false,
} as const;

const tree = (showForm: boolean, mode: CredentialsMode = 'login'): ReactElement => (
  <AuthProvider session={ANONYMOUS}>
    <PendingProbe />
    {showForm ? <CredentialsForm mode={mode} next={null} /> : null}
  </AuthProvider>
);

const renderForm = (mode: CredentialsMode = 'login') => renderWithIntl(tree(true, mode));

const fill = async (email: string, password: string): Promise<void> => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(tr.auth.fields.email), email);
  await user.type(screen.getByLabelText(tr.auth.fields.password), password);
};

beforeEach(() => {
  signInWithEmail.mockReset();
  signUpWithEmail.mockReset();
  signInWithGoogle.mockReset();
  sendVerificationEmail.mockReset();
  authorizeVerificationEmail.mockReset();
  prewarmClientAuth.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  routerReplace.mockReset();
  hardNavigate.mockReset();
  pendingSeen = [];
});

describe('CredentialsForm', () => {
  it('gönderilince buton anında devre dışı + spinner + "Giriş yapılıyor…"; Google da kilitlenir', async () => {
    signInWithEmail.mockReturnValue(new Promise(() => undefined));
    renderForm();
    await fill('ayse@example.test', 'dogru-sifre');
    await userEvent.click(screen.getByTestId('auth-submit'));

    const submit = screen.getByTestId('auth-submit');
    await waitFor(() => expect(submit).toBeDisabled());
    expect(submit).toHaveTextContent(tr.auth.login.submitting);
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('button-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('auth-google')).toBeDisabled();
    expect(signInWithEmail).toHaveBeenCalledWith(
      'tr',
      'ayse@example.test',
      'dogru-sifre',
      undefined
    );
  });

  it('hatalı giriş: alan belirtmeyen tek mesaj, buton yeniden etkin', async () => {
    signInWithEmail.mockResolvedValue({ ok: false, error: 'invalidCredentials' });
    renderForm();
    await fill('ayse@example.test', 'yanlis-sifre');
    await userEvent.click(screen.getByTestId('auth-submit'));

    expect(await screen.findByRole('alert')).toHaveTextContent(tr.auth.errors.invalidCredentials);
    expect(screen.getByTestId('auth-submit')).toBeEnabled();
    expect(screen.getByLabelText(tr.auth.fields.email)).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText(tr.auth.fields.password)).not.toHaveAttribute('aria-invalid');
  });

  it('istemci doğrulaması: geçersiz e-posta Firebase çağrısı yapmadan gösterilir', async () => {
    renderForm();
    await fill('gecersiz', 'x');
    await userEvent.click(screen.getByTestId('auth-submit'));
    expect(await screen.findByText(tr.auth.validation.emailInvalid)).toBeInTheDocument();
    expect(signInWithEmail).not.toHaveBeenCalled();
  });

  it('kayıtta şifre en az 8 karakter', async () => {
    renderForm('signup');
    await fill('ayse@example.test', 'kisa');
    await userEvent.click(screen.getByTestId('auth-submit'));
    expect(await screen.findByText(tr.auth.validation.passwordTooShort)).toBeInTheDocument();
    expect(signUpWithEmail).not.toHaveBeenCalled();
  });

  it('Google popup açıkken buton "Google ile bağlanılıyor…" durumunda kalır', async () => {
    signInWithGoogle.mockReturnValue(new Promise(() => undefined));
    renderForm();
    await userEvent.click(screen.getByTestId('auth-google'));
    const google = screen.getByTestId('auth-google');
    expect(google).toBeDisabled();
    expect(google).toHaveTextContent(tr.auth.google.pending);
    expect(screen.getByTestId('auth-submit')).toBeDisabled();
  });

  it('popup kullanıcı tarafından kapatılırsa mesaj gösterilmez', async () => {
    signInWithGoogle.mockResolvedValue({ ok: false, error: null });
    renderForm();
    await userEvent.click(screen.getByTestId('auth-google'));
    await waitFor(() => expect(screen.getByTestId('auth-google')).toBeEnabled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it("form açılınca Firebase SDK'sı önceden ısıtılır (popup tıklamada senkron açılsın)", () => {
    renderForm();
    expect(prewarmClientAuth).toHaveBeenCalledWith('tr');
  });

  it('kayıt hatası giriş metniyle değil, kendi metniyle gösterilir', async () => {
    signUpWithEmail.mockResolvedValue({ ok: false, error: 'generic' });
    renderForm('signup');
    await fill('ayse@example.test', 'dogru-sifre-1');
    await userEvent.click(screen.getByTestId('auth-submit'));
    expect(await screen.findByRole('alert')).toHaveTextContent(tr.auth.errors.signupGeneric);
  });

  it('başarılı girişten sonra form kaldırılınca "signing-in" temizlenir', async () => {
    signInWithEmail.mockResolvedValue({ ok: true, session: { status: 'needs-onboarding' } });
    const { rerender } = renderWithIntl(tree(true));
    await fill('ayse@example.test', 'dogru-sifre');
    await userEvent.click(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(hardNavigate).toHaveBeenCalled());
    expect(pendingSeen.at(-1)).toBe('signing-in');
    // Navigasyon: form sayfadan kalkar, kalıcı sağlayıcıda bekleyen durum kalmamalı
    rerender(tree(false));
    await waitFor(() => expect(pendingSeen.at(-1)).toBe('null'));
  });

  it('reverify: yeniden girişte izin alınır, bağlantı gönderilir ve bildirilir', async () => {
    authorizeVerificationEmail.mockResolvedValue({ ok: true, data: null });
    sendVerificationEmail.mockResolvedValue(undefined);
    const user = { emailVerified: false };
    signInWithEmail.mockImplementation(
      async (_l: string, _e: string, _p: string, after: (u: unknown) => Promise<void>) => {
        await after(user);
        return { ok: true, session: { status: 'needs-onboarding' } };
      }
    );
    renderForm('reverify');
    expect(screen.getByTestId('auth-submit')).toHaveTextContent(tr.auth.reverify.submit);
    await fill('ayse@example.test', 'dogru-sifre');
    await userEvent.click(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(tr.auth.verify.resent));
    expect(authorizeVerificationEmail).toHaveBeenCalledTimes(1);
    expect(sendVerificationEmail).toHaveBeenCalledWith(user);
  });

  it('reverify: rate limit aşılınca e-posta gönderilmez, kullanıcıya söylenir', async () => {
    authorizeVerificationEmail.mockResolvedValue({ ok: false, error: 'RATE_LIMITED' });
    signInWithEmail.mockImplementation(
      async (_l: string, _e: string, _p: string, after: (u: unknown) => Promise<void>) => {
        await after({ emailVerified: false });
        return { ok: true, session: { status: 'needs-onboarding' } };
      }
    );
    renderForm('reverify');
    await fill('ayse@example.test', 'dogru-sifre');
    await userEvent.click(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(tr.auth.verify.resendRateLimited));
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("anonimken giriş: next'e tam sayfa geçiş (eski router önbelleği yönlendirme döngüsü kurmasın)", async () => {
    signInWithEmail.mockResolvedValue({
      ok: true,
      session: { status: 'authenticated', user: AUTH_USER },
    });
    renderWithIntl(
      <AuthProvider session={ANONYMOUS}>
        <CredentialsForm mode='login' next='/akis?sekme=son' />
      </AuthProvider>
    );
    await fill('ayse@example.test', 'dogru-sifre');
    await userEvent.click(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/akis?sekme=son'));
    expect(hardNavigate).toHaveBeenCalledTimes(1);
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('zaten girişliyken yeniden doğrulama: yumuşak geçiş (toast korunur)', async () => {
    signInWithEmail.mockResolvedValue({
      ok: true,
      session: { status: 'authenticated', user: AUTH_USER },
    });
    renderWithIntl(
      <AuthProvider session={{ status: 'authenticated', user: AUTH_USER }}>
        <CredentialsForm mode='login' next={null} />
      </AuthProvider>
    );
    await fill('ayse@example.test', 'dogru-sifre');
    await userEvent.click(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/akis'));
    expect(hardNavigate).not.toHaveBeenCalled();
  });
});

describe('aydınlatma notu (KVKK md.10: veri elde edilirken)', () => {
  it.each(['login', 'signup'] as const)(
    '%s: not Google butonunun hemen altında; /yasal/kvkk yeni sekmede',
    mode => {
      renderForm(mode);
      const note = screen.getByTestId('auth-privacy-note');
      // Google ile ilk girişte de hesap oluştuğu için giriş formunda da görünür
      expect(screen.getByTestId('auth-google').nextElementSibling).toBe(note);
      expect(note.textContent).toMatch(/e-posta adresini/);
      const link = within(note).getByRole('link', { name: 'Aydınlatma Metni' });
      expect(link).toHaveAttribute('href', '/yasal/kvkk');
      expect(link).toHaveAttribute('target', '_blank');
    }
  );

  it('reverify (zaten hesabı olan) modunda not gösterilmez', () => {
    renderForm('reverify');
    expect(screen.queryByTestId('auth-privacy-note')).not.toBeInTheDocument();
  });
});
