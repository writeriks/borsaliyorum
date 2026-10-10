import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from '@/i18n/routing';
import { SESSION_COOKIE } from '@/lib/auth/cookies';

const handleI18nRouting = createMiddleware(routing);

/** `requireUser` bu başlıktan `?next=` üretir (lib/auth/session.ts `PATHNAME_HEADER`). */
const PATHNAME_HEADER = 'x-borsaliyorum-path';

/** Oturum gerektiren rotalar (`(app)` grubu + onboarding), yerel önek olmadan. */
const PROTECTED_PREFIXES = ['/akis', '/hos-geldin', '/bildirimler', '/ayarlar', '/paylas'];

const LOCALE_PREFIX = /^\/(en)(?=\/|$)/;

const splitLocale = (pathname: string): { prefix: string; path: string } => {
  const match = LOCALE_PREFIX.exec(pathname);
  if (!match) return { prefix: '', path: pathname };
  return { prefix: match[0], path: pathname.slice(match[0].length) || '/' };
};

const isProtected = (path: string): boolean =>
  PROTECTED_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));

/**
 * i18n + **iyimser** auth kontrolü (auth-session): korumalı rotada `__session` çerezi hiç
 * yoksa sayfa render edilmeden girişe yönlendirilir. Çerezin geçerliliği burada DOĞRULANMAZ;
 * gerçek kontrol `(app)` layout'undaki `requireUser()`'dadır. Giriş sayfasında çerez varsa
 * burada akışa atlatılmaz: geçersiz çerezle döngü oluşurdu (o kararı sunucu verir).
 */
const proxy = (request: NextRequest): NextResponse => {
  const { pathname, search } = request.nextUrl;
  const { prefix, path } = splitLocale(pathname);

  if (isProtected(path) && !request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/giris`;
    url.search = '';
    if (!path.startsWith('/hos-geldin')) url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // İstemcinin gönderdiği aynı adlı başlık her zaman ezilir
  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, `${pathname}${search}`);
  return handleI18nRouting(new NextRequest(request, { headers }));
};

export default proxy;

export const config = {
  // api, Next iç yolları ve uzantılı dosyalar (favicon, görseller) hariç her şey
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
