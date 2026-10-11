import { act, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type AuthContextValue, AuthProvider, useAuth } from '@/components/auth/auth-provider';

import { MESSAGES } from '../../../tests/utils/render';

import type { ShellViewer } from './types';
import { useShellViewer } from './use-shell-viewer';

vi.mock('@/lib/auth/session-api', () => ({ deleteSession: vi.fn() }));

const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
  <NextIntlClientProvider locale='tr' messages={MESSAGES.tr} timeZone='Europe/Istanbul'>
    <AuthProvider session={{ status: 'anonymous' }}>{children}</AuthProvider>
  </NextIntlClientProvider>
);

const useViewerAndAuth = (): { viewer: ShellViewer; auth: AuthContextValue } => ({
  viewer: useShellViewer({ status: 'anonymous' }),
  auth: useAuth(),
});

describe('useShellViewer', () => {
  it('giriş sürerken anonim yerine "unknown" (skeleton; "Giriş yap" görünmez), hata sonrası anonim', () => {
    const { result } = renderHook(useViewerAndAuth, { wrapper });
    expect(result.current.viewer).toEqual({ status: 'anonymous' });

    act(() => result.current.auth.setPending('signing-in'));
    expect(result.current.viewer).toEqual({ status: 'unknown' });

    act(() => result.current.auth.setPending(null));
    expect(result.current.viewer).toEqual({ status: 'anonymous' });
  });

  it('giriş başarılı olunca sunucu oturumu beklenmeden kullanıcı gösterilir', () => {
    const { result } = renderHook(useViewerAndAuth, { wrapper });
    act(() => {
      result.current.auth.setPending('signing-in');
      result.current.auth.applySession({
        status: 'authenticated',
        user: {
          username: 'ayse',
          displayName: 'Ayşe',
          avatarUrl: null,
          email: 'ayse@example.test',
          emailVerified: true,
        },
      });
    });
    expect(result.current.viewer).toEqual({
      status: 'authenticated',
      user: { username: 'ayse', displayName: 'Ayşe', avatarUrl: null },
    });
  });
});
