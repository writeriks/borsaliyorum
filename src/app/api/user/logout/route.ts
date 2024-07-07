import { NextResponse } from 'next/server';

export async function POST(): Promise<Response> {
  try {
    const body = { message: 'Logged out successfully' };

    return NextResponse.json(body, {
      status: 200,
      statusText: 'SUCCESS',
      headers: {
        'Set-Cookie': `identity=; HttpOnly; Secure; Max-Age=86400; SameSite=Lax; Path=/`,
      },
    });
  } catch (error) {
    return Response.json(
      { error: `Unauthorized ${error}` },
      {
        status: 401,
        statusText: 'Unauthorized',
      }
    );
  }
}
