import { NextRequest, NextResponse } from 'next/server';

/* Buffer to return image to client */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('imageUrl');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
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
    console.error('Error fetching image:', error.message);
    return NextResponse.json({ error: 'Error fetching image' }, { status: 500 });
  }
}
