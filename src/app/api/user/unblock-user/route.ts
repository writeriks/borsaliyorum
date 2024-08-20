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
    const userIdToUnblock: number = body['userId'];

    // Check if the userIdToUnblock is valid
    const userToUnblock = await prisma.user.findUnique({
      where: {
        userId: userIdToUnblock,
      },
    });

    if (!userToUnblock) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Kullanıcı bulunamadı.');
    }

    // Check if the user is currently blocked
    const existingBlock = await prisma.userBlocks.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: currentUser.userId,
          blockedId: userIdToUnblock,
        },
      },
    });

    if (!existingBlock) {
      return createResponse(ResponseStatus.BAD_REQUEST, 'Kullanıcı zaten engellenmemiş.');
    }

    // Remove the block relationship
    await prisma.userBlocks.delete({
      where: {
        id: existingBlock.id,
      },
    });

    return createResponse(ResponseStatus.OK);
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
