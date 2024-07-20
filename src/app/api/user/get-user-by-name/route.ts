import { NextRequest, NextResponse } from 'next/server';

import firebaseOperations from '@/services/firebase-service/firebase-operations';
import { auth } from '@/services/firebase-service/firebase-admin';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await auth.verifyIdToken(token);

    if (!username) {
      return NextResponse.json({ error: 'error on getting username' }, { status: 400 });
    }
    const filteredUsers = await firebaseOperations.getUsersFromFirebaseByName(username);

    return new NextResponse(JSON.stringify(filteredUsers), {
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
