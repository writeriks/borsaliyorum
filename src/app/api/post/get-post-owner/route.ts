import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/app/api/api-utils/api-utils';
import prisma from '@/services/prisma-service/prisma-client';

export async function GET(request: NextRequest): Promise<Response> {
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

    await auth.verifyIdToken(token);

    const user = await prisma.user.findUnique({
      where: {
        userId: userIdToNumber,
      },
    });

    if (!user) {
      return createResponse(ResponseStatus.NOT_FOUND, 'Kullanıcı bulunamadı');
    }

    return new NextResponse(JSON.stringify(user), {
      status: 200,
      statusText: 'SUCCESS',
    });
  } catch (error: any) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR, 'Bir hata oluştu');
  }
}
