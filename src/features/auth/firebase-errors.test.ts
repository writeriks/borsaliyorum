import { describe, expect, it } from 'vitest';

import en from '../../../messages/en.json';
import tr from '../../../messages/tr.json';

import { AuthErrorKey, authErrorKeyFromFirebase, authErrorKeyFromServer } from './firebase-errors';

const withCode = (code: string): { code: string } => ({ code });

describe('Firebase hata kodu → i18n anahtarı', () => {
  it('hesap varlığını sızdırmaz: kullanıcı yok, şifre yanlış ve devre dışı aynı mesaj', () => {
    const keys = [
      'auth/user-not-found',
      'auth/wrong-password',
      'auth/invalid-credential',
      'auth/invalid-login-credentials',
      'auth/user-disabled',
    ].map(code => authErrorKeyFromFirebase(withCode(code)));
    expect(new Set(keys)).toEqual(new Set([AuthErrorKey.INVALID_CREDENTIALS]));
    // Mesaj hangi alanın yanlış olduğunu söylemez
    expect(tr.auth.errors.invalidCredentials).toBe('E-posta veya şifre hatalı.');
  });

  it('kullanıcının kapattığı popup mesaj üretmez', () => {
    expect(authErrorKeyFromFirebase(withCode('auth/popup-closed-by-user'))).toBeNull();
    expect(authErrorKeyFromFirebase(withCode('auth/cancelled-popup-request'))).toBeNull();
  });

  it('bilinmeyen kod ve kodsuz hata → genel mesaj (ham mesaj gösterilmez)', () => {
    expect(authErrorKeyFromFirebase(withCode('auth/some-new-code'))).toBe(AuthErrorKey.GENERIC);
    expect(authErrorKeyFromFirebase(new Error('Firebase: raw message'))).toBe(AuthErrorKey.GENERIC);
  });

  it('sunucu kodları eşlenir', () => {
    expect(authErrorKeyFromServer('ACCOUNT_SUSPENDED')).toBe(AuthErrorKey.SUSPENDED);
    expect(authErrorKeyFromServer('REAUTH_REQUIRED')).toBe(AuthErrorKey.REAUTH);
    expect(authErrorKeyFromServer('UNAUTHENTICATED')).toBe(AuthErrorKey.INVALID_CREDENTIALS);
    expect(authErrorKeyFromServer('nonsense')).toBe(AuthErrorKey.GENERIC);
  });

  it('her anahtarın iki dilde de mesajı var', () => {
    for (const key of Object.values(AuthErrorKey)) {
      expect(tr.auth.errors[key], `tr ${key}`).toBeTruthy();
      expect(en.auth.errors[key], `en ${key}`).toBeTruthy();
    }
  });
});
