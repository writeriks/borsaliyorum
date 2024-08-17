import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/services/firebase-service/firebase-admin';
import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    await auth.verifyIdToken(token);

    const userId = searchParams.get('userId');

    if (!userId) {
      return createResponse(ResponseStatus.BAD_REQUEST);
    }

    const user = await prisma.user.findUnique({
      where: {
        firebaseUserId: userId,
      },
    });

    if (!user) {
      return createResponse(ResponseStatus.NOT_FOUND);
    }

    return createResponse(ResponseStatus.OK, user);
  } catch (error: any) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
