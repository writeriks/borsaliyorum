import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { User } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const userData: User = body['user'];

    const user = await prisma.user.create({
      data: {
        firebaseUserId: userData.firebaseUserId,
        username: userData.username,
        displayName: userData.displayName,
        email: userData.email,
        birthday: null,
        profilePhoto: userData.profilePhoto ?? null,
        coverPhoto: null,
        bio: null,
        theme: null,
        website: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        premiumEndDate: null,
        isEmailVerified: userData.isEmailVerified,
      },
    });

    await prisma.securityRole.create({
      data: {
        userId: user.userId,
      },
    });

    return createResponse(ResponseStatus.OK);
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
