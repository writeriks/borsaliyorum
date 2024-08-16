import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextResponse } from 'next/server';

export async function POST(): Promise<NextResponse> {
  try {
    const body = { message: 'Logged out successfully' };

    return createResponse(ResponseStatus.OK, body, {
      'Set-Cookie': `identity=; Max-Age=86400; SameSite=Lax; Path=/`,
    });
  } catch (error) {
    return createResponse(ResponseStatus.UNAUTHORIZED);
  }
}
