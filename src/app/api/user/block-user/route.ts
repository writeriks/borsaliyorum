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
    const userIdToBlock: number = body['userId'];

    // Check if the userIdToBlock is valid
    const userToBlock = await prisma.user.findUnique({
      where: {
        userId: userIdToBlock,
      },
    });

    if (!userToBlock) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Kullanıcı bulunamadı.');
    }

    // Check if the user is already blocked
    const existingBlock = await prisma.userBlocks.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: currentUser.userId,
          blockedId: userIdToBlock,
        },
      },
    });

    if (existingBlock) {
      return createResponse(ResponseStatus.BAD_REQUEST, 'Kullanıcı zaten engellenmiş.');
    }

    // Block the user
    await prisma.userBlocks.create({
      data: {
        blockerId: currentUser.userId,
        blockedId: userIdToBlock,
        blockedAt: new Date(),
      },
    });

    return createResponse(ResponseStatus.OK, 'Kullanıcı engellendi.');
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
