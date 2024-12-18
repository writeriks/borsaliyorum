import prisma from '@/services/prisma-service/prisma-client';
import { verifyUserInRoute } from '@/services/user-service/user-service';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { User } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const currentUser = (await verifyUserInRoute(request)) as User;

    const body = await request.json();
    const stockTicker = body['ticker'];

    const stockToUnfollow = await prisma.stock.findUnique({
      where: {
        ticker: stockTicker,
      },
    });

    if (!stockToUnfollow) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Hisse bulunamadı.');
    }

    const existingFollow = await prisma.stockFollowers.findUnique({
      where: {
        userId_stockId: {
          userId: currentUser.userId,
          stockId: stockToUnfollow.stockId,
        },
      },
    });

    if (!existingFollow) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Hisse takip edilmiyor.');
    }

    await prisma.stockFollowers.delete({
      where: {
        userId_stockId: {
          userId: currentUser.userId,
          stockId: stockToUnfollow.stockId,
        },
      },
    });

    return createResponse(ResponseStatus.OK);
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
