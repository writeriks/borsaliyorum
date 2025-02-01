import prisma from '@/services/prisma-service/prisma-client';
import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextResponse } from 'next/server';
import { NotificationType } from '@prisma/client';

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
    const userIdToFollow: number = body['userId'];

    // Check if the userIdToFollow is valid
    const userToFollow = await prisma.user.findUnique({
      where: {
        userId: userIdToFollow,
      },
    });

    if (!userToFollow) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Kullanıcı bulunamadı.');
    }

    // Check if the user is already following the target user
    const existingFollow = await prisma.userFollowers.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUser.userId,
          followingId: userIdToFollow,
        },
      },
    });

    if (existingFollow) {
      return createResponse(ResponseStatus.BAD_REQUEST, 'Kullanıcı zaten takip ediliyor.');
    }

    await prisma.$transaction(async tx => {
      await tx.userFollowers.create({
        data: {
          followerId: currentUser.userId,
          followingId: userIdToFollow,
          followedAt: new Date(),
        },
      });

      await tx.notification.create({
        data: {
          userId: userIdToFollow,
          type: NotificationType.FOLLOW,
          fromUserId: currentUser.userId,
          content: `${currentUser.username} seni takip etmeye başladı.`,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    });

    return createResponse(ResponseStatus.OK);
  } catch (error) {
    console.log('🚀 ~ POST ~ error:', error);
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
