import { testRouter } from '@/server/routers/test';
import { router } from '@/server/trpc';

export const appRouter = router({
  test: testRouter,
});

export type AppRouter = typeof appRouter;
