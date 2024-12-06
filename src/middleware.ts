// middleware.ts
import { NextResponse, NextRequest } from 'next/server';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/i18n/config';

function handleI18n(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  const localeRegex = new RegExp(
    `^/(${SUPPORTED_LOCALES.map(locale => locale.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})(/|$)`,
    'i'
  );
  const localeMatch = pathname.match(localeRegex);

  if (!localeMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.redirect(url);
  }

  return null;
}

function handleAuth(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  const localeRegex = new RegExp(
    `^/(${SUPPORTED_LOCALES.map(locale => locale.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})(/|$)`,
    'i'
  );
  const localeMatch = pathname.match(localeRegex);
  const locale = localeMatch ? localeMatch[1].toLowerCase() : DEFAULT_LOCALE;

  const token = request.cookies.get('identity')?.value;

  try {
    if (token) {
      if (pathname === `/${locale}` || pathname === `/${locale}/`) {
        return NextResponse.redirect(new URL(`/${locale}/feed`, request.url));
      }
      // Allow access to all routes for authenticated users
      return null;
    } else {
      const protectedRoutes = ['/profile', '/edit-profile', '/users'];
      const isProtected = protectedRoutes.some(route => pathname.startsWith(`/${locale}${route}`));

      if (isProtected) {
        return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
      }
      return null;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    // Redirect to an error page if authentication fails
    return NextResponse.redirect(new URL(`/${locale}/error`, request.url));
  }
}

export default function middleware(request: NextRequest): NextResponse | undefined {
  const intlResponse = handleI18n(request);
  if (intlResponse) {
    return intlResponse;
  }

  const authResponse = handleAuth(request);
  if (authResponse) {
    return authResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|static).*)'],
};
