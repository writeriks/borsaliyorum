import createMiddleware from 'next-intl/middleware';

import { routing } from '@/i18n/routing';

// S1: yalnızca i18n. İyimser `__session` kontrolü S5'te eklenir (auth-session skill).
export default createMiddleware(routing);

export const config = {
  // api, Next iç yolları ve uzantılı dosyalar (favicon, görseller) hariç her şey
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
