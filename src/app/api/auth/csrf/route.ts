import { type NextRequest, NextResponse } from 'next/server';

import { CSRF_COOKIE, csrfCookieOptions } from '@/lib/auth/cookies';
import { generateCsrfToken, isWellFormedCsrfToken } from '@/lib/auth/csrf';

export const dynamic = 'force-dynamic';

/**
 * Double-submit CSRF token'ı. Değer HttpOnly çerezde ve yanıt gövdesinde; istemci gövdedekini
 * `x-csrf-token` başlığıyla geri yollar. Başka bir site bu GET'i tetikleyebilir ama yanıtı
 * okuyamaz (CORS yok); mevcut geçerli token yeniden kullanılır ki açık sekmedeki form bozulmasın.
 */
export const GET = (request: NextRequest): NextResponse => {
  const existing = request.cookies.get(CSRF_COOKIE)?.value;
  const token = isWellFormedCsrfToken(existing) ? existing : generateCsrfToken();
  const response = NextResponse.json(
    { token },
    { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }
  );
  response.cookies.set(CSRF_COOKIE, token, csrfCookieOptions());
  return response;
};
