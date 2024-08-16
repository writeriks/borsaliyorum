import { auth } from '@/services/firebase-service/firebase-admin';
import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextResponse } from 'next/server';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }
    await auth.verifyIdToken(token);

    const mostActiveTags = await prisma.tag.findMany({
      include: {
        posts: {
          select: {
            updatedAt: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    const mostActiveStocks = await prisma.stock.findMany({
      include: {
        posts: {
          select: {
            updatedAt: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    const trending = { mostActiveStocks, mostActiveTags };

    return createResponse(ResponseStatus.OK, trending);
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
