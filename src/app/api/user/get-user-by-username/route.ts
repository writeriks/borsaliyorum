import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/services/firebase-service/firebase-admin';
import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    await auth.verifyIdToken(token);

    if (!username) {
      return createResponse(ResponseStatus.BAD_REQUEST);
    }

    const filteredUsers = await prisma.user.findMany({
      where: {
        username: {
          contains: username,
          mode: 'insensitive',
        },
      },
    });

    return createResponse(ResponseStatus.OK, filteredUsers);
  } catch (error: any) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
