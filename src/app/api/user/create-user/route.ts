import prisma from '@/services/prisma-service/prisma-client';
import { User } from '@/services/firebase-service/types/db-types/user';
import { SecurityRole } from '@prisma/client';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const userData: User = body['user'];

    await prisma.user.create({
      data: {
        firebaseUserId: userData.firebaseUserId,
        username: userData.username,
        displayName: userData.displayName,
        email: userData.email,
        birthday: null,
        profilePhoto: null,
        coverPhoto: null,
        bio: null,
        theme: null,
        website: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        premiumEndDate: null,
        isEmailVerified: userData.isEmailVerified,
        lastReloadDate: Date.now(),
        postsCount: 0,
        userFollowingCount: 0,
        userFollowersCount: 0,
        stockFollowingCount: 0,
        securityRole: SecurityRole.DEFAULT,
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
