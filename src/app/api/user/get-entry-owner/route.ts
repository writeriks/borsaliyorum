import { NextRequest, NextResponse } from 'next/server';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import prisma from '@/services/prisma-service/prisma-client';
import { verifyUserInRoute } from '@/services/user-service/user-service';
import { User } from '@prisma/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const userIdToNumber = parseInt(userId ?? '');

    if (!userIdToNumber) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Kullanıcı bulunamadı');
    }

    const currentUser = (await verifyUserInRoute(request)) as User;

    const user = await prisma.user.findUnique({
      where: {
        userId: userIdToNumber,
      },
    });

    if (!user) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Kullanıcı bulunamadı');
    }

    // Check if the current user is following the specified user
    const isUserFollowed = await prisma.userFollowers.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.userId,
          followingId: userIdToNumber,
        },
      },
    });

    return createResponse(ResponseStatus.OK, {
      ...user,
      isUserFollowed: !!isUserFollowed,
    });
  } catch (error: any) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
