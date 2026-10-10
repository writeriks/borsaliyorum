import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextRequest, NextResponse } from 'next/server';

/* Buffer to return image to client */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('imageUrl');

  if (!imageUrl) {
    return createResponse(ResponseStatus.BAD_REQUEST, 'Image URL is required');
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    const headers = new Headers();
    headers.set('Content-Type', contentType || 'application/octet-stream');

    return new NextResponse(Buffer.from(buffer), {
      headers,
    });
  } catch (error: any) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
