import prisma from '@/services/prisma-service/prisma-client';
import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
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

    const body = await request.json();
    const userIdToUnfollow: number = body['userId'];

    // Check if the userIdToUnfollow is valid
    const userToUnfollow = await prisma.user.findUnique({
      where: {
        userId: userIdToUnfollow,
      },
    });

    if (!userToUnfollow) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Kullanıcı bulunamadı.');
    }

    // Check if the user is currently following the target user
    const existingFollow = await prisma.userFollowers.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.userId,
          followingId: userIdToUnfollow,
        },
      },
    });

    if (!existingFollow) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Kullanıcı takip edilmiyor.');
    }

    await prisma.userFollowers.delete({
      where: {
        id: existingFollow.id,
      },
    });

    return createResponse(ResponseStatus.OK);
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
