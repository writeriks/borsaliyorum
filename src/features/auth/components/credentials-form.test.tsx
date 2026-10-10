import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@/components/auth/auth-provider';

import { MESSAGES, renderWithIntl } from '../../../../tests/utils/render';

import { CredentialsForm } from './credentials-form';

const signInWithEmail = vi.fn();
const signUpWithEmail = vi.fn();
const signInWithGoogle = vi.fn();
vi.mock('../client/auth-flows', () => ({
  signInWithEmail: (...args: unknown[]) => signInWithEmail(...args),
  signUpWithEmail: (...args: unknown[]) => signUpWithEmail(...args),
  signInWithGoogle: (...args: unknown[]) => signInWithGoogle(...args),
}));
vi.mock('@/lib/auth/session-api', () => ({
  prefetchCsrfToken: vi.fn(),
  deleteSession: vi.fn(),
}));

const tr = MESSAGES.tr;

const renderForm = (mode: 'login' | 'signup' = 'login'): void => {
  renderWithIntl(
    <AuthProvider session={{ status: 'anonymous' }}>
      <CredentialsForm mode={mode} next={null} />
    </AuthProvider>
  );
};

const fill = async (email: string, password: string): Promise<void> => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(tr.auth.fields.email), email);
  await user.type(screen.getByLabelText(tr.auth.fields.password), password);
};

beforeEach(() => {
  signInWithEmail.mockReset();
  signUpWithEmail.mockReset();
  signInWithGoogle.mockReset();
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
    expect(signInWithEmail).toHaveBeenCalledWith('tr', 'ayse@example.test', 'dogru-sifre');
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
});
