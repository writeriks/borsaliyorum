import prisma from '@/services/prisma-service/prisma-client';
import { User } from '@/services/firebase-service/types/db-types/user';

export async function POST(request: Request): Promise<Response> {
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

    return new Response(null, {
      status: 200,
      statusText: 'SUCCESS',
    });
  } catch (error) {
    return new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
