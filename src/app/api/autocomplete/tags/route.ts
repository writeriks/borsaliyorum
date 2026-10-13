import { loadCachedTrendingTags } from '@/features/autocomplete/server/cache';
import { handleTagSuggestionsRequest } from '@/features/autocomplete/server/route-handlers';
import { requireActionUser } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Girişli: anonim → 401, onboarding'i bitmemiş → 403.
export const GET = (request: Request): Promise<Response> =>
  handleTagSuggestionsRequest(request, {
    authorize: requireActionUser,
    loadTrendingTags: loadCachedTrendingTags,
  });
