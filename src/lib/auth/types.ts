import { ErrorCode } from '@/lib/errors';

/**
 * Oturum tipleri (ADR-0001 Karar 5). Sunucu tek doğruluk kaynağıdır; istemciye yalnızca
 * `ClientSession` gider (firebaseUid, rol ve iç kimlikler yok; e-posta yalnızca sahibine).
 */

export type UserRole = 'default' | 'moderator' | 'admin';

/** `getCurrentUser()` dönüşü: PublicUser + sahibine özel alanlar. */
export type SessionUser = {
  readonly userId: number;
  readonly username: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  /** Yalnızca oturum sahibine gösterilir. */
  readonly email: string;
  readonly emailVerified: boolean;
  /**
   * Kabul edilen yasal metin paketi güncel değil (`LEGAL_BUNDLE_VERSION`): yeniden kabul edene
   * kadar okuyabilir, yazamaz (`requireWriter` → `LEGAL_ACCEPTANCE_REQUIRED`).
   */
  readonly legalAcceptanceRequired: boolean;
  /** Sunucu tarafı yetki için; istemciye gönderilmez. */
  readonly roles: readonly UserRole[];
};

/** Kimliği doğrulanmış ama kullanıcı adı seçmemiş hesap (yeni kayıt ya da kurala uymayan eski ad). */
export type OnboardingIdentity = {
  readonly firebaseUid: string;
  readonly email: string;
  readonly emailVerified: boolean;
  /** Eski hesabın ya da Google profilinin görünen adı; form önerisi. */
  readonly suggestedDisplayName: string | null;
  /** Eski (v1) hesabın DB satırı varsa onun kimliği; yeni kayıtta null. */
  readonly existingUserId: number | null;
};

export type SessionState =
  | {
      readonly status: 'authenticated';
      readonly user: SessionUser;
      readonly firebaseUid: string;
      readonly authTime: number;
    }
  | {
      readonly status: 'needs-onboarding';
      readonly identity: OnboardingIdentity;
      readonly authTime: number;
    }
  | {
      readonly status: 'anonymous';
      /**
       * Hesap askıda: sayfalar için anonimle aynıdır (istemciye taşınmaz), ama Server Action'lar
       * `UNAUTHENTICATED` yerine `ACCOUNT_SUSPENDED` döner (kullanıcı neden yazamadığını bilsin;
       * giriş tekrar denenince de aynı kod gelir).
       */
      readonly reason?: 'suspended';
    };

/** İstemciye giden kullanıcı (AuthProvider). */
export type ClientUser = {
  readonly username: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly legalAcceptanceRequired: boolean;
};

export type ClientSession =
  | { readonly status: 'authenticated'; readonly user: ClientUser }
  | { readonly status: 'needs-onboarding' }
  | { readonly status: 'anonymous' };

export const ANONYMOUS_SESSION: SessionState = { status: 'anonymous' };
export const SUSPENDED_SESSION: SessionState = { status: 'anonymous', reason: 'suspended' };

/** Anonim oturumun Server Action hata kodu: askıdaki hesap ayrıca bildirilir. */
export const anonymousErrorCode = (
  session: Extract<SessionState, { status: 'anonymous' }>
): typeof ErrorCode.ACCOUNT_SUSPENDED | typeof ErrorCode.UNAUTHENTICATED =>
  session.reason === 'suspended' ? ErrorCode.ACCOUNT_SUSPENDED : ErrorCode.UNAUTHENTICATED;

export const toClientUser = (user: SessionUser): ClientUser => ({
  username: user.username,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
  email: user.email,
  emailVerified: user.emailVerified,
  legalAcceptanceRequired: user.legalAcceptanceRequired,
});

export const toClientSession = (state: SessionState): ClientSession => {
  switch (state.status) {
    case 'authenticated':
      return { status: 'authenticated', user: toClientUser(state.user) };
    case 'needs-onboarding':
      return { status: 'needs-onboarding' };
    default:
      return { status: 'anonymous' };
  }
};
