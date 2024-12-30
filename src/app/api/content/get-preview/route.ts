import { createResponse, ResponseStatus } from '@/utils/api-utils/api-utils';
import { NextRequest, NextResponse } from 'next/server';
import { verifyUserInRoute } from '@/services/user-service/user-service';

import { JSDOM } from 'jsdom';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await verifyUserInRoute(request);

    const body = await request.json();
    const contentUrl = body['url'];

    const response = await fetch(contentUrl);
    const data = await response.text();

    const dom = new JSDOM(data);
    const document = dom.window.document;

    const title = document.querySelector('title')?.textContent || '';

    const description =
      document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

    const image =
      document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

    return createResponse(ResponseStatus.OK, { title, description, image });
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
