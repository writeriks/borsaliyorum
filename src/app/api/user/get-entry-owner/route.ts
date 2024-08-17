import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import prisma from '@/services/prisma-service/prisma-client';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const userIdToNumber = parseInt(userId ?? '');

    if (!userIdToNumber) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Kullanıcı bulunamadı');
    }

    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    const decodedToken = await auth.verifyIdToken(token);

    const currentUser = await prisma.user.findUnique({
      where: {
        firebaseUserId: decodedToken.uid,
      },
    });

    if (!currentUser) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

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

    // Check if the current user has blocked the specified user
    const isUserBlocked = await prisma.userBlocks.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: currentUser.userId,
          blockedId: userIdToNumber,
        },
      },
    });

    return createResponse(ResponseStatus.OK, {
      ...user,
      isUserFollowed: !!isUserFollowed,
      isUserBlocked: !!isUserBlocked,
    });
  } catch (error: any) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
