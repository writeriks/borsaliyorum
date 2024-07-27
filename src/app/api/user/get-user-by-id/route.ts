import { NextRequest, NextResponse } from 'next/server';

import firebaseOperations from '@/services/firebase-service/firebase-operations';
import { auth } from '@/services/firebase-service/firebase-admin';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await auth.verifyIdToken(token);

    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json('', { status: 400, statusText: 'Bad request' });
    }

    const user = await firebaseOperations.getUsersFromFirebaseId(userId);

    if (!user) {
      return new NextResponse('', { status: 404, statusText: 'User not found' });
    }

    return new NextResponse(JSON.stringify(user), {
      status: 200,
      statusText: 'SUCCESS',
    });
  } catch (error: any) {
    console.error('Error fetching user:', error.message);
    return new NextResponse(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
