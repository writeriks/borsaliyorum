import { auth } from '@/services/firebase-service/firebase-admin';
import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    await auth.verifyIdToken(token);

    const responseBody = { message: 'Logged in successfully' };

    return createResponse(ResponseStatus.OK, responseBody, {
      'Set-Cookie': `identity=${token}; Max-Age=86400; SameSite=Lax; Path=/`,
    });
  } catch (error) {
    return createResponse(ResponseStatus.UNAUTHORIZED);
  }
}
