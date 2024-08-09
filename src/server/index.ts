import { userRouter } from '@/server/routers/user';
import { router } from '@/server/trpc';

export const appRouter = router({
  user: userRouter,
});

export type AppRouter = typeof appRouter;
