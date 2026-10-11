import 'server-only';

import { Prisma, type PrismaClient } from '@/generated/prisma/client';
import { recordContentEvent } from '@/lib/audit/content-event';
import type { OnboardingIdentity } from '@/lib/auth/types';
import { ErrorCode, fail, ok, type Result } from '@/lib/errors';
import {
  LEGAL_BUNDLE_DOCUMENT_VERSIONS,
  LEGAL_BUNDLE_VERSION,
  MARKETING_CONSENT_TEXT_VERSION,
  PRIVACY_NOTICE_VERSION,
} from '@/lib/legal/versions';
import type { Logger } from '@/lib/logger';
import type { RequestMeta } from '@/lib/request-meta';
import { isReservedUsername } from '@/lib/users/reserved-usernames';
import { USERNAME_PATTERN } from '@/lib/users/username';

import type { OnboardingData } from '../schemas';

export type OnboardingDeps = {
  readonly db: PrismaClient;
  readonly ipKey: () => Uint8Array;
  readonly now: () => Date;
  readonly log: Logger;
  /** Pazarlama izni kutusu açık mı (`MARKETING_CONSENT_ENABLED`)? Kapalıyken izin yazılmaz. */
  readonly marketingConsentEnabled: boolean;
  /**
   * Firebase hesabı hâlâ var mı (`admin.getUser`)? Yetim hesap imhası hesabı silmiş olabilir;
   * oturum çerezi o sırada hâlâ geçerlidir. Hesabı olmayan kimliğe User satırı yazılmaz.
   * Firebase'e ulaşılamazsa fırlatır (fail-closed).
   */
  readonly firebaseAccountExists: (firebaseUid: string) => Promise<boolean>;
};

export type UsernameAvailability = 'available' | 'taken' | 'reserved' | 'invalid';

/**
 * Kullanıcı adı müsait mi? Kural + rezerve liste + benzersizlik (büyük/küçük harf duyarsız:
 * eski hesaplarda büyük harfli adlar var). `exceptUserId`: eski hesabın kendi satırı.
 */
export const checkUsername = async (
  db: PrismaClient,
  username: string,
  exceptUserId: number | null
): Promise<UsernameAvailability> => {
  if (!USERNAME_PATTERN.test(username)) return 'invalid';
  if (isReservedUsername(username)) return 'reserved';
  const existing = await db.user.findFirst({
    where: {
      username: { equals: username, mode: 'insensitive' },
      ...(exceptUserId === null ? {} : { NOT: { userId: exceptUserId } }),
    },
    select: { userId: true },
  });
  return existing ? 'taken' : 'available';
};

/**
 * Kimliğin e-postası başka bir Firebase kimliğinin hesabında mı? Onboarding sayfası formu
 * göstermeden önce sorar: kullanıcı doldurup gönderdikten sonra hata almasın.
 */
export const emailBelongsToOtherIdentity = async (
  db: PrismaClient,
  identity: Pick<OnboardingIdentity, 'email' | 'firebaseUid'>
): Promise<boolean> => {
  const other = await db.user.findFirst({
    where: {
      email: { equals: identity.email, mode: 'insensitive' },
      NOT: { firebaseUserId: identity.firebaseUid },
    },
    select: { userId: true },
  });
  return other !== null;
};

/**
 * Çakışan alan(lar). Prisma'nın sürücü adaptörüyle `meta` biçimi değişebildiği için (`target`
 * ya da `driverAdapterError.cause.constraint.fields`) alan adı metin içinde aranır.
 */
const uniqueTarget = (error: Prisma.PrismaClientKnownRequestError): string =>
  JSON.stringify(error.meta ?? {});

/**
 * Onboarding'i tamamlar (ADR-0001 Karar 5): kullanıcı satırı ilk kez burada oluşturulur
 * (yeni kayıt) ya da kurala uymayan eski hesap güncellenir. Tek transaction'da:
 * - User: kullanıcı adı, görünen ad, `onboardedAt`, aydınlatma sürümü/anı, yasal metin paketi
 *   (Koşullar + Topluluk Kuralları + Yatırım Uyarısı) sürümleri/anı, 18+ beyanı
 * - ConsentEvent: yalnızca pazarlama izni verildiyse, kutu açıksa (işaretsiz varsayılan =
 *   izin yok) ve e-posta doğrulanmışsa (adresin sahibinin izni olduğu ispatlanabilsin); iznin
 *   verildiği e-posta adresiyle. TAKİP: flag açılınca doğrulanmamış kullanıcıya izin, e-posta
 *   doğrulandığında yeniden sorulmalı (şu an kutu kapalı).
 * - ContentEvent `session.start`: hesabın ilk oturumu (IP şifreli). Mevcut hesapların sonraki
 *   girişleri `auth.login` olarak `/api/auth/session`'da yazılır.
 */
