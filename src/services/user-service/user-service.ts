import { cookies } from 'next/headers';
import { auth } from '@/services/firebase-service/firebase-admin';
import prisma from '@/services/prisma-service/prisma-client';
import { NextRequest, NextResponse } from 'next/server';
import { User } from '@prisma/client';

import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';

/*
 * The verifyUserAuthenticationForServerPage function is used to verify the user's authentication on the server side.
 * @returns - The authenticated user if the user is verified, otherwise a redirect response to the home page.
 */
export const verifyUserAuthenticationForServerPage: () => Promise<User | null> = async () => {
  const cookieStore = cookies();
  const token = cookieStore.get('identity')?.value;
  const decodedToken = await auth.verifyIdToken(token as string);

  const currentUser = await prisma.user.findUnique({
    where: {
      firebaseUserId: decodedToken.uid,
    },
  });

  return currentUser;
};

/*
 * The verifyUserAuthenticationForServerPage function is used to verify the user's authentication on the server side.
 * @param request - The request object containing the user's authentication token.
 * @returns - The authenticated user if the user is verified, otherwise a redirect response to the home page.
 */
export const verifyUserInRoute = async (request: NextRequest): Promise<User | NextResponse> => {
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

  return currentUser;
};
