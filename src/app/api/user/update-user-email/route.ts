import { User } from '@/services/firebase-service/types/db-types/user';
import prisma from '@/services/prisma-service/prisma-client';

// TODO: Consider renaming route
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const userData: User = body['user'];

    await prisma.user.update({
      where: {
        firebaseUserId: userData.firebaseUserId,
      },
      data: {
        email: userData.email,
        isEmailVerified: userData.isEmailVerified,
        updatedAt: Date.now(),
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
