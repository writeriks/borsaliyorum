import { z } from 'zod';

import { isReservedUsername } from './reserved-usernames';

/**
 * Kullanıcı adı kuralı (auth-session "Kayıt kuralları"; onboarded backfill migration'ı ile aynı).
 * Yalnızca ASCII küçük harf, rakam ve alt çizgi: Türkçe karakterli ad (ş, ı…) URL'de ve
 * aramada belirsizlik yaratır; `toLowerCase` sonrası da bu kurala uymayan ad reddedilir.
 */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

export const UsernameIssue = {
  TOO_SHORT: 'tooShort',
  TOO_LONG: 'tooLong',
  INVALID_CHARS: 'invalidChars',
  RESERVED: 'reserved',
} as const;
export type UsernameIssue = (typeof UsernameIssue)[keyof typeof UsernameIssue];

/** Kullanıcının yazdığını kurala yaklaştırır: baştaki/sondaki boşluk ve büyük ASCII harf. */
export const normalizeUsernameInput = (raw: string): string => raw.trim().toLowerCase();

/** Kurala uymuyorsa ilk sorunu döner (mesaj seçimi için); uyuyorsa null. Benzersizlik DB'de. */
export const usernameIssue = (username: string): UsernameIssue | null => {
  if (username.length < USERNAME_MIN) return UsernameIssue.TOO_SHORT;
  if (username.length > USERNAME_MAX) return UsernameIssue.TOO_LONG;
  if (!USERNAME_PATTERN.test(username)) return UsernameIssue.INVALID_CHARS;
  if (isReservedUsername(username)) return UsernameIssue.RESERVED;
  return null;
};

/**
 * Sunucu ve istemcide ortak şema. Hata mesajı i18n anahtarının son parçasıdır
 * (`auth.onboarding.username.errors.<issue>`); ham Zod mesajı kullanıcıya gösterilmez.
 */
export const usernameSchema = z
  .string()
  .transform(normalizeUsernameInput)
  .superRefine((value, ctx) => {
    const issue = usernameIssue(value);
    if (issue) ctx.addIssue({ code: 'custom', message: issue });
  });
