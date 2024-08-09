import { procedure, trpcServer } from '@/server/trpc';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { createUserRouter } from '@/server/routers/user/user-post-operation';

const prisma = new PrismaClient();
export const mainUserRouter = trpcServer.router({
  getUser: procedure.input(z.object({ email: z.string().email() })).query(async ({ input }) => {
    const { email } = input;
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Email'i ${email} olan kullanıcı bulunamadı`,
        });
      }

      return user;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      } else {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }
  }),
});

export const userRouter = trpcServer.mergeRouters(mainUserRouter, createUserRouter);
