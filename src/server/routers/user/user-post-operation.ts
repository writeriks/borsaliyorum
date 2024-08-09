import { trpcServer } from '@/server/trpc';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';

const prisma = new PrismaClient();
export const createUserRouter = trpcServer.router({
  createUser: trpcServer.procedure
    .input(
      z.object({
        email: z.string(),
        name: z.string(),
        surname: z.string(),
        secondName: z.string(),
        username: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const user = await prisma.user.findUnique({
          where: {
            email: input.email,
          },
        });

        if (user && user.email === input.email) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Kullanıcı Mevcut',
          });
        }

        return prisma.user.create({
          data: {
            email: input.email,
            name: input.name,
            surname: input.surname,
            secondName: input.secondName,
            username: input.username,
            createdAt: Date.now(),
          },
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        } else {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Bilinmenyen bir hata oluştu.',
          });
        }
      }
    }),
});
