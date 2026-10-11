import { loadCachedMostMentioned } from '@/features/autocomplete/server/cache';
import { handleDefaultStocksRequest } from '@/features/autocomplete/server/route-handlers';
import { requireActionUser } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Girişli: anonim → 401, onboarding'i bitmemiş → 403.
export const GET = (): Promise<Response> =>
  handleDefaultStocksRequest({
    authorize: requireActionUser,
    loadMostMentioned: loadCachedMostMentioned,
  });
