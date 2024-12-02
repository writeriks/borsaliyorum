import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse, NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const intlResponse = intlMiddleware(request);
  if (intlResponse) {
    return intlResponse;
  }

  const cookie = request.headers.get('Cookie');
  const token = cookie?.split('identity=')[1];
  const path = request.nextUrl.pathname;

  try {
    if (token) {
      if (path === '/') {
        return NextResponse.redirect(new URL('/feed', request.url));
      }
      return NextResponse.next();
    } else {
      if (path !== '/') {
        return NextResponse.redirect(new URL('/', request.url));
      }
      return NextResponse.next();
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: [
    '/',
    '/feed/:path*',
    '/stocks/:path*',
    '/profile/:path*',
    '/users/:path*',
    '/edit-profile',
    '/(tr|en)/:path*',
  ],
};