export const completeOnboardingForIdentity = async (
  identity: OnboardingIdentity,
  data: OnboardingData,
  meta: RequestMeta,
  deps: OnboardingDeps
): Promise<Result<{ userId: number; username: string }>> => {
  if (!(await deps.firebaseAccountExists(identity.firebaseUid))) {
    deps.log.warn('onboarding for deleted firebase account', { requestId: meta.requestId });
    return fail(ErrorCode.UNAUTHENTICATED);
  }

  const availability = await checkUsername(deps.db, data.username, identity.existingUserId);
  if (availability === 'invalid') return fail(ErrorCode.VALIDATION, { field: 'username' });
  if (availability === 'reserved') return fail(ErrorCode.USERNAME_RESERVED);
  if (availability === 'taken') return fail(ErrorCode.USERNAME_TAKEN);

  const now = deps.now();
  const profile = {
    username: data.username,
    displayName: data.displayName,
    onboardedAt: now,
    noticeVersion: PRIVACY_NOTICE_VERSION,
    noticeAcknowledgedAt: now,
    // Koşullar kutusu paketin tamamını kapsar (Topluluk Kuralları ve Yatırım Uyarısı
    // Koşulların ayrılmaz parçası); ayrı ayrı sürümler ispat için yazılır
    legalBundleVersion: LEGAL_BUNDLE_VERSION,
    ...LEGAL_BUNDLE_DOCUMENT_VERSIONS,
    termsAcceptedAt: now,
    ageConfirmedAt: now,
  };
  // Kutu gösterilmediyse (flag kapalı) istemciden gelen değer izin sayılmaz
  const marketingGranted =
    deps.marketingConsentEnabled && data.marketingOptIn && identity.emailVerified;

  try {
    const result = await deps.db.$transaction(async tx => {
      const user =
        identity.existingUserId === null
          ? await tx.user.create({
              data: {
                ...profile,
                firebaseUserId: identity.firebaseUid,
                email: identity.email,
                isEmailVerified: identity.emailVerified,
              },
              select: { userId: true, username: true },
            })
          : await tx.user.update({
              // Yarışta iki kez gönderilirse ikincisi güncellemez (onboardedAt dolu)
              where: { userId: identity.existingUserId, onboardedAt: null },
              data: { ...profile, updatedAt: now },
              select: { userId: true, username: true },
            });

      if (marketingGranted) {
        await tx.consentEvent.create({
          data: {
            userId: user.userId,
            kind: 'marketing_email',
            granted: true,
            textVersion: MARKETING_CONSENT_TEXT_VERSION,
            source: 'signup',
            address: identity.email,
            at: now,
          },
        });
      }

      const recorded = await recordContentEvent(
        tx,
        {
          actorUserId: user.userId,
          action: 'session_start',
          entityType: 'user',
          entityId: user.userId,
          meta,
        },
        deps.ipKey()
      );
      if (!recorded) {
        deps.log.error('session.start event skipped: client IP unavailable', {
          requestId: meta.requestId,
        });
      }
      return user;
    });
    return ok(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' && uniqueTarget(error).includes('username')) {
        return fail(ErrorCode.USERNAME_TAKEN);
      }
      // E-posta başka bir Firebase kimliğinin hesabında: kullanıcıya açık mesaj (takılı ekran yok)
      if (error.code === 'P2002' && uniqueTarget(error).includes('email')) {
        deps.log.warn('onboarding email belongs to another identity', { code: error.code });
        return fail(ErrorCode.ACCOUNT_EMAIL_CONFLICT);
      }
      // P2002 (firebaseUserId): çift gönderim; P2025: eski hesap bu arada tamamlanmış
      if (error.code === 'P2002' || error.code === 'P2025') {
        deps.log.warn('onboarding conflict', { code: error.code, target: uniqueTarget(error) });
        return fail(ErrorCode.CONFLICT);
      }
    }
    throw error;
  }
};
