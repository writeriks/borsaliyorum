import { User } from '@/services/firebase-service/types/db-types/user';
import { auth } from '@/services/firebase-service/firebase-admin';
import prisma from '@/services/prisma-service/prisma-client';
import { createResponse, ResponseStatus } from '@/app/api/api-utils/api-utils';

// TODO: Consider renaming route
export async function POST(request: Request): Promise<Response> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
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
        updatedAt: Date.now(),
        profilePhoto: userData.profilePhoto,
        displayName: userData.displayName,
      },
    });

    return createResponse(ResponseStatus.OK);
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
