import { z } from 'zod';

import type { ClientSession } from './types';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'auth.session-api' });

const SESSION_ENDPOINT = '/api/auth/session';
const CSRF_ENDPOINT = '/api/auth/csrf';
const CSRF_HEADER = 'x-csrf-token';

/** Ağ kesildi ya da yanıt bozuk: kullanıcıya "bağlantını kontrol et" gösterilir. */
export const NETWORK_ERROR = 'NETWORK' as const;

export type SessionApiResult<T> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: string };

const clientUserSchema = z.object({
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  email: z.string(),
  emailVerified: z.boolean(),
});

const sessionResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    session: z.union([
      z.object({ status: z.literal('authenticated'), user: clientUserSchema }),
      z.object({ status: z.literal('needs-onboarding') }),
    ]),
  }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

const okSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    const response = await fetch(CSRF_ENDPOINT, { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) return null;
    const parsed = z.object({ token: z.string() }).safeParse(await response.json());
    return parsed.success ? parsed.data.token : null;
  } catch (error) {
    log.warn('csrf token request failed', { err: error });
    return null;
  }
};

let prefetched: Promise<string | null> | null = null;

/**
 * Form açılınca token'ı önceden al: tıklamada fazladan bir ağ turu beklenmesin. Tek kullanımlık
 * (çerezin süresi dolmuş olabilir); gönderimden sonra bir sonraki istek yeniden alır.
 */
export const prefetchCsrfToken = (): void => {
  prefetched ??= fetchCsrfToken();
};

const send = async (init: RequestInit): Promise<unknown> => {
  const pending = prefetched ?? fetchCsrfToken();
  prefetched = null;
  const token = await pending;
  if (!token) return null;
  try {
    const response = await fetch(SESSION_ENDPOINT, {
      ...init,
      cache: 'no-store',
      credentials: 'same-origin',
      // Çıkış isteği sayfa kapanırken de tamamlansın
      keepalive: init.method === 'DELETE',
      headers: { 'content-type': 'application/json', [CSRF_HEADER]: token },
    });
    return await response.json();
  } catch (error) {
    log.warn('session request failed', { err: error, method: init.method });
    return null;
  }
};

/** ID token'ı sunucuya verir; sunucu `__session` çerezini yazar. */
export const postSession = async (
  idToken: string
): Promise<SessionApiResult<Exclude<ClientSession, { status: 'anonymous' }>>> => {
  const parsed = sessionResponseSchema.safeParse(
    await send({ method: 'POST', body: JSON.stringify({ idToken }) })
  );
  if (!parsed.success) return { ok: false, error: NETWORK_ERROR };
  return parsed.data.ok
    ? { ok: true, data: parsed.data.session }
    : { ok: false, error: parsed.data.error };
};

/** Çıkış: tüm cihazlardaki oturumlar geçersiz olur ve çerez silinir. */
export const deleteSession = async (): Promise<SessionApiResult<null>> => {
  const parsed = okSchema.safeParse(await send({ method: 'DELETE' }));
  if (!parsed.success) return { ok: false, error: NETWORK_ERROR };
  return parsed.data.ok ? { ok: true, data: null } : { ok: false, error: parsed.data.error };
};
