// middleware.ts

import { NextResponse, NextRequest } from 'next/server';
import type { NextMiddleware } from 'next/server';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/i18n/config';

/**
 * Escapes special characters in a string for use in a regular expression.
 * @param {string} str
 * @returns {string}
 */
const escapeRegex = (str: string): string => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

/**
 * Regular expression to match supported locale prefixes in the URL pathname.
 * This ensures that the URL starts with one of the supported locales followed by a slash or end of string.
 */
const LOCALE_REGEX = new RegExp(`^/(${SUPPORTED_LOCALES.map(escapeRegex).join('|')})(/|$)`, 'i');

/**
 * Ensures URLs contain a supported locale. Redirects to the default locale if absent.
 * @param {NextRequest} request
 * @returns {NextResponse | null}
 */
const handleI18n = (request: NextRequest): NextResponse | null => {
  const { pathname } = request.nextUrl;
  if (!LOCALE_REGEX.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.redirect(url);
  }
  return null;
};

/**
 * Protects routes by checking authentication status.
 * Redirects unauthenticated users to login and authenticated users away from initial route.
 * @param {NextRequest} request
 * @returns {NextResponse | null}
 */
const handleAuth = (request: NextRequest): NextResponse | null => {
  const { pathname, origin } = request.nextUrl;
  const localeMatch = pathname.match(LOCALE_REGEX);
  const locale = localeMatch ? localeMatch[1].toLowerCase() : DEFAULT_LOCALE;
  const token = request.cookies.get('identity')?.value;

  const isInitialRoute = pathname === `/${locale}` || pathname === `/${locale}/`;

  try {
    if (token) {
      if (isInitialRoute) {
        return NextResponse.redirect(new URL(`/${locale}/feed`, origin));
      }
      return null; // Authenticated users can access all other routes
    }

    if (!isInitialRoute) {
      return NextResponse.redirect(new URL(`/${locale}/`, origin));
    }

    return null; // Allow access to the initial route for unauthenticated users
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.redirect(new URL(`/${locale}/`, origin));
  }
};

/**
 * Main middleware function handling internationalization and authentication.
 * @type {NextMiddleware}
 */
const middleware: NextMiddleware = (request: NextRequest): NextResponse | undefined => {
  return handleI18n(request) || NextResponse.next();
};

export default middleware;

/**
 * Configuration for the middleware, specifying which routes it should apply to.
 * The middleware applies to all routes except:
 * - API routes (`/api/*`)
 * - Next.js internal routes (`/_next/*`)
 * - Static assets (`/static/*`)
 * - Favicon (`/favicon.ico`)
 */
export const config = {
  matcher: ['/((?!api|_next|static|favicon.ico).*)'],
};
