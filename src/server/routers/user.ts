import { procedure, router } from '@/server/trpc';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const userRouter = router({
  getUser: procedure.input(z.object({ email: z.string().email() })).query(async ({ input }) => {
    const { email } = input;
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error(`User with email ${email} not found`);
      }

      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Could not fetch user');
    }
  }),

  addTest: procedure.input(z.object({ message: z.string() })).mutation(({ ctx, input }) => {
    // TODO: Add to prisma db
  }),
});
