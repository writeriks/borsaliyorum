import { auth } from '@/services/firebase-service/firebase-admin';
import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { User } from '@prisma/client';
import { NextResponse } from 'next/server';

// TODO: Consider renaming route
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    const idToken = await auth.verifyIdToken(token);
    const body = await request.json();
    const userData: User = body['user'];

    if (idToken.uid !== userData.firebaseUserId) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    await prisma.user.update({
      where: {
        firebaseUserId: userData.firebaseUserId,
      },
      data: {
        isEmailVerified: userData.isEmailVerified,
        updatedAt: new Date(),
        profilePhoto: userData.profilePhoto,
        displayName: userData.displayName,
      },
    });

    return createResponse(ResponseStatus.OK);
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
