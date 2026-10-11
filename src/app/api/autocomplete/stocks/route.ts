import { loadCachedStockIndex, tagStockIndexResponse } from '@/features/autocomplete/server/cache';
import { handleStockIndexRequest } from '@/features/autocomplete/server/route-handlers';

export const runtime = 'nodejs';
// Build'de DB'ye gidilmesin; önbellek `unstable_cache` (sunucu) + `Cache-Control` (CDN)
export const dynamic = 'force-dynamic';

// Herkese açık ve kullanıcıdan bağımsız: yanıt CDN'de paylaşılır (ADR-0002 Karar 4).
export const GET = async (request: Request): Promise<Response> => {
  await tagStockIndexResponse();
  return handleStockIndexRequest(request, { loadStockIndex: loadCachedStockIndex });
};
