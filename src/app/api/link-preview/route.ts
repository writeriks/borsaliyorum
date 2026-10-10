import {
  anonymousSessionStub,
  handleLinkPreviewRequest,
} from '@/features/link-preview/server/route-handler';

// safeFetch Node API'leri (dns, net, undici) kullanır; Edge'de çalışmaz.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// TODO(S5): anonymousSessionStub → lib/auth/session getCurrentUser (şimdilik uç hep 401).
export const GET = (request: Request): Promise<Response> =>
  handleLinkPreviewRequest(request, { getSessionUser: anonymousSessionStub });
