import { NextRequest, NextResponse } from 'next/server';

import firebaseOperations from '@/services/firebase-service/firebase-operations';

/* Buffer to return image to client */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'error on getting username' }, { status: 400 });
  }

  try {
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