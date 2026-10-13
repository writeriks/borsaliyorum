import { handleFeedRequest } from '@/features/posts/server/feed-route';
import { requireActionUser } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Akış kişiye özel: anonim → 401, onboarding'i bitmemiş → 403 (sayfa `requireUser` ile korunur).
export const GET = (request: Request): Promise<Response> =>
  handleFeedRequest(request, { authorize: requireActionUser });
