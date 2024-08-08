import { testRouter } from '@/server/routers/test';
import { userRouter } from '@/server/routers/user';
import { router } from '@/server/trpc';

export const appRouter = router({
  test: testRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
