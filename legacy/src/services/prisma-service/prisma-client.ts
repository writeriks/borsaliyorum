import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  // In production, use a single instance of PrismaClient
  prisma = new PrismaClient();
} else {
  // In development, use a global variable so the PrismaClient instance is not re-created on hot reload
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient();
  }
  prisma = (global as any).prisma;
}

export default prisma;
