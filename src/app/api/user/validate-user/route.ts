import { auth } from '@/services/firebase-service/firebase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<Response> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await auth.verifyIdToken(token);

    const responseBody = { message: 'Logged in successfully' };

    return NextResponse.json(responseBody, {
      status: 200,
      statusText: 'SUCCESS',
      headers: {
        'Set-Cookie': `identity=${token}; Max-Age=86400; SameSite=Lax; Path=/`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Unauthorized ${error}` },
      {
        status: 401,
        statusText: 'Unauthorized',
      }
    );
  }
}
