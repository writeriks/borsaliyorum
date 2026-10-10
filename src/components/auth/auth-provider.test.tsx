import { act, fireEvent, screen } from '@testing-library/react';
import type * as Sonner from 'sonner';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthSlot } from '@/components/shell/auth-slot';
import { SIGNED_OUT_EVENT } from '@/lib/auth-events';
import type { ClientSession } from '@/lib/auth/types';

import { MESSAGES, renderWithIntl } from '../../../tests/utils/render';

import { AuthProvider, useAuth } from './auth-provider';

const deleteSession = vi.fn();
vi.mock('@/lib/auth/session-api', () => ({
  deleteSession: () => deleteSession(),
  prefetchCsrfToken: vi.fn(),
}));

const toastError = vi.fn();
vi.mock('sonner', async importOriginal => ({
  ...(await importOriginal<typeof Sonner>()),
  toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() },
}));

const tr = MESSAGES.tr;

const authenticated: ClientSession = {
  status: 'authenticated',
  user: {
    username: 'aysek',
    displayName: 'Ayşe Kaya',
    avatarUrl: null,
    email: 'ayse@example.test',
    emailVerified: true,
  },
};

let signOutDone: Promise<void> | undefined;
const SignOutProbe = (): ReactElement => {
  const { signOut } = useAuth();
  return (
    <button type='button' onClick={() => (signOutDone = signOut())}>
      {'probe-sign-out'}
    </button>
  );
};
const clickSignOut = async (): Promise<void> => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'probe-sign-out' }));
  });
};

const renderWithSession = (session: ClientSession): void => {
  renderWithIntl(
    <AuthProvider session={session}>
      <SignOutProbe />
      {/* Sunucu prop'u "unknown" olsa da sağlayıcı varken kabuk sağlayıcıyı okur */}
      <AuthSlot viewer={{ status: 'unknown' }} />
    </AuthProvider>
  );
};

beforeEach(() => {
  deleteSession.mockReset();
  toastError.mockReset();
  signOutDone = undefined;
});

describe('AuthProvider', () => {
  it('ilk render sunucu oturumuyla: girişliyse avatar, "Giriş yap" ve skeleton yok', () => {
    renderWithSession(authenticated);
    expect(screen.getByTestId('viewer-avatar')).toHaveTextContent('AK');
    expect(screen.queryByTestId('login-cta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('auth-slot-skeleton')).not.toBeInTheDocument();
    expect(screen.queryByText(tr.common.login)).not.toBeInTheDocument();
  });

  it("anonimse ilk render'da doğrudan giriş/kayıt; yükleniyor durumu yok", () => {
    renderWithSession({ status: 'anonymous' });
    expect(screen.getAllByTestId('login-cta').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('auth-slot-skeleton')).not.toBeInTheDocument();
  });

  it('çıkış: sunucu yanıtı beklenmeden UI anında anonime döner', async () => {
    deleteSession.mockReturnValue(new Promise(() => undefined));
    renderWithSession(authenticated);
    await clickSignOut();
    expect(screen.queryByTestId('viewer-avatar')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('login-cta').length).toBeGreaterThan(0);
  });

  it('başarılı çıkışta SIGNED_OUT_EVENT yayınlanır (S8 taslakları temizler), sonra tam sayfa geçiş', async () => {
    const order: string[] = [];
    const replace = vi.fn(() => order.push('navigate'));
    vi.stubGlobal('location', { ...window.location, replace });
    const listener = vi.fn(() => order.push('signed-out'));
    window.addEventListener(SIGNED_OUT_EVENT, listener);
    deleteSession.mockResolvedValue({ ok: true, data: null });
    try {
      renderWithSession(authenticated);
      await clickSignOut();
      await act(async () => {
        await signOutDone;
      });
      expect(SIGNED_OUT_EVENT).toBe('borsaliyorum:signed-out');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(order).toEqual(['signed-out', 'navigate']);
      expect(replace).toHaveBeenCalledWith('/');
    } finally {
      window.removeEventListener(SIGNED_OUT_EVENT, listener);
      vi.unstubAllGlobals();
    }
  });

  it('çıkış başarısızsa SIGNED_OUT_EVENT yayınlanmaz (taslaklar korunur)', async () => {
    const listener = vi.fn();
    window.addEventListener(SIGNED_OUT_EVENT, listener);
    deleteSession.mockResolvedValue({ ok: false, error: 'NETWORK' });
    renderWithSession(authenticated);
    await clickSignOut();
    await act(async () => {
      await signOutDone;
    });
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(SIGNED_OUT_EVENT, listener);
  });

  it("çıkış başarısızsa oturum geri gelir ve hata toast'ı gösterilir", async () => {
    deleteSession.mockResolvedValue({ ok: false, error: 'NETWORK' });
    renderWithSession(authenticated);
    await clickSignOut();
    await act(async () => {
      await signOutDone;
    });
    expect(screen.getByTestId('viewer-avatar')).toBeInTheDocument();
    expect(toastError).toHaveBeenCalledWith(tr.auth.signOut.failed);
  });

  it('useAuth sağlayıcı dışında açık hata verir (sessiz anonim varsayılan yok)', () => {
    const Orphan = (): null => {
      useAuth();
      return null;
    };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderWithIntl(<Orphan />)).toThrow(/AuthProvider/);
  });
});
