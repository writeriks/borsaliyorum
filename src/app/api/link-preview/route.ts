import { handleLinkPreviewRequest } from '@/features/link-preview/server/route-handler';
import { requireActionUser } from '@/lib/auth/session';

// safeFetch Node API'leri (dns, net, undici) kullanır; Edge'de çalışmaz.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Oturum çerezden çözülür (S5); anonim → 401, onboarding'i bitmemiş → 403.
export const GET = (request: Request): Promise<Response> =>
  handleLinkPreviewRequest(request, { authorize: requireActionUser });
