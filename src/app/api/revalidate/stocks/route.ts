import { invalidateStockIndex } from '@/features/autocomplete/server/cache';
import { handleRevalidateStocksRequest } from '@/features/autocomplete/server/revalidate-handler';
import { getServerEnv } from '@/lib/env.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stock sync workflow'u (.github/workflows/sync-stocks.yml) `--apply` sonrası çağırır.
export const POST = (request: Request): Promise<Response> =>
  handleRevalidateStocksRequest(request, {
    secret: getServerEnv().STOCKS_REVALIDATE_SECRET,
    invalidate: invalidateStockIndex,
  });
