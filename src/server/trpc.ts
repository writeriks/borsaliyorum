import { initTRPC } from '@trpc/server';

export const trpcServer = initTRPC.create();

export const router = trpcServer.router;
export const procedure = trpcServer.procedure;
