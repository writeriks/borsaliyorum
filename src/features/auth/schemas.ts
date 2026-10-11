import { z } from 'zod';

import { usernameSchema } from '@/lib/users/username';

/**
 * Auth formlarının ortak şemaları (istemci + sunucu). Hata mesajları i18n anahtarıdır:
 * `auth.validation.*` ve `auth.onboarding.*.errors.*`; ham Zod metni gösterilmez.
 */

const emailSchema = z
  .string()
  .trim()
  .max(320, 'emailInvalid')
  .pipe(z.email({ error: 'emailInvalid' }));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'passwordRequired').max(128, 'passwordTooLong'),
});
export type LoginInput = z.input<typeof loginSchema>;

export const PASSWORD_MIN = 8;

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(PASSWORD_MIN, 'passwordTooShort').max(128, 'passwordTooLong'),
});
export type SignupInput = z.input<typeof signupSchema>;

export const DISPLAY_NAME_MAX = 50;

const hasControlCharacter = (value: string): boolean => {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    // C0/C1 kontrol karakterleri ve yön değiştiren biçim karakterleri (sahte görünüm)
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
    if ((code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069)) return true;
  }
  return false;
};

export const displayNameSchema = z
  .string()
  .transform(value => value.trim().replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(1, 'required')
      .max(DISPLAY_NAME_MAX, 'tooLong')
      .refine(value => !hasControlCharacter(value), 'required')
  );

export const onboardingSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  /** 18+ beyanı (legal L3); veli onayı akışı yok → zorunlu. */
  ageConfirmed: z.boolean().refine(value => value, 'required'),
  /** Kullanım Koşulları kabulü: aydınlatmadan ayrı, zorunlu kutu (TBK genel işlem koşulları). */
  termsAccepted: z.boolean().refine(value => value, 'required'),
  /** Aydınlatma metninin okunup anlaşıldığı (rıza değil) [legal L3, KVK Kurulu 2026/347]. */
  noticeAcknowledged: z.boolean().refine(value => value, 'required'),
  /**
   * Ayrı, varsayılanı işaretsiz pazarlama izni (6563 / KVKK açık rıza). Kutu
   * `MARKETING_CONSENT_ENABLED` kapalıyken gösterilmez; sunucu da o durumda değeri yok sayar.
   */
  marketingOptIn: z.boolean(),
  next: z.string().max(512).nullable(),
});
export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingData = z.output<typeof onboardingSchema>;

export const usernameCheckSchema = z.object({ username: z.string().max(64) });
