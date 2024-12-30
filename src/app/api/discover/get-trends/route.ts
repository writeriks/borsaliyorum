import prisma from '@/services/prisma-service/prisma-client';
import { verifyUserInRoute } from '@/services/user-service/user-service';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await verifyUserInRoute(request);

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
