import { procedure, router } from '@/server/trpc';
import { z } from 'zod';

export const testRouter = router({
  getTest: procedure.query(() => {
    return { message: 'Hello World!' };
  }),

  addTest: procedure.input(z.object({ message: z.string() })).mutation(({ ctx, input }) => {
    // TODO: Add to prisma db
  }),
});
