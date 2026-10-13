import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextRequest, NextResponse } from 'next/server';
import { verifyUserInRoute } from '@/services/user-service/user-service';
import { User } from '@prisma/client';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const currentUser = (await verifyUserInRoute(request)) as User;

    const body = await request.json();
    const stockTicker = body['ticker'];

    const stockToFollow = await prisma.stock.findUnique({
      where: {
        ticker: stockTicker,
      },
    });

    if (!stockToFollow) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Hisse bulunamadı.');
    }

    // Check if the user is already following the target stock
    const existingFollow = await prisma.stockFollowers.findUnique({
      where: {
        userId_stockId: {
          userId: currentUser.userId,
          stockId: stockToFollow.stockId,
        },
      },
    });

    if (existingFollow) {
      return createResponse(ResponseStatus.BAD_REQUEST, 'Hisse zaten takip ediliyor.');
    }

    await prisma.stockFollowers.create({
      data: {
        userId: currentUser.userId,
        stockId: stockToFollow.stockId,
        followedAt: new Date(),
      },
    });

    return createResponse(ResponseStatus.OK);
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
